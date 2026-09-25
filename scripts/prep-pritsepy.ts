/**
 * Готовит чертежи раздела «Прицепы».
 *
 * Фотографий построенных прицепов заказчик не публикует (качество съёмки его
 * не устроило, решение от 24.09.2026), поэтому раздел показан чертежами из
 * конструкторской документации завода — письма от 23.09.2026.
 *
 * Чертежи чёрным по белому, а сайт тёмный. Чистый белый лист в тёмной вёрстке
 * слепит, поэтому белое поле заменяется светло-серой «бумагой»: чертёж
 * накладывается на неё умножением — белое становится цветом бумаги, линии и
 * заливки остаются как были. Белые поля исходников (лист 1600×1280, рисунок
 * занимает полосу посередине) обрезаются, затем даётся ровный отступ.
 *
 * Два вида выхода:
 *   card  — карточка каталога и обложка раздела: ровно 16:10, как фото;
 *   sheet — лист в разделе «Чертежи» карточки: своя пропорция, ширина до 1600,
 *           чтобы размерные числа читались.
 *
 * Исходники лежат в папке проекта «фото/прицепы», в репозиторий не едут.
 * Запуск: npx tsx scripts/prep-pritsepy.ts
 */
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = join(process.cwd(), '..', 'фото', 'прицепы');
const OUT = join(process.cwd(), 'public', 'media', 'pritsepy');
const MAP = join(process.cwd(), 'data', 'content', 'pritsepy-media.json');

/** Цвет «бумаги»: холодный светло-серый, в тон графиту сайта. */
const PAPER = { r: 0xe3, g: 0xe8, b: 0xeb };

const CARD = { w: 1600, h: 1000, pad: 90 };
const SHEET = { w: 1600, pad: 64 };

/**
 * bold — для чистой линейной графики без заливок: линии в 1 px при уменьшении
 * до плитки главной (около 290 точек) растворяются в бумаге. Лёгкое размытие
 * расширяет штрих, затемнение возвращает ему цвет.
 */
const PICK: { key: string; file: string; kind: 'card' | 'sheet'; bold?: boolean }[] = [
  // Передвижной жилой комплекс
  { key: 'kompleks-card', file: '20128_v1.jpg', kind: 'card' },
  { key: 'kompleks-plan', file: '20128_3.jpg', kind: 'sheet' },
  { key: 'kompleks-karavan', file: '20128_1.jpg', kind: 'sheet' },
  { key: 'kompleks-fahverk', file: '20128_2.jpg', kind: 'sheet' },

  // Прицеп-кемпер
  { key: 'kemper-card', file: '20129_1.jpg', kind: 'card', bold: true },
  { key: 'kemper-plan', file: '20129_3.jpg', kind: 'sheet' },
  { key: 'kemper-razrez-a2', file: '20129_4.jpg', kind: 'sheet' },
  { key: 'kemper-razrez-a1', file: '20129_2.jpg', kind: 'sheet' },
];

/** Чертёж без белых полей, на белом, вписанный в заданную рамку. */
async function drawing(file: string, maxW: number, maxH: number, bold = false) {
  const trimmed = await sharp(join(SRC, file))
    .flatten({ background: '#ffffff' })
    .trim({ background: '#ffffff', threshold: 12 })
    .toBuffer();
  const fitted = sharp(trimmed).resize(maxW, maxH, { fit: 'inside', withoutEnlargement: false });
  // Белое должно остаться ровно белым, иначе поле рисунка разойдётся по тону
  // с полем листа: сдвиг подобран так, что 255 · 2,4 − 357 = 255. Размытие —
  // с точностью float: целочисленное ядро libvips сажает чистый белый до 251.
  if (bold) fitted.blur({ sigma: 1.6, precision: 'float' }).linear(2.4, -357);
  return fitted.toBuffer({ resolveWithObject: true });
}

/** Кладёт белый лист с рисунком на бумагу: умножение красит только белое. */
async function onPaper(white: Buffer, w: number, h: number) {
  return sharp({ create: { width: w, height: h, channels: 3, background: PAPER } })
    .composite([{ input: white, blend: 'multiply' }])
    .webp({ quality: 88 })
    .toBuffer();
}

async function render(file: string, kind: 'card' | 'sheet', bold = false) {
  if (kind === 'card') {
    const { data, info } = await drawing(file, CARD.w - CARD.pad * 2, CARD.h - CARD.pad * 2, bold);
    const left = Math.round((CARD.w - info.width) / 2);
    const top = Math.round((CARD.h - info.height) / 2);
    const white = await sharp(data)
      .extend({
        left,
        right: CARD.w - info.width - left,
        top,
        bottom: CARD.h - info.height - top,
        background: '#ffffff',
      })
      .toBuffer();
    return { image: await onPaper(white, CARD.w, CARD.h), w: CARD.w, h: CARD.h };
  }

  const inner = SHEET.w - SHEET.pad * 2;
  const { data, info } = await drawing(file, inner, 10_000);
  const h = info.height + SHEET.pad * 2;
  const white = await sharp(data)
    .extend({ left: SHEET.pad, right: SHEET.pad, top: SHEET.pad, bottom: SHEET.pad, background: '#ffffff' })
    .toBuffer();
  return { image: await onPaper(white, SHEET.w, h), w: SHEET.w, h };
}

async function main() {
  // Папка пересобирается целиком: имена меняются вместе с содержимым.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const map: Record<string, { src: string; w: number; h: number }> = {};
  let bytes = 0;

  for (const { key, file, kind, bold } of PICK) {
    const { image, w, h } = await render(file, kind, bold);
    // Отпечаток в имени: картинки отдаются с годовым кешем (next.config.ts).
    const hash = createHash('sha1').update(image).digest('hex').slice(0, 8);
    const name = `${key}-${hash}.webp`;
    await writeFile(join(OUT, name), image);
    map[key] = { src: `/media/pritsepy/${name}`, w, h };
    bytes += image.length;
    console.log(`${key.padEnd(18)} ← ${file.padEnd(14)} ${kind.padEnd(5)} ${w}×${h}  ${(image.length / 1024).toFixed(0)} КБ`);
  }

  await writeFile(MAP, JSON.stringify(map, null, 2) + '\n', 'utf8');
  console.log(`\nготово: ${PICK.length} файлов, ${(bytes / 1024).toFixed(0)} КБ`);
}

main();
