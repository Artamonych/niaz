/**
 * Прайс услуг производства (раздел «Инженерия → Услуги производства»).
 *
 * Данные собирает scripts/prep-uslugi.ts из docx заказчика — руками JSON не
 * правится: при следующем обновлении прайса правка пропала бы.
 */
import data from '../data/content/uslugi-tseny.json';

/** Таблица «толщина × объём заказа»: цены — строки, как в исходнике. */
export type PriceTable = {
  title: string;
  /** Шапка столбца подписей: «Толщина», у картона — «Материал» (там плотность). */
  rowHead: string;
  cols: string[];
  rows: { label: string; prices: string[] }[];
};

/** Позиция без сетки объёмов: одна цена на услугу. */
export type PriceItem = { title: string; price: string; detail?: string };

export type PriceSection = {
  key: string;
  title: string;
  /** Единица цен в таблицах раздела. */
  unit?: string;
  note?: string;
  tables?: PriceTable[];
  items?: PriceItem[];
};

export const PRICE_SECTIONS = data as PriceSection[];
