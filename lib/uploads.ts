import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Корень загрузок. В контейнере это отдельный том (/app/uploads): public/
 * запекается в образ при сборке, и всё записанное туда исчезало бы при деплое.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
export const NEWS_DIR = join(UPLOADS_DIR, 'news');

/**
 * Имена файлов выдаёт сервер: uuid и .jpg. Всё прочее отсекается до обращения
 * к диску — так путь из адреса запроса не может выйти за пределы каталога.
 */
const SAFE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

export const isSafeNewsFile = (name: string) => SAFE_FILE.test(name);

export const newsFilePath = (name: string) => join(NEWS_DIR, name);

export async function ensureNewsDir() {
  await mkdir(NEWS_DIR, { recursive: true });
}

/** Удаление без исключений: отсутствующий файл — не повод ронять удаление новости. */
export async function removeNewsFiles(files: string[]) {
  await Promise.all(
    files.filter(isSafeNewsFile).map((f) => unlink(newsFilePath(f)).catch(() => undefined)),
  );
}
