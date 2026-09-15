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
import { cleanHtml, dropLeadingDuplicate, textLength } from './clean-html';

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
  /** Описание исполнения из выгрузки донора. Пустое — текста не было. */
  body: string;
  /** Базовое шасси вытаскиваем из первой содержательной строки комплектации. */
  chassis: string;
  /** Марка шасси для фильтра: из комплектации, а если её нет — из названия. */
  brand: string;
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
  /**
   * Тело статьи: очищенная разметка из выгрузки WP. Пустое — если текста нет
   * или страница в списке исключений (см. SKIP_BODY).
   */
  body: string;
  images: string[];
  links: PageLink[];
  /** Дата публикации (YYYY-MM-DD) — есть только у записей WP, то есть у новостей. */
  date: string | null;
};

/**
 * Чьи тела не выводим: o-kompanii — на доноре там текст-генератор
 * («сложившаяся структура организации обеспечивает широкому кругу
 * специалистов участие…»), страницу нужно писать заново, см. п. 23 бэклога.
 */
const SKIP_BODY = new Set(['o-kompanii']);

/**
 * Страницы донора, которых на сайте больше не будет (п. 21 бэклога).
 *
 * «Карта сайта» была списком ссылок от плагина WordPress: человеку её заменяет
 * меню, роботам — /sitemap.xml. Адрес проиндексирован, поэтому не обрываем
 * его, а уводим на главную — пришедший за оглавлением попадает в навигацию.
 */
const RETIRED: Record<string, string> = { sitemap: '/' };

/**
 * «Видео» у донора было пустой рамкой: роликов там не было никогда. Этот адрес
 * отвечает 410 (см. proxy.ts) — «страницы больше нет». Поиск убирает её
 * быстрее, чем при 404, и не ищет замену. Появятся ролики — вернём, адрес свободен.
 */
const GONE = new Set(['video']);

/** Меньше этого — не статья, а обрывок вроде подписи под картинкой. */
const MIN_BODY = 200;

/**
 * Парные фотогалереи донора: назывались одинаково и лежали двумя страницами.
 * Снимки у них разные — пересечение один кадр из шести и одиннадцати, — но
 * это одна и та же витрина, разбитая надвое. Сводим в одну: фотографии
 * объединяются, второй адрес уходит 301-редиректом. Так пропадают и дубли
 * заголовков (п. 22), и лишние страницы в индексе (п. 20).
 *
 * Порядок: [куда сводим, что присоединяем]. Оставляем ту, где снимков больше.
 */
const MERGE_GALLERIES: [string, string][] = [
  ['asmp-3', 'asmp-2'],
  ['sotsialnyy-3', 'sotsialnyy-2'],
  ['volkswagen', 'volkswagen-3'],
  // Две галереи ГАЗ: лежали в разных разделах донора («Информация» и
  // «Галерея»), поэтому маркой не разводятся — заголовок у обеих и есть
  // марка. Общих снимков нет вовсе, у первой их 18 против пяти.
  ['gaz-2', 'gaz-3'],
];

/** Разделы донора, названные маркой шасси: это фотогалереи по маркам. */
const GALLERY_MARKS = ['Volkswagen', 'ГАЗ', 'Mercedes', 'Renault', 'Peugeot', 'Citroen'];

/**
 * Тело страницы для вывода: без первого абзаца, если он повторяет вводку.
 * У донора вводка и есть первый абзац, поэтому иначе он идёт дважды подряд.
 * Если после этого текста почти не осталось — тела у страницы нет.
 */
function bodyFor(bodies: Map<string, string>, slug: string, lead: string): string {
  const body = dropLeadingDuplicate(bodies.get(slug) ?? '', lead);
  return textLength(body) >= MIN_BODY ? body : '';
}

/**
 * Сводит парные фотогалереи и разводит одинаковые заголовки.
 *
 * Заголовок дополняется маркой из раздела («АСМП» → «АСМП — Renault») только
 * у страниц без текста, то есть у самих галерей: у статей заголовки свои и
 * трогать их незачем. Марка берётся из данных донора, а не выдумывается.
 *
 * Меняет переданные массивы: страницы и редиректы.
 */
function mergeGalleries(pages: StaticPage[], redirects: Redirect[]) {
  for (const [keepSlug, mergeSlug] of MERGE_GALLERIES) {
    const keep = pages.find((p) => p.slug === keepSlug);
    const index = pages.findIndex((p) => p.slug === mergeSlug);
    if (!keep || index === -1) continue;

    const [merged] = pages.splice(index, 1);
    // Снимки объединяем без повторов — общие кадры в парах единичны.
    keep.images = [...new Set([...keep.images, ...merged.images])];
    redirects.push({ source: `/${mergeSlug}`, destination: `/${keepSlug}/`, permanent: true });
  }

  for (const page of pages) {
    if (page.body) continue;
    const mark = GALLERY_MARKS.find((m) => m === page.section);
    if (!mark || page.title.toLowerCase().includes(mark.toLowerCase())) continue;
    page.title = `${page.title} — ${mark}`;
  }
}

type Redirect = { source: string; destination: string; permanent: true };

/**
 * Раздел «Галерея»: витрины по маркам шасси, собранные из страниц-сирот.
 *
 * Храним только слаги. Заголовок и снимки лежат в pages.json, и копировать их
 * сюда нельзя: адреса фото переписывает localize-media уже после этого шага,
 * так что копия осталась бы с адресами донора.
 */
type GalleryGroup = { mark: string; slugs: string[] };

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
 * Марка базового шасси для фильтра в каталоге (п. 10 бэклога).
 *
 * Раньше её брали только из комплектации, а комплектация есть у 32 карточек из
 * 131 — и марка определялась ровно у двух, из-за чего фильтр «Шасси» не
 * появлялся вовсе. Название исполнения марку почти всегда содержит
 * («…на базе Volkswagen Crafter 35, 50»), оттуда и берём: это данные донора,
 * а не наша догадка.
 */
/*
 * Кириллические марки ограничиваем не ``, а соседними символами: граница
 * слова в JavaScript считает словом только латиницу и цифры, поэтому «ГАЗ» в
 * «Автомобили Скорой Медицинской Помощи ГАЗ» ею не ловится. Та же ловушка уже
 * попадалась с классом АСМП (см. asmpClass в lib/content.ts).
 */
const ru = (word: string) => new RegExp(`(^|[^а-яё])${word}([^а-яё]|$)`, 'i');

const CHASSIS_BRANDS: { name: string; re: RegExp }[] = [
  { name: 'Mercedes-Benz', re: /mercedes(-|\s)?benz|mercedes|sprinter|vito|v-?class|мерседес/i },
  { name: 'Volkswagen', re: /volkswagen|vw|crafter|transporter|caddy|amarok|multivan|фольксваген/i },
  { name: 'Peugeot', re: /peugeot|boxer|partner|expert|пежо/i },
  { name: 'Renault', re: /renault|master|trafic|dokker|рено/i },
  { name: 'Citroen', re: /citro[eё]n|jumper|jumpy|berlingo|ситроен/i },
  { name: 'Hyundai', re: /hyundai|хендай|хёндэ|porter|county/i },
  { name: 'Isuzu', re: /isuzu|исузу/i },
  { name: 'Ford', re: /ford|transit|форд/i },
  { name: 'Fiat', re: /fiat|ducato|фиат/i },
  { name: 'DONGFENG', re: /dongfeng|донгфенг|донг ?фенг/i },
  { name: 'FOTON', re: /foton|фотон/i },
  { name: 'ГАЗ', re: new RegExp(`${ru('газ').source}|газель|соболь|валдай|садко|\bnext\b`, 'i') },
  { name: 'КАМАЗ', re: new RegExp(`${ru('камаз').source}|kamaz`, 'i') },
  { name: 'УАЗ', re: new RegExp(`${ru('уаз').source}|патриот|профи`, 'i') },
  { name: 'Урал', re: ru('урал') },
];

function chassisBrandOf(title: string, chassis: string): string {
  // Комплектация точнее названия: если базовое шасси выписано, верим ей.
  const hay = `${chassis} ${title}`;
  return CHASSIS_BRANDS.find((b) => b.re.test(hay))?.name ?? '';
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
  // Тело статьи берётся отсюда же: HTML-выгрузка сохранила только вводный
  // абзац, из-за чего 53 страницы выглядели пустыми (п. 17 бэклога).
  const bodyBySlug = new Map<string, string>();

  for (const w of wp) {
    if (!w.slug || w.slug === 'sitemap') continue; // карту сайта заменяет sitemap.xml
    const links = extractLinks(w.content?.rendered ?? '');
    if (links.length) linksBySlug.set(w.slug, links);

    if (SKIP_BODY.has(w.slug)) continue;
    const body = cleanHtml(w.content?.rendered ?? '');
    if (textLength(body) >= MIN_BODY) bodyBySlug.set(w.slug, body);
  }
  // Даты публикации лежат только в выгрузке записей WP. HTML-выгрузка их
  // не сохранила, поэтому новости донора приезжали без дат.
  type WpPost = { slug: string; date?: string; content?: { rendered?: string } };
  const posts: WpPost[] = JSON.parse(await readFile(join(DONOR, 'posts.json'), 'utf8'));
  const datesBySlug = new Map(
    posts.filter((p) => p.slug && p.date).map((p) => [p.slug, String(p.date).slice(0, 10)]),
  );

  // Статьи информационного раздела и новости в WordPress — это записи, а не
  // страницы: 52 материала и около 130 000 знаков лежат именно здесь.
  for (const post of posts) {
    if (!post.slug || SKIP_BODY.has(post.slug)) continue;
    const body = cleanHtml(post.content?.rendered ?? '');
    if (textLength(body) >= MIN_BODY) bodyBySlug.set(post.slug, body);
  }

  await mkdir(OUT, { recursive: true });

  const products: Product[] = [];
  const staticPages: StaticPage[] = [];
  const redirects: Redirect[] = [];
  const unmapped: string[] = [];
  const categoryLandings: {
    key: CategoryKey;
    slug: string;
    title: string;
    lead: string;
    body: string;
    images: string[];
  }[] = [];

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

    const retired = RETIRED[page.slug];
    if (retired) {
      redirects.push({ source: path, destination: retired, permanent: true });
      continue;
    }

    // Страница снята насовсем: ни страницы, ни редиректа — 410 отдаёт proxy.ts.
    if (GONE.has(page.slug)) continue;

    // Посадочная страница раздела: крошки вида Главная / Продукция / <сама себя>.
    const landing = CATEGORIES.find((c) => c.slug === page.slug);
    if (isProduct(page) && landing) {
      categoryLandings.push({
        key: landing.key,
        slug: page.slug,
        title: page.h1 || page.title,
        lead: page.intro,
        body: bodyFor(bodyBySlug, page.slug, page.intro),
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
        body: bodyFor(bodyBySlug, page.slug, page.intro),
        chassis: extractChassis(page.spec),
        brand: chassisBrandOf(page.h1 || page.title, extractChassis(page.spec)),
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
      body: bodyFor(bodyBySlug, page.slug, page.intro),
      images: page.images,
      links: linksBySlug.get(page.slug) ?? [],
      date: datesBySlug.get(page.slug) ?? null,
    });

    if (isProduct(page) && !category) unmapped.push(page.slug);
  }

  // Слияние идёт после сбора всех страниц: объединяет парные галереи и
  // дополняет их заголовки маркой, чтобы в индексе не было одинаковых.
  mergeGalleries(staticPages, redirects);

  /*
   * Раздел «Галерея» (п. 20 бэклога). Три десятка страниц со снимками лежали
   * вне навигации: попасть на них можно было только из поиска, хотя в
   * sitemap.xml они есть. Собираем их в витрину по маркам шасси — марка
   * берётся из раздела донора или из заголовка, а не придумывается.
   */
  const galleryPages = staticPages.filter(
    (p) =>
      p.slug !== 'galereya' &&
      !p.body &&
      p.images.length > 0 &&
      (GALLERY_MARKS.includes(p.section) || p.section === 'Галерея'),
  );

  // Крупные подборки впереди: по ним видно, что завод делает чаще.
  galleryPages.sort((a, b) => b.images.length - a.images.length);

  const groups = new Map<string, string[]>();
  for (const page of galleryPages) {
    const mark =
      GALLERY_MARKS.find((m) => m === page.section) ??
      GALLERY_MARKS.find((m) => page.title.toLowerCase().includes(m.toLowerCase())) ??
      'Разное';
    groups.set(mark, [...(groups.get(mark) ?? []), page.slug]);
  }

  const gallery: GalleryGroup[] = [...groups]
    .map(([mark, slugs]) => ({ mark, slugs }))
    .sort((a, b) => b.slugs.length - a.slugs.length);

  await writeFile(join(OUT, 'gallery.json'), JSON.stringify(gallery, null, 2), 'utf8');

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
  const withBody = staticPages.filter((p) => p.body);
  const bodyChars = withBody.reduce((sum, p) => sum + textLength(p.body), 0);
  console.log(`Прочих страниц: ${staticPages.length}`);
  console.log(
    `Галерея: ${gallery.length} марок, ${gallery.reduce((s, g) => s + g.slugs.length, 0)} витрин, ` +
      `${galleryPages.reduce((s, p) => s + p.images.length, 0)} снимков`,
  );
  console.log(`  с телом статьи: ${withBody.length}, суммарно ${bodyChars.toLocaleString('ru-RU')} знаков`);
  console.log('Индексов разделов: ' + sections.map((s) => `${s.slug} (${s.items.length})`).join(', '));
  console.log(`301-редиректов (снятый раздел «${REMOVED_DONOR_SECTION}»): ${redirects.length}`);
  console.log('  из них витрин галереи: ' + redirects.filter((r) => !r.destination.includes('produktsiya')).length);
  const covered = products.length + staticPages.length + redirects.length + categoryLandings.length;
  console.log(`Покрыто URL: ${covered} из ${pages.length} (корень обслуживается главной)`);

  /*
   * Адреса картинок здесь ещё донорские: на свои их меняет второй шаг,
   * scripts/localize-media.ts. Запускать эту сборку отдельно нельзя — данные
   * с чужими адресами однажды уехали в коммит, и сайт снова потянул 1273
   * файла с com-transport.ru. Поэтому предупреждаем прямо в выводе.
   */
  const donor = [...products, ...staticPages, ...categoryLandings].reduce(
    (n, p) => n + p.images.filter((src) => src.includes('com-transport.ru')).length,
    0,
  );
  if (donor) {
    console.log(
      `\n⚠ Картинок с адресами донора: ${donor}. Это промежуточное состояние — ` +
        'запустите `npm run build:content`, иначе сайт будет тянуть фото с чужого сайта.',
    );
  }
  if (unmapped.length) console.log(`Без категории: ${unmapped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
