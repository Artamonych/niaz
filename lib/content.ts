/**
 * Доступ к модели контента, собранной из донора скриптом build-content.
 * Файлы читаются один раз на сборке — страницы статические.
 */
import products from '../data/content/products.json';
import staticPages from '../data/content/pages.json';
import landings from '../data/content/category-landings.json';
import redirects from '../data/content/redirects.json';
import sections from '../data/content/sections.json';
import { CATEGORIES, CATEGORY_BY_KEY, type CategoryKey } from './catalog';

export type SpecRow = { no: string; text: string };

export type Product = {
  slug: string;
  category: CategoryKey;
  title: string;
  lead: string;
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
  images: string[];
  links: PageLink[];
};

export type CategoryLanding = {
  key: CategoryKey;
  slug: string;
  title: string;
  lead: string;
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

/** Марка базового шасси для фильтра: «Mercedes-Benz Sprinter Classic…» → «Mercedes-Benz». */
export function chassisBrand(chassis: string): string {
  const brands = ['Mercedes-Benz', 'Volkswagen', 'Peugeot', 'Renault', 'Citroen', 'Citroën', 'ГАЗ', 'DONGFENG', 'FOTON', 'Isuzu', 'КАМАЗ', 'Соболь'];
  return brands.find((b) => chassis.toLowerCase().includes(b.toLowerCase())) ?? '';
}

/** Класс АСМП из названия: «…класса "В"» → «B». Латиница и кириллица смешаны в исходнике. */
export function asmpClass(title: string): 'A' | 'B' | 'C' | '' {
  const t = title.toLowerCase();
  if (/класс\S*\s*[«"']?\s*[cс]\b|класса\s*[cс]\b/.test(t)) return 'C';
  if (/класс\S*\s*[«"']?\s*[bвv]\b|класса\s*[bвv]\b/.test(t)) return 'B';
  if (/класс\S*\s*[«"']?\s*[aа]\b|класса\s*[aа]\b/.test(t)) return 'A';
  return '';
}

export { CATEGORIES, CATEGORY_BY_KEY };
export type { CategoryKey };

/**
 * Слаги, у которых есть собственный роут: динамический [slug] их не обслуживает,
 * иначе Next получит два источника для одного адреса.
 */
export const RESERVED_SLUGS = new Set(['produktsiya', 'tendery']);
