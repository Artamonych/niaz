/**
 * Доступ к модели контента, собранной из донора скриптом build-content.
 * Файлы читаются один раз на сборке — страницы статические.
 */
import products from '../data/content/products.json';
import staticPages from '../data/content/pages.json';
import landings from '../data/content/category-landings.json';
import redirects from '../data/content/redirects.json';
import sections from '../data/content/sections.json';
import gallery from '../data/content/gallery.json';
import { CATEGORIES, CATEGORY_BY_KEY, type CategoryKey } from './catalog';

export type SpecRow = { no: string; text: string };

export type Product = {
  slug: string;
  category: CategoryKey;
  title: string;
  lead: string;
  /** Описание исполнения: очищенная разметка донора. Пусто — текста нет. */
  body: string;
  chassis: string;
  spec: SpecRow[];
  images: string[];
};

/** Ссылка со страницы донора: документ для скачивания или переход по сайту. */
export type PageLink = { label: string; href: string; file: boolean };

export type StaticPage = {
  slug: string;
  section: string;
  title: string;
  lead: string;
  /** Тело статьи: очищенная разметка донора. Пустая строка — текста нет. */
  body: string;
  images: string[];
  links: PageLink[];
  /** Дата публикации YYYY-MM-DD. Есть у записей WP — новостей; у страниц null. */
  date: string | null;
};

export type CategoryLanding = {
  key: CategoryKey;
  slug: string;
  title: string;
  lead: string;
  /** Текст посадочной страницы раздела. Пусто — текста не было. */
  body: string;
  images: string[];
};

export type SectionIndex = {
  slug: string;
  section: string;
  title: string;
  lead: string;
  items: { slug: string; title: string; lead: string }[];
};

export const PRODUCTS = products as Product[];
export const STATIC_PAGES = staticPages as StaticPage[];
export const LANDINGS = landings as CategoryLanding[];
export const REDIRECTS = redirects as { source: string; destination: string; permanent: true }[];
export const SECTIONS = sections as SectionIndex[];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const getStaticPage = (slug: string) => STATIC_PAGES.find((p) => p.slug === slug);
export const getLanding = (slug: string) => LANDINGS.find((p) => p.slug === slug);
export const getSection = (slug: string) => SECTIONS.find((p) => p.slug === slug);

export const productsOf = (key: CategoryKey) => PRODUCTS.filter((p) => p.category === key);

/** Витрина раздела «Галерея»: страницы со снимками, сгруппированные по маркам. */
export type GalleryGroup = { mark: string; pages: StaticPage[] };

/**
 * Снимки берём из самих страниц, а не из gallery.json: адреса фото переписывает
 * localize-media после сборки контента, и копия адреса устарела бы.
 */
export const galleryGroups = (): GalleryGroup[] =>
  (gallery as { mark: string; slugs: string[] }[]).map(({ mark, slugs }) => ({
    mark,
    pages: slugs.map(getStaticPage).filter((p): p is StaticPage => !!p),
  }));

/** Марка базового шасси для фильтра: «Mercedes-Benz Sprinter Classic…» → «Mercedes-Benz». */
export function chassisBrand(chassis: string): string {
  const brands = ['Mercedes-Benz', 'Volkswagen', 'Peugeot', 'Renault', 'Citroen', 'Citroën', 'ГАЗ', 'DONGFENG', 'FOTON', 'Isuzu', 'КАМАЗ', 'Соболь'];
  return brands.find((b) => chassis.toLowerCase().includes(b.toLowerCase())) ?? '';
}

/**
 * Класс АСМП из названия: «…класса "В"» → «B». В исходнике латиница и
 * кириллица перемешаны: «класса А» может быть написано и той, и другой буквой.
 *
 * Границу слова `\b` использовать нельзя: в JavaScript она считает словом
 * только латиницу, цифры и подчёркивание, поэтому «класса А» с кириллической
 * «А» не распознавалось, и карточка оставалась без класса — а по нему идёт
 * фильтр в каталоге. Проверяем соседний символ сами.
 */
export function asmpClass(title: string): 'A' | 'B' | 'C' | '' {
  const t = title.toLowerCase();
  // Буква класса стоит отдельным словом или в кавычках: «класса А», класса "В".
  // Без этого «представительского класса» читалось как класс A — буква
  // подхватывалась из соседнего слова.
  const rule = (letters: string) =>
    new RegExp(`класс\\S*\\s+[«"'‹„]?[${letters}][»"'›“]?(?![a-zа-яё0-9])`);

  if (rule('cс').test(t)) return 'C';
  if (rule('bвv').test(t)) return 'B';
  if (rule('aа').test(t)) return 'A';
  return '';
}

export { CATEGORIES, CATEGORY_BY_KEY };
export type { CategoryKey };

/**
 * Слаги, у которых есть собственный роут: динамический [slug] их не обслуживает,
 * иначе Next получит два источника для одного адреса.
 */
export const RESERVED_SLUGS = new Set(['produktsiya', 'tendery', 'inzheneriya', 'novosti']);
