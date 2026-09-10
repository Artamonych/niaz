/**
 * Приёмочный краулинг по §6.1 ТЗ: каждый индексируемый URL донора обязан
 * отдавать 200 или 301, ни одного 404/5xx, без цепочек редиректов.
 *
 * Запуск против собранного сайта: npm run check:urls -- http://localhost:3000
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const CONCURRENCY = 8;

type Result = {
  path: string;
  status: number;
  location?: string;
  /** Длина цепочки редиректов: больше одного шага — нарушение §6.1. */
  hops: number;
};

async function probe(path: string): Promise<Result> {
  let current = path;
  let hops = 0;
  let status = 0;
  let location: string | undefined;

  // Идём по редиректам вручную, чтобы посчитать длину цепочки.
  while (hops <= 5) {
    const res = await fetch(`${BASE}${current}`, { redirect: 'manual' });
    status = res.status;

    if (status < 300 || status >= 400) break;

    location = res.headers.get('location') ?? undefined;
    if (!location) break;

    current = location.startsWith('http') ? new URL(location).pathname : location;
    hops += 1;
  }

  return { path, status, location, hops };
}

async function main() {
  const urls: string[] = JSON.parse(
    await readFile(join(process.cwd(), 'data', 'donor', 'sitemap-urls.json'), 'utf8'),
  );
  const paths = urls.map((u) => new URL(u).pathname);

  const results: Result[] = [];
  const queue = [...paths];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let path = queue.shift(); path; path = queue.shift()) {
        results.push(await probe(path));
      }
    }),
  );

  const ok = results.filter((r) => r.status === 200);
  const redirected = results.filter((r) => r.hops > 0 && r.status === 200);
  const broken = results.filter((r) => r.status >= 400 || r.status === 0);
  const chains = results.filter((r) => r.hops > 1);

  console.log(`Проверено URL: ${results.length}`);
  console.log(`  200 напрямую: ${ok.length - redirected.length}`);
  console.log(`  через 301: ${redirected.length}`);
  console.log(`  битых (404/5xx): ${broken.length}`);
  console.log(`  цепочек длиннее одного шага: ${chains.length}`);

  if (broken.length) {
    console.log('\nБитые URL:');
    for (const b of broken.slice(0, 40)) console.log(`  ${b.status}  ${b.path}`);
  }
  if (chains.length) {
    console.log('\nЦепочки редиректов:');
    for (const c of chains.slice(0, 20)) console.log(`  ${c.hops} шага  ${c.path} → ${c.location}`);
  }

  process.exit(broken.length || chains.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
