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
import categoryPhotos from '../data/content/category-photos.json';
import productPhotos from '../data/content/product-photos.json';
import covers from '../data/content/covers.json';
import { CATEGORIES, CATEGORY_BY_KEY, type CategoryKey } from './catalog';
import { TRAILER_LANDING, TRAILER_PRODUCTS } from './trailers';

export type SpecRow = { no: string; text: string };

/** Лист чертежа в карточке: показывается целиком, во всю ширину, с подписью. */
export type Drawing = { src: string; caption: string; w: number; h: number };

export type Product = {
  slug: string;
  category: CategoryKey;
  title: string;
  lead: string;
  /** Описание исполнения: очищенная разметка донора. Пусто — текста нет. */
  body: string;
  chassis: string;
  /** Марка шасси: из комплектации, а где её нет — из названия исполнения. */
  brand: string;
  spec: SpecRow[];
  images: string[];
  /**
   * Чертежи вместо фотографий — у собственных изделий завода без съёмки
   * (lib/trailers.ts). У донорских товаров поля нет.
   */
  drawings?: Drawing[];
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

/**
 * Фото со старого сайта сняты по правке заказчика от 01.10.2026: на их месте
 * плейсхолдеры, пока завод не передаст свою съёмку. Снимаем здесь, а не в
 * JSON: products.json и pages.json пересобирает scripts/build-content.ts из
 * выгрузки донора, и правка в файле пропала бы при первом прогоне.
 *
 * Остаются сканы документов — это не фото техники, а без них опустели бы
 * «Сертификация» (нужна для закупок) и «Благодарственные письма».
 */
const DONOR_DOCUMENTS = new Set([
  // Сертификация: ОТТС и сертификаты соответствия.
  '/media/catalog/c745eab9f_600x850.webp',
  '/media/catalog/55fc43274_600x850.webp',
  '/media/catalog/15b969d8d_600x850.webp',
  '/media/catalog/3d98e13c3_600x850.webp',
  '/media/catalog/d418e5aef_600x850.webp',
  '/media/catalog/1b1272a28_600x850.webp',
  '/media/catalog/d7744397c_600x850.webp',
  '/media/catalog/2abefdf42_600x850.webp',
  '/media/catalog/e3c853eab_600x850.webp',
  // Благодарственные письма.
  '/media/catalog/4fe91c133_800x510.webp',
  '/media/catalog/f37090856_800x510.webp',
]);

const withoutDonorPhotos = (images: string[]) =>
  images.filter((src) => !src.startsWith('/media/catalog/') || DONOR_DOCUMENTS.has(src));

/** Снимки из своей съёмки, привязанные к карточке (scripts/prep-catalog-photos.ts). */
const PRODUCT_PHOTOS = productPhotos as Record<string, string[]>;

// Донорский каталог плюс собственные разделы завода, которых у донора не было.
export const PRODUCTS = [...(products as Product[]), ...TRAILER_PRODUCTS].map((p) => ({
  ...p,
  images: [...(PRODUCT_PHOTOS[p.slug] ?? []), ...withoutDonorPhotos(p.images)],
}));
/**
 * Ссылка «Реквизиты компании» на «Контактах» вела на PDF донора: адрес на
 * Сурикова, «Росбанк», директор Барканова, отменённые ОКВЭД. Вместо него —
 * карточки обоих юрлиц из lib/company.ts (scripts/prep-rekvizity-pdf.ts).
 */
const OLD_REQUISITES = '/files/rekvizity-kompanii.pdf';
const REQUISITES_LINKS: PageLink[] = [
  { label: 'Реквизиты ООО «ГК НиАЗ» (PDF)', href: '/files/rekvizity-ooo-gk-niaz.pdf', file: true },
  { label: 'Реквизиты ООО «НиАЗ» (PDF)', href: '/files/rekvizity-ooo-niaz.pdf', file: true },
  { label: 'Реквизиты на сайте', href: '/rekvizity/', file: false },
];

export const STATIC_PAGES = (staticPages as StaticPage[]).map((p) => ({
  ...p,
  images: withoutDonorPhotos(p.images),
  links: p.links.flatMap((l) => (l.href === OLD_REQUISITES ? REQUISITES_LINKS : [l])),
}));
export const LANDINGS = [...(landings as CategoryLanding[]), TRAILER_LANDING].map((l) => ({
  ...l,
  images: withoutDonorPhotos(l.images),
}));
export const REDIRECTS = redirects as { source: string; destination: string; permanent: true }[];
export const SECTIONS = sections as SectionIndex[];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const getStaticPage = (slug: string) => STATIC_PAGES.find((p) => p.slug === slug);
export const getLanding = (slug: string) => LANDINGS.find((p) => p.slug === slug);
export const getSection = (slug: string) => SECTIONS.find((p) => p.slug === slug);

export const productsOf = (key: CategoryKey) => PRODUCTS.filter((p) => p.category === key);

/**
 * Обложка раздела на главной и в каталоге — кадр из своей съёмки.
 *
 * Кадры выбраны вручную и подрезаны заранее (scripts/prep-covers.ts): нужен
 * общий план машины, по которому раздел узнаётся с первого взгляда. В именах
 * файлов стоит отпечаток содержимого — картинки отдаются с годовым кешем, и
 * под прежним именем новая обложка на сайте не появилась бы.
 *
 * У грузопассажирских своей съёмки нет, а фото старого сайта сняты: там
 * плейсхолдер, пока завод не передаст свою.
 */
const COVERS = covers as Partial<Record<CategoryKey, string>>;

/**
 * Что показывать на карточке раздела: обложка из своей съёмки, иначе — первое
 * фото исполнения (тоже своё: донорские сняты), иначе ничего — будет плейсхолдер.
 */
export function categoryCover(key: CategoryKey): string | undefined {
  return COVERS[key] ?? productsOf(key).find((p) => p.images[0])?.images[0];
}

/**
 * Снимок раздела: своя съёмка завода, подпись — из папки, в которой он лежал.
 * Метки — для фильтров страницы раздела: класс АСМП, вид (ключ из KINDS),
 * марка шасси. Есть только там, где следуют из папки или однозначны по кадру.
 */
export type CategoryPhoto = {
  src: string;
  caption: string;
  w: number;
  h: number;
  cls?: 'A' | 'B' | 'C';
  kind?: string;
  brand?: string;
};

const PHOTOS = categoryPhotos as Record<string, CategoryPhoto[]>;

/**
 * Фотографии раздела (scripts/prep-catalog-photos.ts). Живут на уровне
 * раздела, а не карточки: по снимку не определить, какое из 131 исполнения
 * на нём снято, и приписывать наугад нельзя.
 */
export const photosOf = (key: CategoryKey): CategoryPhoto[] => PHOTOS[key] ?? [];

/** Снимки раздела «Интерьеры АСМП» — салоны, без привязки к классу или карточке. */
export const interiorPhotos = (): CategoryPhoto[] => PHOTOS['asmp-interery'] ?? [];

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
export const RESERVED_SLUGS = new Set([
  'produktsiya',
  'inzheneriya',
  'novosti',
  'unikalnye-proekty',
  'interery-asmp',
  'mobilnye-ofisy',
  'poisk',
  // Правовые документы: у донора по этому адресу лежала политика чужого сайта.
  'politika-konfidentsialnosti',
  'politika-cookie',
]);
