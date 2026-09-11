import { readFile } from 'node:fs/promises';
import { isSafeNewsFile, newsFilePath } from '@/lib/uploads';

/**
 * Фото новостей из тома загрузок. public/ здесь не годится: он запекается
 * в образ при сборке, а снимки из CRM живут на отдельном томе и переживают
 * деплой. Имена — uuid, содержимое под именем не меняется, поэтому кэш вечный.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isSafeNewsFile(file)) return new Response('Not found', { status: 404 });

  try {
    const data = await readFile(newsFilePath(file));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
