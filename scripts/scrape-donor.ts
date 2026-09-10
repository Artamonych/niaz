/**
 * Выгрузка контента действующего сайта com-transport.ru (WordPress) в data/donor/.
 *
 * Донор — эталон приёмки по §6.1 ТЗ: полная карта индексируемых URL до старта.
 * Скрипт идемпотентен, запускается вручную: npm run scrape:donor
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ORIGIN = 'https://com-transport.ru';
const OUT = join(process.cwd(), 'data', 'donor');

const FIELDS = [
  'id', 'slug', 'link', 'date', 'modified', 'parent', 'menu_order',
  'title', 'content', 'excerpt', 'featured_media', 'yoast_head_json',
].join(',');

type WpEntry = {
  id: number;
  slug: string;
  link: string;
  date: string;
  modified: string;
  parent?: number;
  menu_order?: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  yoast_head_json?: Record<string, unknown>;
};

async function getJson<T>(url: string): Promise<{ body: T; totalPages: number }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'niaz-migration/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return {
    body: (await res.json()) as T,
    totalPages: Number(res.headers.get('x-wp-totalpages') ?? '1'),
  };
}

/** Тянет все страницы пагинации REST-коллекции. */
async function fetchAll(type: 'pages' | 'posts' | 'media'): Promise<WpEntry[]> {
  const fields = type === 'media' ? 'id,slug,source_url,alt_text,media_details' : FIELDS;
  const out: WpEntry[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${ORIGIN}/wp-json/wp/v2/${type}?per_page=100&page=${page}&_fields=${fields}`;
    const { body, totalPages: tp } = await getJson<WpEntry[]>(url);
    totalPages = tp;
    out.push(...body);
    process.stdout.write(`  ${type}: страница ${page}/${totalPages}, всего ${out.length}\n`);
    page += 1;
  } while (page <= totalPages);

  return out;
}

/** Список индексируемых URL из sitemap — сверяем с тем, что отдал REST. */
async function fetchSitemapUrls(): Promise<string[]> {
  const index = await (await fetch(`${ORIGIN}/sitemap_index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls: string[] = [];

  for (const map of maps) {
    const xml = await (await fetch(map)).text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return [...new Set(urls)].sort();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  console.log('Карта URL из sitemap...');
  const sitemap = await fetchSitemapUrls();
  await writeFile(join(OUT, 'sitemap-urls.json'), JSON.stringify(sitemap, null, 2), 'utf8');
  console.log(`  ${sitemap.length} URL\n`);

  for (const type of ['pages', 'posts', 'media'] as const) {
    console.log(`Выгрузка ${type}...`);
    const items = await fetchAll(type);
    await writeFile(join(OUT, `${type}.json`), JSON.stringify(items, null, 2), 'utf8');
    console.log(`  сохранено ${items.length}\n`);
  }

  console.log('Готово. data/donor/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
