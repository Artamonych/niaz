/**
 * Переносит фото и документы донора на свой сервер.
 *
 * Пока картинки жили на com-transport.ru, оптимизатор Next после каждого деплоя
 * заново тянул их с донора, и тот не всегда успевал ответить: первые
 * посетители видели битые фото. А после отключения старого сайта ссылки
 * оборвались бы насовсем.
 *
 * Скрипт скачивает каждый файл один раз, картинки ужимает в WebP, документы
 * кладёт как есть, и переписывает адреса в data/content. Повторный запуск
 * берёт уже скачанное с диска, поэтому его безопасно гонять после каждого
 * build:content — сеть понадобится только для новых файлов.
 *
 * Запуск: npm run localize:media (входит в npm run build:content)
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import sharp from 'sharp';

const CONTENT = join(process.cwd(), 'data', 'content');
const PUBLIC = join(process.cwd(), 'public');
const CONTENT_FILES = ['products.json', 'pages.json', 'category-landings.json'];
const DONOR = /^https?:\/\/com-transport\.ru\//i;
const PARALLEL = 6; // вежливо к чужому хостингу и без очереди на полчаса

type Item = { images?: string[]; links?: { href: string; file: boolean }[] };
type Kind = 'image' | 'file';

/** Адрес на своём сервере. Имя файла донора сохраняем — по нему видно, откуда он. */
function localUrl(url: string, kind: Kind): string {
  const name = decodeURIComponent(basename(new URL(url).pathname));
  if (kind === 'file') return `/files/${name}`;
  return `/media/catalog/${name.replace(/\.[a-z0-9]+$/i, '')}.webp`;
}

async function download(url: string): Promise<Buffer | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) return null; // у донора файла нет — ссылка и так битая
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === 3) throw new Error(`${url}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

async function save(url: string, local: string, kind: Kind): Promise<'cached' | 'saved' | 'missing'> {
  const path = join(PUBLIC, local);
  if (existsSync(path)) return 'cached';

  const data = await download(url);
  if (!data) return 'missing';

  await mkdir(dirname(path), { recursive: true });
  if (kind === 'file') {
    await writeFile(path, data);
  } else {
    // Превью донора — 800×510; 1600 оставлен про запас для редких крупных кадров.
    await sharp(data)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path);
  }
  return 'saved';
}

async function main() {
  const docs = new Map<string, Item[]>();
  for (const name of CONTENT_FILES) {
    docs.set(name, JSON.parse(await readFile(join(CONTENT, name), 'utf8')));
  }

  // Все адреса донора: картинки из images, документы из ссылок-файлов.
  const jobs = new Map<string, Kind>();
  for (const items of docs.values()) {
    for (const item of items) {
      for (const u of item.images ?? []) if (DONOR.test(u)) jobs.set(u, 'image');
      for (const l of item.links ?? []) if (l.file && DONOR.test(l.href)) jobs.set(l.href, 'file');
    }
  }

  // Одинаковое имя из разных папок донора не должно затереть чужой файл.
  const target = new Map<string, string>();
  const taken = new Map<string, string>();
  for (const [url, kind] of jobs) {
    let local = localUrl(url, kind);
    if (taken.has(local) && taken.get(local) !== url) {
      const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
      local = local.replace(/(\.[a-z0-9]+)$/i, `-${hash}$1`);
    }
    taken.set(local, url);
    target.set(url, local);
  }

  const result = new Map<string, 'cached' | 'saved' | 'missing'>();
  const failed: string[] = [];
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const [url, kind] = job;
        try {
          result.set(url, await save(url, target.get(url)!, kind));
        } catch (err) {
          failed.push((err as Error).message);
        }
        if (result.size % 100 === 0) console.log(`  ${result.size} из ${jobs.size}`);
      }
    }),
  );

  // Переписываем адреса. 404 у донора выбрасываем из галереи: такое фото битое
  // и сейчас. Упавшее по сети оставляем как есть — его подхватит повторный запуск.
  const missing = new Set([...result].filter(([, r]) => r === 'missing').map(([u]) => u));
  const swap = (u: string) => (result.has(u) && !missing.has(u) ? target.get(u)! : u);

  for (const [name, items] of docs) {
    for (const item of items) {
      if (item.images) item.images = item.images.filter((u) => !missing.has(u)).map(swap);
      if (item.links) item.links = item.links.filter((l) => !missing.has(l.href)).map((l) => ({ ...l, href: swap(l.href) }));
    }
    await writeFile(join(CONTENT, name), JSON.stringify(items, null, 2), 'utf8');
  }

  let bytes = 0;
  for (const local of target.values()) {
    const path = join(PUBLIC, local);
    if (existsSync(path)) bytes += (await stat(path)).size;
  }

  const n = (r: string) => [...result.values()].filter((x) => x === r).length;
  console.log(`Файлов донора: ${jobs.size} (картинок ${[...jobs.values()].filter((k) => k === 'image').length})`);
  console.log(`  скачано сейчас: ${n('saved')}, уже были: ${n('cached')}, нет у донора: ${n('missing')}`);
  console.log(`  на диске: ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
  if (missing.size) console.log('Нет у донора (убраны из контента):\n  ' + [...missing].join('\n  '));
  if (failed.length) {
    console.error(`Не скачались (${failed.length}), запустите ещё раз:\n  ` + failed.join('\n  '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
