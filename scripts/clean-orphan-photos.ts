/**
 * Пункт 27 бэклога: чистка файлов-сирот в хранилище фото новостей.
 *
 * При удалении новости или снимка файл стирается вместе с записью. Сирота
 * остаётся, только если сервер упал между записью файла на диск и записью в
 * базу. Такое бывает редко, поэтому скрипт запускается руками.
 *
 * Файлы младше суток не трогаются: в этот момент их может дописывать
 * загрузка, идущая прямо сейчас.
 *
 * Запуск:
 *   npm run clean:photos          — показать, что будет удалено
 *   npm run clean:photos -- --yes — удалить
 *
 * На сервере:
 *   docker exec niaz-app node .next/standalone/... — не годится, скрипт
 *   запускается локально с DATABASE_URL на копию базы, либо через
 *   `docker compose run --rm migrate npx tsx scripts/clean-orphan-photos.ts`.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../lib/generated/prisma/client';

const DAY = 24 * 60 * 60 * 1000;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

async function main() {
  const apply = process.argv.includes('--yes');
  const dir = join(process.env.UPLOADS_DIR ?? './uploads', 'news');

  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.log(`Каталог ${dir} пуст или недоступен — чистить нечего.`);
    return;
  }

  const known = new Set((await prisma.newsPhoto.findMany({ select: { file: true } })).map((p) => p.file));
  const now = Date.now();

  const orphans: { file: string; size: number; age: number }[] = [];
  let fresh = 0;

  for (const file of files) {
    if (known.has(file)) continue;

    const info = await stat(join(dir, file));
    const age = now - info.mtimeMs;
    // Свежий файл может писаться прямо сейчас — не трогаем.
    if (age < DAY) {
      fresh++;
      continue;
    }
    orphans.push({ file, size: info.size, age });
  }

  console.log(`Файлов в хранилище: ${files.length}, записей в базе: ${known.size}`);
  if (fresh) console.log(`Пропущено свежих (младше суток): ${fresh}`);

  if (!orphans.length) {
    console.log('Файлов-сирот нет.');
    return;
  }

  const mb = orphans.reduce((sum, o) => sum + o.size, 0) / 1024 / 1024;
  console.log(`Сирот: ${orphans.length}, суммарно ${mb.toFixed(1)} МБ`);
  for (const o of orphans) {
    console.log(`  ${o.file} — ${(o.size / 1024).toFixed(0)} КБ, лежит ${Math.floor(o.age / DAY)} сут.`);
  }

  if (!apply) {
    console.log('\nЭто предварительный показ. Чтобы удалить, добавьте --yes');
    return;
  }

  for (const o of orphans) await unlink(join(dir, o.file)).catch(() => undefined);
  console.log(`\nУдалено файлов: ${orphans.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
