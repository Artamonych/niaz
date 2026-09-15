/**
 * Готовит фотографии разделов каталога из съёмки заказчика.
 *
 * Заказчик разложил снимки по папкам, и эта раскладка и есть деление по
 * разделам сайта: «АСМП/Класс В» → раздел АСМП, «Транспорт МГН» → раздел для
 * маломобильных граждан и так далее. Привязать кадр к конкретному исполнению
 * из 131 карточки по снимку нельзя — ни завод, ни мы этого не знаем, поэтому
 * фотографии живут на уровне раздела.
 *
 * Скрипт ужимает снимки в webp, отбрасывает повторы (в папках лежат «копии»
 * и пересохранённые дубли) и пишет data/content/category-photos.json.
 *
 * Запуск: npx tsx scripts/prep-catalog-photos.ts [путь к папке «фото»]
 */
import { createHash } from 'node:crypto';
import { readdir, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATEGORIES, type CategoryKey } from '../lib/catalog';

const SRC = process.argv[2] ?? 'D:/Сайт/фото';
const OUT_DIR = join(process.cwd(), 'public', 'media', 'razdely');
const OUT_JSON = join(process.cwd(), 'data', 'content', 'category-photos.json');

/**
 * Папка заказчика → раздел каталога и подпись под снимками.
 *
 * Подпись берём из имени папки: она говорит ровно то, что известно про кадр.
 * Ничего сверх этого не утверждаем.
 */
const FOLDERS: { path: string; name: string; key: CategoryKey; caption: string }[] = [
  { path: 'АСМП/Класс А', name: 'asmp-klass-a', key: 'asmp', caption: 'АСМП класса A' },
  { path: 'АСМП/Класс В', name: 'asmp-klass-b', key: 'asmp', caption: 'АСМП класса B' },
  { path: 'АСМП/Класс С', name: 'asmp-klass-c', key: 'asmp', caption: 'АСМП класса C' },
  { path: 'АСМП/Интерьер', name: 'asmp-salon', key: 'asmp', caption: 'Медицинский салон' },
  { path: 'АСМП/Транспорт МГН', name: 'mgn', key: 'mgn', caption: 'Транспорт для маломобильных граждан' },
  { path: 'Фургонгы и Спецтехника/Автомобили для ритуальных услуг', name: 'ritual', key: 'ritual', caption: 'Автомобиль для ритуальных услуг' },
  { path: 'Фургонгы и Спецтехника/Изотермичечские фургоны', name: 'furgon-izotermicheskiy', key: 'van', caption: 'Изотермический фургон' },
  { path: 'Фургонгы и Спецтехника/Передвижные пункты питания', name: 'punkt-pitaniya', key: 'spec', caption: 'Передвижной пункт питания' },
  { path: 'Фургонгы и Спецтехника/Спецавтомобили и лаборатории', name: 'spetsavtomobil-laboratoriya', key: 'spec', caption: 'Спецавтомобиль и лаборатория' },
];

type Photo = { src: string; caption: string; w: number; h: number };

async function main() {
  // Каталог пересобирается целиком: иначе в нём копятся снимки из прошлых прогонов.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const byKey = new Map<CategoryKey, Photo[]>();
  const seen = new Map<string, string>();
  let duplicates = 0;
  let bytes = 0;

  for (const folder of FOLDERS) {
    const dir = join(SRC, folder.path);
    const files = (await readdir(dir).catch(() => [] as string[]))
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .sort();

    if (!files.length) {
      console.log(`  ${folder.path}: снимков нет`);
      continue;
    }

    const prefix = folder.name;
    let index = 0;

    for (const file of files) {
      const raw = await readFile(join(dir, file));
      // Повторы в папках: «— копия», «(1)» и просто пересохранённый тот же кадр.
      const hash = createHash('sha1').update(raw).digest('hex');
      if (seen.has(hash)) {
        duplicates++;
        continue;
      }
      seen.set(hash, file);

      index++;
      const name = `${prefix}-${String(index).padStart(2, '0')}.webp`;
      const path = join(OUT_DIR, name);
      const info = await sharp(raw)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path);

      bytes += info.size;
      const list = byKey.get(folder.key) ?? [];
      list.push({ src: `/media/razdely/${name}`, caption: folder.caption, w: info.width, h: info.height });
      byKey.set(folder.key, list);
    }

    console.log(`  ${folder.path}: ${index} снимков → ${folder.key}`);
  }

  const out: Record<string, Photo[]> = {};
  for (const category of CATEGORIES) {
    const list = byKey.get(category.key);
    if (list?.length) out[category.key] = list;
  }

  await writeFile(OUT_JSON, JSON.stringify(out, null, 2), 'utf8');

  const total = Object.values(out).reduce((n, l) => n + l.length, 0);
  console.log(`\nВсего: ${total} снимков, ${(bytes / 1024 / 1024).toFixed(1)} МБ; повторов отброшено: ${duplicates}`);
  for (const [key, list] of Object.entries(out)) {
    const title = CATEGORIES.find((c) => c.key === key)?.short ?? key;
    console.log(`  ${title}: ${list.length}`);
  }
}

main();
