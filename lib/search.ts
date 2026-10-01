/**
 * Поиск по сайту (правка заказчика от 01.10.2026): по полному и частичному
 * совпадению слова.
 *
 * Индекс — всё, что сайт показывает: карточки с комплектацией, разделы и
 * подразделы, статьи и страницы донора, собственные страницы завода и новости
 * из CRM. Документов несколько сотен, поэтому поиск — прямым проходом по
 * тексту, без внешнего движка: на таком объёме это миллисекунды.
 *
 * Правила совпадения:
 *   - регистр и «ё/е» не различаются;
 *   - каждое слово запроса должно найтись в документе (И, не ИЛИ);
 *   - слово находится и целиком, и как часть слова: «реаним» найдёт
 *     «реанимобиль» и «реанимационный»;
 *   - целое слово весит больше части, заголовок — больше текста.
 */
import { CATEGORY_BY_KEY, SUBSECTIONS, subsectionHref } from './catalog';
import { COMPANIES } from './company';
import { LANDINGS, PRODUCTS, STATIC_PAGES } from './content';
import { getNewsFeed } from './news';
import { PARTNERS } from './partners';
import { MOBILE_OFFICES, UNIQUE_PROJECTS, type Project } from './projects';
import { PRICE_SECTIONS } from './uslugi';

/** Текст штучных проектов для индекса: названия, базы, вводки и решения. */
const projectsText = (projects: Project[]) =>
  projects
    .map((p) => [p.title, p.base, p.lead, ...p.features.map((f) => `${f.t} ${f.d}`)].join(' '))
    .join(' ');

export type SearchDoc = {
  href: string;
  title: string;
  /** Где лежит: «Каталог · АСМП», «Статья», «Новость». */
  kind: string;
  /** Текст для поиска и для отрывка в выдаче. */
  text: string;
};

export type SearchHit = SearchDoc & { score: number; snippet: string };

/** Регистр, «ё» и всё, что не буква и не цифра, — к одному виду. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Слова запроса: короче двух знаков — шум («и», «в»). */
export const queryWords = (q: string) =>
  [...new Set(normalize(q).split(' ').filter((w) => w.length >= 2))].slice(0, 8);

/** Собственные страницы завода — у них нет записи в данных донора. */
function ownPages(): SearchDoc[] {
  return [
    {
      href: '/produktsiya/',
      title: 'Продукция завода',
      kind: 'Каталог',
      text: 'Каталог: автомобили скорой медицинской помощи, транспорт для маломобильных граждан, спецавтомобили и лаборатории, фургоны, ритуальные автомобили, прицепы.',
    },
    {
      href: '/inzheneriya/',
      title: 'Инженерия',
      kind: 'Страница',
      text: 'Собственное производство: раскрой листа и панелей, лазерная резка, листообработка, станки с ЧПУ. Конструкторский центр, дизайн-центр, производственные мощности.',
    },
    {
      href: '/inzheneriya/uslugi/',
      title: 'Услуги производства',
      kind: 'Страница',
      text: `Фрезеровка на станках с ЧПУ, лазерная резка, лазерная гравировка, 3D-фрезеровка и моделирование. Цены. Материалы: ${PRICE_SECTIONS.flatMap(
        (s) => [...(s.tables ?? []).map((t) => t.title), ...(s.items ?? []).map((i) => i.title)],
      ).join(', ')}.`,
    },
    {
      href: '/unikalnye-proekty/',
      title: 'Уникальные проекты',
      kind: 'Страница',
      text: projectsText(UNIQUE_PROJECTS),
    },
    {
      href: '/mobilnye-ofisy/',
      title: 'Мобильные офисы',
      kind: 'Каталог',
      text: `Представительские микроавтобусы, VIP. ${projectsText(MOBILE_OFFICES)}`,
    },
    {
      href: '/interery-asmp/',
      title: 'Интерьеры АСМП',
      kind: 'Страница',
      text: 'Медицинские салоны автомобилей скорой медицинской помощи: компоновка, отделка, крепление носилок и оборудования.',
    },
    {
      href: '/rekvizity/',
      title: 'Реквизиты',
      kind: 'Страница',
      text: COMPANIES.map((c) => `${c.short} ${c.full} ${c.requisites.map((r) => `${r.label} ${r.value}`).join(' ')}`).join(' '),
    },
    {
      href: '/partnery/',
      title: 'Партнёры',
      kind: 'Страница',
      text: `Марки базовых шасси и автомобилей: ${PARTNERS.map((p) => [p.name, p.note].filter(Boolean).join(' ')).join(', ')}.`,
    },
  ];
}

/** Статичная часть индекса: собирается один раз на процесс. */
let staticIndex: SearchDoc[] | null = null;

function buildStaticIndex(): SearchDoc[] {
  const products: SearchDoc[] = PRODUCTS.map((p) => ({
    href: `/${p.slug}/`,
    title: p.title,
    kind: `Каталог · ${CATEGORY_BY_KEY[p.category].short}`,
    text: [p.lead, stripHtml(p.body), p.chassis, p.brand, ...p.spec.map((r) => `${r.no} ${r.text}`)]
      .filter(Boolean)
      .join(' '),
  }));

  const landings: SearchDoc[] = LANDINGS.map((l) => ({
    href: `/${l.slug}/`,
    title: CATEGORY_BY_KEY[l.key].title,
    kind: 'Раздел каталога',
    text: [l.title, l.lead, stripHtml(l.body)].join(' '),
  }));

  const subsections: SearchDoc[] = SUBSECTIONS.map((s) => ({
    href: `${subsectionHref(s)}/`,
    title: s.title,
    kind: `Раздел каталога · ${CATEGORY_BY_KEY[s.category].short}`,
    text: s.lead,
  }));

  const pages: SearchDoc[] = STATIC_PAGES.map((p) => ({
    href: `/${p.slug}/`,
    title: p.title,
    kind: p.section === 'Новости' ? 'Новость' : 'Статья',
    text: [p.lead, stripHtml(p.body)].join(' '),
  }));

  return [...ownPages(), ...landings, ...subsections, ...products, ...pages];
}

/**
 * Отрывок вокруг первого найденного слова: так видно, почему документ в выдаче.
 * Нашлось только в заголовке — отрывка нет: начало текста карточки — это
 * шаблонная фраза донора и строки комплектации, они только шумят.
 */
function snippetOf(text: string, words: string[]): string {
  const plain = text.replace(/\s+/g, ' ').trim();
  const lower = plain.toLowerCase().replace(/ё/g, 'е');
  const at = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return '';
  const start = Math.max(0, at - 60);
  const end = Math.min(plain.length, at + 140);
  return (start > 0 ? '…' : '') + plain.slice(start, end).trim() + (end < plain.length ? '…' : '');
}

function scoreOf(doc: SearchDoc, words: string[]): number {
  const title = ` ${normalize(doc.title)} `;
  const text = ` ${normalize(doc.text)} `;
  let score = 0;
  for (const w of words) {
    const whole = ` ${w} `;
    if (title.includes(whole)) score += 10;
    else if (title.includes(w)) score += 6;
    else if (text.includes(whole)) score += 3;
    else if (text.includes(w)) score += 1;
    // Слово не нашлось нигде — документ не подходит.
    else return 0;
  }
  return score;
}

export async function search(q: string): Promise<SearchHit[]> {
  const words = queryWords(q);
  if (!words.length) return [];

  staticIndex ??= buildStaticIndex();

  // Новости CRM — из базы на каждый запрос: опубликованная пять минут назад
  // должна находиться сразу. Новости донора уже лежат в статичной части.
  const crmNews: SearchDoc[] = (await getNewsFeed())
    .filter((n) => n.key.startsWith('crm:'))
    .map((n) => ({ href: n.href, title: n.title, kind: 'Новость', text: n.excerpt }));

  return [...staticIndex, ...crmNews]
    .map((doc) => ({ doc, score: scoreOf(doc, words) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, 'ru'))
    .map(({ doc, score }) => ({ ...doc, score, snippet: snippetOf(doc.text, words) }));
}
