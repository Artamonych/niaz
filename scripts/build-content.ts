/**
 * Превращает сырую выгрузку донора в модель контента нового сайта.
 *
 * Ключевое требование §6.1 ТЗ — URL 1:1: слаги страниц не меняются, каждый из
 * 327 индексируемых URL обязан отдавать 200 или 301, ни одного 404.
 *
 * Запуск: npm run build:content
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CATEGORIES, REMOVED_DONOR_SECTION, SECTION_INDEXES, type CategoryKey } from '../lib/catalog';

const DONOR = join(process.cwd(), 'data', 'donor');
const OUT = join(process.cwd(), 'data', 'content');

type Crumb = { name: string; url: string };

type DonorPage = {
  url: string;
  slug: string;
  status: number;
  title: string;
  h1: string;
  metaDescription: string;
  breadcrumbs: Crumb[];
  intro: string;
  spec: { no: string; text: string }[];
  images: string[];
};

type Product = {
  slug: string;
  category: CategoryKey;
  title: string;
  lead: string;
  /** Базовое шасси вытаскиваем из первой содержательной строки комплектации. */
  chassis: string;
  spec: { no: string; text: string }[];
  images: string[];
};

/** Ссылка со страницы донора: либо файл, либо переход внутри сайта. */
type PageLink = { label: string; href: string; file: boolean };

type StaticPage = {
  slug: string;
  section: string;
  title: string;
  lead: string;
  images: string[];
  links: PageLink[];
};

type Redirect = { source: string; destination: string; permanent: true };

const FILE_EXT = /\.(docx?|pdf|xlsx?|pptx?|zip|rar)(\?|$)/i;

/**
 * Часть страниц донора — это только список ссылок: «Гарантии» ведёт на три
 * документа, «Электрические схемы» на пять файлов DOCX. HTML-выгрузка их
 * не сохраняла, и такие страницы приезжали пустыми. Достаём из выгрузки
 * WP REST, где лежит исходная разметка.
 */
function extractLinks(html: string): PageLink[] {
  const out: PageLink[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const m of html.matchAll(re)) {
    const href = m[1].trim();
    const label = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!label || !href || href.startsWith('#')) continue;
    // Голый адрес вместо подписи — у донора так продублированы сайты дилеров.
    if (/^https?:\/\//i.test(label)) continue;
    if (/^(mailto|tel):/i.test(href)) continue;

    const internal = href.startsWith('/') || href.includes('com-transport.ru');
    const file = FILE_EXT.test(href);
    // Внутренние ссылки приводим к своему адресу, файлы пока живут у донора.
    const clean = internal && !file ? '/' + href.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\//, '') : href;
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push({ label, href: clean, file });
  }

  return out;
}

const sectionOf = (p: DonorPage) => p.breadcrumbs[2]?.name ?? p.breadcrumbs[1]?.name ?? '';
const isProduct = (p: DonorPage) => p.breadcrumbs[1]?.name === 'Продукция';
const isGallery = (p: DonorPage) => p.breadcrumbs[1]?.name === 'Галерея';

/** Посадочная снятого раздела: крошки обрываются на «Продукция», секция не видна. */
const REMOVED_LANDING_SLUGS = ['avtobusy'];

const BUS_SLUG = /avtobus|mikroavtobus|turist|shkoln|gorodsk/;

/**
 * Автобус ли это. Товарные страницы ловятся по разделу донора, а витрины в
 * галерее — только по слагу: у них в крошках марка шасси, а не линейка.
 */
function isRemovedBus(p: DonorPage, section: string): boolean {
  if (isProduct(p) && section === REMOVED_DONOR_SECTION) return true;
  if (REMOVED_LANDING_SLUGS.includes(p.slug)) return true;
  if (isGallery(p) && BUS_SLUG.test(p.slug)) return true;
  return false;
}

/** «1.1 Mercedes-Benz Sprinter Classic (колесная база 3550 мм)» → база. */
function extractChassis(spec: DonorPage['spec']): string {
  const idx = spec.findIndex((r) => /базовое шасси/i.test(r.text));
  return idx === -1 ? '' : (spec[idx + 1]?.text ?? '');
}

/**
 * Куда уводить снятый раздел. Заказчик выбрал «по смыслу, с откатом в каталог»:
 * исполнения, у которых есть живой аналог, идут в свою линейку, остальное — в корень.
 */
function redirectTarget(p: DonorPage): string {
  const canonical = (key: CategoryKey) =>
    `/${CATEGORIES.find((c) => c.key === key)!.slug}/`;

  const hay = `${p.slug} ${p.h1}`.toLowerCase();
  if (/invalid|ogranichennym|podemnik|подъёмник|подъемник|инвалид/.test(hay)) return canonical('mgn');
  if (/gruzopassazhir|грузопассажир/.test(hay)) return canonical('gp');
  if (/ritualn|katafalk|ритуальн|катафалк/.test(hay)) return canonical('ritual');
  if (/shkoln|школьн/.test(hay)) return canonical('mgn');
  return '/produktsiya/';
}

/**
 * Архивы WordPress (/category/*, /author/*) лежат в sitemap, но страницами не
 * являются: динамический роут их не обслужит, значит нужен 301.
 */
function archiveTarget(slug: string): string | null {
  if (slug.startsWith('author/')) return '/o-kompanii/';
  if (slug.startsWith('category/')) return `/${slug.slice('category/'.length)}/`;
  return null;
}

function sectionToCategory(section: string): CategoryKey | null {
  const hit = CATEGORIES.find((c) => c.donorSections.includes(section));
  return hit?.key ?? null;
}

async function main() {
  const pages: DonorPage[] = JSON.parse(await readFile(join(DONOR, 'pages-content.json'), 'utf8'));

  // Исходная разметка WP: только в ней остались списки ссылок и файлов.
  type WpPage = { slug: string; content?: { rendered?: string } };
  const wp: WpPage[] = JSON.parse(await readFile(join(DONOR, 'pages.json'), 'utf8'));
  const linksBySlug = new Map<string, PageLink[]>();
  for (const w of wp) {
    if (!w.slug || w.slug === 'sitemap') continue; // карту сайта заменяет sitemap.xml
    const links = extractLinks(w.content?.rendered ?? '');
    if (links.length) linksBySlug.set(w.slug, links);
  }
  await mkdir(OUT, { recursive: true });

  const products: Product[] = [];
  const staticPages: StaticPage[] = [];
  const redirects: Redirect[] = [];
  const unmapped: string[] = [];
  const categoryLandings: { key: CategoryKey; slug: string; title: string; lead: string; images: string[] }[] = [];

  for (const page of pages) {
    const section = sectionOf(page);
    const path = `/${page.slug}`.replace(/^\/\/+/, '/');

    const archive = archiveTarget(page.slug);
    if (archive) {
      redirects.push({ source: path, destination: archive, permanent: true });
      continue;
    }

    if (isRemovedBus(page, section)) {
      redirects.push({ source: path, destination: redirectTarget(page), permanent: true });
      continue;
    }

    // Посадочная страница раздела: крошки вида Главная / Продукция / <сама себя>.
    const landing = CATEGORIES.find((c) => c.slug === page.slug);
    if (isProduct(page) && landing) {
      categoryLandings.push({
        key: landing.key,
        slug: page.slug,
        title: page.h1 || page.title,
        lead: page.intro,
        images: page.images,
      });
      continue;
    }

    const category = isProduct(page) ? sectionToCategory(section) : null;

    if (category) {
      products.push({
        slug: page.slug,
        category,
        title: page.h1 || page.title,
        lead: page.intro,
        chassis: extractChassis(page.spec),
        spec: page.spec,
        images: page.images,
      });
      continue;
    }

    if (!page.slug) continue; // корень

    staticPages.push({
      slug: page.slug,
      section: section || page.breadcrumbs[1]?.name || 'Информация',
      title: page.h1 || page.title,
      lead: page.intro,
      images: page.images,
      links: linksBySlug.get(page.slug) ?? [],
    });

    if (isProduct(page) && !category) unmapped.push(page.slug);
  }

  await writeFile(join(OUT, 'products.json'), JSON.stringify(products, null, 2), 'utf8');
  await writeFile(join(OUT, 'pages.json'), JSON.stringify(staticPages, null, 2), 'utf8');
  await writeFile(join(OUT, 'redirects.json'), JSON.stringify(redirects, null, 2), 'utf8');
  await writeFile(join(OUT, 'category-landings.json'), JSON.stringify(categoryLandings, null, 2), 'utf8');

  // Индексы разделов: собственных страниц у них на доноре не было.
  const sections = SECTION_INDEXES.map((s) => ({
    ...s,
    items: staticPages
      .filter((p) => p.section === s.section)
      .map(({ slug, title, lead }) => ({ slug, title, lead })),
  }));
  await writeFile(join(OUT, 'sections.json'), JSON.stringify(sections, null, 2), 'utf8');

  const byCat = CATEGORIES.map(
    (c) => `  ${c.short}: ${products.filter((p) => p.category === c.key).length}`,
  ).join('\n');

  console.log(`Товарных страниц: ${products.length}\n${byCat}`);
  console.log(`Посадочных страниц разделов: ${categoryLandings.length}`);
  console.log(`Прочих страниц: ${staticPages.length}`);
  console.log('Индексов разделов: ' + sections.map((s) => `${s.slug} (${s.items.length})`).join(', '));
  console.log(`301-редиректов (снятый раздел «${REMOVED_DONOR_SECTION}»): ${redirects.length}`);
  console.log('  из них витрин галереи: ' + redirects.filter((r) => !r.destination.includes('produktsiya')).length);
  const covered = products.length + staticPages.length + redirects.length + categoryLandings.length;
  console.log(`Покрыто URL: ${covered} из ${pages.length} (корень обслуживается главной)`);
  if (unmapped.length) console.log(`Без категории: ${unmapped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
