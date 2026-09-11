import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { NEWS_MAX_PHOTOS, NEWS_MAX_PHOTO_BYTES, NEWS_MAX_PHOTO_MB } from '@/lib/news-shared';
import { ensureNewsDir, newsFilePath, removeNewsFiles } from '@/lib/uploads';

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const OVER_LIMIT = `Не больше ${NEWS_MAX_PHOTOS} фото на новость`;

/**
 * Загрузка фото новости — по одному файлу на запрос.
 *
 * Двенадцать снимков по 15 МБ одним запросом — это 180 МБ в памяти сервера,
 * у которого всего 1,9 ГБ. Поэтому браузер шлёт файлы подряд, а здесь каждый
 * сразу ужимается до 1600 px и примерно 200 КБ; исходник на диск не попадает.
 *
 * Маршрут лежит вне layout CRM, поэтому права проверяются здесь же.
 */
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await currentUser();
  if (!user || !canEdit(user.role)) return fail('Нет прав на изменения', 403);

  const { postId } = await params;
  const post = await prisma.newsPost.findUnique({
    where: { id: postId },
    select: { _count: { select: { photos: true } } },
  });
  if (!post) return fail('Новость не найдена', 404);
  // Быстрая проверка до тяжёлой обработки; окончательная — в транзакции ниже.
  if (post._count.photos >= NEWS_MAX_PHOTOS) return fail(OVER_LIMIT);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('Файл не передан');
  if (file.size > NEWS_MAX_PHOTO_BYTES) return fail(`Файл больше ${NEWS_MAX_PHOTO_MB} МБ`);

  const image = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' })
    .rotate() // поворот по EXIF: снимки с телефона иначе лягут набок
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!image) return fail('Не удалось прочитать изображение — нужен JPEG, PNG или WebP');

  const name = `${randomUUID()}.jpg`;
  await ensureNewsDir();
  await writeFile(newsFilePath(name), image.data);

  // Лимит, порядок и превью — в одной транзакции: две загрузки из соседних
  // вкладок иначе обе прочли бы «фото ещё нет» и обе стали бы превью.
  const photo = await prisma
    .$transaction(async (tx) => {
      const existing = await tx.newsPhoto.findMany({ where: { postId }, select: { order: true } });
      if (existing.length >= NEWS_MAX_PHOTOS) return null;
      return tx.newsPhoto.create({
        data: {
          postId,
          file: name,
          width: image.info.width,
          height: image.info.height,
          // Следующий за последним: после удалений в нумерации бывают дыры.
          order: existing.reduce((next, p) => Math.max(next, p.order + 1), 0),
          isCover: existing.length === 0,
        },
      });
    })
    .catch(() => undefined);

  if (!photo) {
    // Файл уже на диске, а записи о нём нет — стираем, иначе останется сирота.
    await removeNewsFiles([name]);
    return photo === null ? fail(OVER_LIMIT) : fail('Не удалось сохранить фото, попробуйте ещё раз', 500);
  }

  return Response.json({ id: photo.id });
}
