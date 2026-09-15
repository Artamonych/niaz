/**
 * Готовит обложки разделов каталога.
 *
 * Карточка раздела широкая (3:2), а съёмка заказчика разношёрстная: студийные
 * кадры горизонтальные, съёмка с телефона — вертикальная. Если отдать такой
 * кадр карточке, браузер обрежет его по центру и от машины останется крыша.
 * Поэтому обложки режутся заранее, с выбором области по содержимому кадра.
 *
 * Кадры выбраны вручную: нужен общий план, по которому раздел узнаётся сразу,
 * и чтобы соседние карточки не выглядели одинаково — две белые машины в
 * профиль рядом читаются как одна и та же.
 *
 * Запуск: npx tsx scripts/prep-covers.ts
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = join(process.cwd(), 'public', 'media', 'razdely');
const OUT = join(process.cwd(), 'public', 'media', 'covers');

/** Ширина и высота обложки: та же пропорция, что у карточки на главной. */
const W = 1200;
const H = 750;

const COVERS: { key: string; file: string; note: string }[] = [
  { key: 'asmp', file: 'asmp-klass-b-04.webp', note: 'студийный кадр, светлый фон' },
  { key: 'mgn', file: 'mgn-04.webp', note: 'разложенная аппарель — суть раздела видна сразу' },
  { key: 'spec', file: 'punkt-pitaniya-01.webp', note: 'автолавка: цветом отличается от скорой' },
  { key: 'van', file: 'furgon-izotermicheskiy-01.webp', note: 'изотермический кузов' },
  { key: 'ritual', file: 'ritual-11.webp', note: 'один из двух горизонтальных кадров серии' },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  for (const { key, file, note } of COVERS) {
    const path = join(OUT, `${key}.webp`);
    const info = await sharp(join(SRC, file))
      // attention оставляет самую содержательную часть кадра — на этих
      // снимках это сама машина, а не забор и не небо.
      .resize(W, H, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 82 })
      .toFile(path);

    console.log(`${key.padEnd(7)} ← ${file.padEnd(34)} ${info.width}×${info.height}  (${note})`);
  }

  console.log('\nГрузопассажирские: своей съёмки нет, обложка остаётся из каталога донора.');
}

main();
