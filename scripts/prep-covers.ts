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
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = join(process.cwd(), 'public', 'media', 'razdely');
const OUT = join(process.cwd(), 'public', 'media', 'covers');
const MAP = join(process.cwd(), 'data', 'content', 'covers.json');

/**
 * Размер обложки: пропорция карточки на главной. Ширины 1024 хватает с запасом
 * даже на экране с удвоенной плотностью — карточка там около 580 точек. Брать
 * больше нельзя: живые снимки с площадки мельче студийных, и растянутый кадр
 * выглядит хуже честного.
 */
const W = 1024;
const H = 640;

const COVERS: { key: string; file: string; note: string }[] = [
  // Студийная визуализация на сером фоне заказчику не подошла: раздел должен
  // показывать живую машину, а не картинку из конфигуратора.
  { key: 'asmp', file: 'asmp-klass-b-11.webp', note: 'живой снимок с площадки завода' },
  { key: 'mgn', file: 'mgn-04.webp', note: 'разложенная аппарель — суть раздела видна сразу' },
  // Кадр выбран заказчиком (DSC_0007 в его папке): дорожная лаборатория в
  // профиль, надпись на борту читается.
  { key: 'spec', file: 'spetsavtomobil-laboratoriya-06.webp', note: 'дорожная лаборатория, выбор заказчика' },
  { key: 'van', file: 'furgon-izotermicheskiy-01.webp', note: 'изотермический кузов' },
  { key: 'ritual', file: 'ritual-11.webp', note: 'один из двух горизонтальных кадров серии' },
];

async function main() {
  // Папка пересобирается целиком: имена меняются вместе с содержимым.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const map: Record<string, string> = {};

  for (const { key, file, note } of COVERS) {
    const image = await sharp(join(SRC, file))
      // attention оставляет самую содержательную часть кадра — на этих
      // снимках это сама машина, а не забор и не небо.
      .resize(W, H, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 82 })
      .toBuffer();

    // Отпечаток содержимого в имени: картинки отдаются с годовым кешем, и
    // файл под прежним именем на сайте не обновится — ни у посетителя в
    // браузере, ни в кеше оптимизатора.
    const hash = createHash('sha1').update(image).digest('hex').slice(0, 8);
    const name = `${key}-${hash}.webp`;
    await writeFile(join(OUT, name), image);
    map[key] = `/media/covers/${name}`;

    console.log(`${key.padEnd(7)} ← ${file.padEnd(34)} ${W}×${H}  ${name}  (${note})`);
  }

  await writeFile(MAP, JSON.stringify(map, null, 2), 'utf8');

  console.log('\nГрузопассажирские: своей съёмки нет, обложка остаётся из каталога донора.');
}

main();
