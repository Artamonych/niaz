/**
 * Второй проход по донору: страницы собраны конструктором, REST отдаёт пустой
 * content — поэтому забираем отрендеренный HTML и вытаскиваем из него смысл.
 *
 * На выходе data/donor/pages-content.json: по одной записи на URL из sitemap.
 * Запуск: npm run scrape:html
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'data', 'donor');
const CONCURRENCY = 4;

type SpecRow = { no: string; text: string };

type PageContent = {
  url: string;
  slug: string;
  status: number;
  title: string;
  h1: string;
  metaDescription: string;
  /** Крошки донора — микроразметка BreadcrumbList, единственный надёжный источник категории. */
  breadcrumbs: { name: string; url: string }[];
  intro: string;
  /** Таблица комплектации — основная ценность товарных страниц донора. */
  spec: SpecRow[];
  images: string[];
};

const strip = (html: string) =>
  decode(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

function decode(s: string): string {
  const named: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', laquo: '«', raquo: '»',
    mdash: '—', ndash: '–', hellip: '…', deg: '°', times: '×', apos: "'",
  };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function firstMatch(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? strip(m[1]) : '';
}

/** Тело страницы без шапки, подвала и служебных блоков — иначе в текст лезет меню. */
function mainRegion(html: string): string {
  const withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  const h1 = withoutChrome.search(/<h1[\s>]/i);
  return h1 === -1 ? withoutChrome : withoutChrome.slice(h1);
}

function parseSpec(region: string): SpecRow[] {
  const table = region.match(/<table[\s\S]*?<\/table>/i);
  if (!table) return [];

  return [...table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => strip(c[1])))
    .filter((cells) => cells.length >= 2 && cells.some(Boolean))
    .map(([no, ...rest]) => ({ no, text: rest.join(' ').trim() }))
    .filter((r) => r.text && r.text.toLowerCase() !== 'наименование');
}

/** Крошки лежат в микроразметке schema.org/ListItem, а не в JSON-LD. */
function parseBreadcrumbs(html: string): { name: string; url: string }[] {
  const item = /(?:<a[^>]+href="([^"]*)"[^>]*itemprop="item"[^>]*>)?\s*<span itemprop="name">([^<]*)<\/span>/gi;
  return [...html.matchAll(item)]
    .map((m) => ({ name: decode(m[2].trim()), url: m[1] ?? '' }))
    .filter((c) => c.name);
}

function parsePage(url: string, slug: string, status: number, html: string): PageContent {
  const region = mainRegion(html);
  const crumbs = parseBreadcrumbs(html);

  const images = [...region.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((src) => src.includes('com-transport.ru') && !src.includes('mc.yandex'));

  const paragraphs = [...region.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => strip(m[1]))
    .filter((t) => t.length > 40);

  return {
    url,
    slug,
    status,
    title: firstMatch(html, /<title>([\s\S]*?)<\/title>/i),
    h1: firstMatch(region, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    metaDescription: firstMatch(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
    breadcrumbs: crumbs,
    intro: paragraphs[0] ?? '',
    spec: parseSpec(region),
    images: [...new Set(images)],
  };
}

async function scrape(url: string): Promise<PageContent> {
  const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'niaz-migration/1.0' } });
    const html = await res.text();
    return parsePage(url, slug, res.status, html);
  } catch (err) {
    console.error(`  ошибка ${url}: ${(err as Error).message}`);
    return {
      url, slug, status: 0, title: '', h1: '', metaDescription: '',
      breadcrumbs: [], intro: '', spec: [], images: [],
    };
  }
}

async function main() {
  const urls: string[] = JSON.parse(await readFile(join(OUT, 'sitemap-urls.json'), 'utf8'));
  const results: PageContent[] = [];
  let done = 0;

  // Простой пул: донор — живой прод, не заваливаем его запросами.
  const queue = [...urls];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      results.push(await scrape(url));
      done += 1;
      if (done % 25 === 0) process.stdout.write(`  ${done}/${urls.length}\n`);
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeFile(join(OUT, 'pages-content.json'), JSON.stringify(results, null, 2), 'utf8');

  const bad = results.filter((r) => r.status !== 200);
  const withSpec = results.filter((r) => r.spec.length > 0);
  console.log(`\nСтраниц: ${results.length}`);
  console.log(`С таблицей комплектации: ${withSpec.length}`);
  console.log(`Без meta description: ${results.filter((r) => !r.metaDescription).length}`);
  console.log(`Не 200: ${bad.length}${bad.length ? ' — ' + bad.map((b) => b.slug).join(', ') : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
