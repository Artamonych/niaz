/**
 * Готовит фотографии разделов каталога из съёмки заказчика.
 *
 * Заказчик разложил снимки по папкам, и эта раскладка и есть деление по
 * разделам сайта: «АСМП/Класс В» → раздел АСМП, «Транспорт МГН» → раздел для
 * маломобильных граждан и так далее. Привязать кадр к конкретному исполнению
 * из 131 карточки по снимку в общем случае нельзя — ни завод, ни мы этого не
 * знаем, поэтому фотографии живут на уровне раздела. Исключение — кадры, где
 * совпадают и модель, и тип машины с единственной карточкой (products ниже).
 *
 * У кадра есть метки — класс АСМП, вид внутри раздела, марка шасси. По ним
 * фильтры страницы раздела отбирают не только карточки, но и снимки. Метка
 * ставится, только если она следует из папки или видна на кадре однозначно.
 *
 * Скрипт ужимает снимки в webp, отбрасывает повторы (в папках лежат «копии»
 * и пересохранённые дубли) и пишет:
 *   data/content/category-photos.json — снимки разделов и группа интерьеров;
 *   data/content/product-photos.json  — снимки, привязанные к карточкам.
 *
 * Источников два: прежняя съёмка («D:/Сайт/фото») и снимки от 01.10.2026
 * («D:/Новые фотки»). Запуск: npx tsx scripts/prep-catalog-photos.ts
 */
import { createHash } from 'node:crypto';
import { readdir, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATEGORIES, type CategoryKey } from '../lib/catalog';

const ROOTS = { old: 'D:/Сайт/фото', new: 'D:/Новые фотки' } as const;
const OUT_DIR = join(process.cwd(), 'public', 'media', 'razdely');
const OUT_JSON = join(process.cwd(), 'data', 'content', 'category-photos.json');
const OUT_PRODUCTS = join(process.cwd(), 'data', 'content', 'product-photos.json');

/** Группа снимков вне каталога: раздел «Интерьеры АСМП». */
export const INTERIORS_KEY = 'asmp-interery';

type Tags = { cls?: 'A' | 'B' | 'C'; kind?: string; brand?: string };

type Folder = {
  root: keyof typeof ROOTS;
  path: string;
  /** Префикс имён файлов. Новый префикс — новое имя: картинки кешируются на год. */
  name: string;
  key: CategoryKey | typeof INTERIORS_KEY;
  caption: string;
  tags?: Tags;
  /** Метки по номеру кадра в папке (с единицы), когда папка смешанная. */
  tagsAt?: (index: number) => Tags;
  /** Брать только эти файлы: остальное в папке — другой раздел или неудачный кадр. */
  only?: string[];
  /** Исходник сам лежит боком или вверх ногами (EXIF не помогает). */
  rotate?: Record<string, number>;
  /** Карточки, которым все кадры папки подходят как фото исполнения. */
  products?: string[];
};

const MB = 'Mercedes-Benz';

/**
 * Папка заказчика → раздел каталога и подпись под снимками.
 *
 * Подпись берём из имени папки: она говорит ровно то, что известно про кадр.
 * Ничего сверх этого не утверждаем.
 */
const FOLDERS: Folder[] = [
  { root: 'old', path: 'АСМП/Класс А', name: 'asmp-klass-a', key: 'asmp', caption: 'АСМП класса A', tags: { cls: 'A' } },
  // Класс А с выставки: тот же Mercedes-Benz Vito, два кадра совпадают с прежней
  // папкой байт в байт и отсеиваются как повторы. Салон — в «Интерьеры АСМП».
  {
    root: 'new',
    path: 'Класс А',
    name: 'asmp-klass-a-vito',
    key: 'asmp',
    caption: 'АСМП класса A',
    tags: { cls: 'A', brand: MB },
    only: ['IMG_3732.jpeg', 'IMG_5841.JPG', 'IMG_5843.JPG', 'IMG_5844.JPG', 'IMG_5845.JPG', 'IMG_5846.JPG'],
  },
  { root: 'old', path: 'АСМП/Класс В', name: 'asmp-klass-b', key: 'asmp', caption: 'АСМП класса B', tags: { cls: 'B' } },
  { root: 'old', path: 'АСМП/Класс С', name: 'asmp-klass-c', key: 'asmp', caption: 'АСМП класса C', tags: { cls: 'C' } },

  // Интерьеры — отдельный раздел (правка от 01.10.2026), на странице АСМП их нет.
  { root: 'old', path: 'АСМП/Интерьер', name: 'asmp-salon', key: INTERIORS_KEY, caption: 'Медицинский салон' },
  {
    root: 'new',
    path: 'Класс А',
    name: 'asmp-salon-klass-a',
    key: INTERIORS_KEY,
    caption: 'Салон АСМП класса A',
    only: ['IMG_3733.jpeg', 'IMG_3734.jpeg', 'IMG_3735.jpeg', 'IMG_3736.jpeg', 'IMG_3737.jpeg', 'IMG_5847.JPG', 'IMG_5848.JPG', 'IMG_5849.JPG'],
  },

  {
    root: 'old',
    path: 'АСМП/Транспорт МГН',
    name: 'mgn',
    key: 'mgn',
    caption: 'Транспорт для маломобильных граждан',
    // Кадр снят вверх ногами (mgn-37 на сайте до 01.10.2026).
    rotate: { 'IMG_7831.JPG': 180 },
  },
  { root: 'old', path: 'Фургонгы и Спецтехника/Автомобили для ритуальных услуг', name: 'ritual', key: 'ritual', caption: 'Автомобиль для ритуальных услуг' },
  { root: 'new', path: 'Автомобили для ритуальных услуг', name: 'ritual-foton', key: 'ritual', caption: 'Автомобиль для ритуальных услуг', tags: { brand: 'Foton' } },
  {
    root: 'old',
    path: 'Фургонгы и Спецтехника/Изотермичечские фургоны',
    name: 'furgon-izotermicheskiy',
    key: 'van',
    caption: 'Изотермический фургон',
    tags: { kind: 'izotermicheskie' },
  },

  // «Передвижные пункты питания» из прежней съёмки — одна рыбная лавка; снята
  // по правке от 01.10.2026. Новые кадры автолавок — под новым префиксом.
  {
    root: 'new',
    path: 'Передвижные пункты питания',
    name: 'avtolavka-sprinter-classic',
    key: 'spec',
    caption: 'Автолавка',
    tags: { kind: 'avtolavki', brand: MB },
    only: ['DSC_0001.JPG', 'DSC_0002.JPG', 'DSC_0003.JPG', 'DSC_0004.JPG'],
    // Sprinter старого кузова с витринами — ровно эта карточка.
    products: ['avtolavka-mercedes-benz-sprinter-classic-311'],
  },
  {
    root: 'new',
    path: 'Передвижные пункты питания',
    name: 'avtolavka-sunset',
    key: 'spec',
    caption: 'Передвижной пункт питания',
    tags: { kind: 'avtolavki', brand: MB },
    // Кадр с рукой крупным планом машину не показывает — не берём.
    only: ['BA2X4024.jpg', 'BA2X4058.jpg', 'BA2X4064.jpg', 'BA2X4072.jpg', 'BA2X4214.jpg', 'BA2X4432.jpg', 'BA2X4435.jpg', 'BA2X4440.jpg', 'BA2X4449.jpg', 'BA2X4460.jpg', 'BA2X4770.jpg', 'BA2X4775.jpg'],
  },
  {
    root: 'old',
    path: 'Фургонгы и Спецтехника/Спецавтомобили и лаборатории',
    name: 'spetsavtomobil-laboratoriya',
    key: 'spec',
    caption: 'Спецавтомобиль и лаборатория',
    // 1–14 — лаборатории (дорожная на Sprinter), 15–31 — VW Crafter со
    // стоматологическим кабинетом: это медицинская служба.
    tagsAt: (i) => (i <= 14 ? { kind: 'laboratorii' } : { kind: 'medsluzhba' }),
  },
  {
    root: 'new',
    path: 'Служба крови',
    name: 'sluzhba-krovi',
    key: 'spec',
    caption: 'Мобильный комплекс службы крови',
    tags: { kind: 'medsluzhba', brand: MB },
    // DSC_00021 — тот же кадр, что DSC_0002, пересохранённый.
    only: ['DSC_0002.JPG', 'DSC_0005.JPG', 'DSC_0006.JPG', 'DSC_0008.JPG', 'DSC_0010.JPG'],
  },
];

type Photo = { src: string; caption: string; w: number; h: number } & Tags;

async function main() {
  // Каталог пересобирается целиком: иначе в нём копятся снимки из прошлых прогонов.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const byKey = new Map<string, Photo[]>();
  const byProduct: Record<string, string[]> = {};
  const seen = new Map<string, string>();
  let duplicates = 0;
  let bytes = 0;

  for (const folder of FOLDERS) {
    const dir = join(ROOTS[folder.root], folder.path);
    let files = (await readdir(dir).catch(() => [] as string[]))
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .sort();
    if (folder.only) {
      const missing = folder.only.filter((f) => !files.includes(f));
      if (missing.length) throw new Error(`${folder.path}: нет файлов ${missing.join(', ')}`);
      files = files.filter((f) => folder.only!.includes(f));
    }

    if (!files.length) {
      console.log(`  ${folder.path}: снимков нет`);
      continue;
    }

    let index = 0;

    for (const file of files) {
      const raw = await readFile(join(dir, file));
      // Повторы в папках: «— копия», «(1)» и просто пересохранённый тот же кадр.
      const hash = createHash('sha1').update(raw).digest('hex');
      if (seen.has(hash)) {
        duplicates++;
        continue;
      }
      seen.set(hash, file);

      index++;
      const turn = folder.rotate?.[file];
      // Повёрнутый кадр получает новое имя: под прежним в кеше остался бы перевёрнутый.
      const name = `${folder.name}-${String(index).padStart(2, '0')}${turn ? '-r' : ''}.webp`;
      let pipeline = sharp(raw).rotate();
      if (turn) pipeline = sharp(await pipeline.toBuffer()).rotate(turn);
      const info = await pipeline
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(join(OUT_DIR, name));

      bytes += info.size;
      const src = `/media/razdely/${name}`;
      const tags = { ...folder.tags, ...folder.tagsAt?.(index) };
      const list = byKey.get(folder.key) ?? [];
      list.push({ src, caption: folder.caption, w: info.width, h: info.height, ...tags });
      byKey.set(folder.key, list);
      for (const slug of folder.products ?? []) (byProduct[slug] ??= []).push(src);
    }

    console.log(`  ${folder.root}/${folder.path}${folder.only ? ' (отбор)' : ''}: ${index} снимков → ${folder.key}`);
  }

  const out: Record<string, Photo[]> = {};
  for (const key of [...CATEGORIES.map((c) => c.key), INTERIORS_KEY]) {
    const list = byKey.get(key);
    if (list?.length) out[key] = list;
  }

  await writeFile(OUT_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8');
  await writeFile(OUT_PRODUCTS, JSON.stringify(byProduct, null, 2) + '\n', 'utf8');

  const total = Object.values(out).reduce((n, l) => n + l.length, 0);
  console.log(`\nВсего: ${total} снимков, ${(bytes / 1024 / 1024).toFixed(1)} МБ; повторов отброшено: ${duplicates}`);
  for (const [key, list] of Object.entries(out)) {
    const title = CATEGORIES.find((c) => c.key === key)?.short ?? key;
    const tagged = list.filter((p) => p.cls || p.kind || p.brand).length;
    console.log(`  ${title}: ${list.length} (с метками: ${tagged})`);
  }
  console.log(`  к карточкам: ${Object.entries(byProduct).map(([s, l]) => `${s} — ${l.length}`).join('; ')}`);
}

main();
