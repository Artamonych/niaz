import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Готовит снимки штучных проектов: «Уникальные проекты» и «Мобильные офисы».
 *
 * Отбор ручной: из съёмки берутся кадры, где видна конструкция и решения,
 * без повторов, крупных планов фар и беспорядка цеха. Из госпиталя два кадра
 * отброшены сознательно: на них армейская символика, а показать нужно
 * конструкцию.
 *
 * Пишет webp и манифест data/content/projects-media.json (имя → адрес и
 * размеры): страницы берут размеры оттуда, а не из констант в коде.
 *
 * Исходники лежат у заказчика, в репозиторий не едут.
 * Запуск: npx tsx scripts/prep-projects.ts
 */

const OLD = 'D:/Сайт/фото/Чудеса';
const NEW = 'D:/Новые фотки';
const MAP = join(process.cwd(), 'data', 'content', 'projects-media.json');

type Pick = { dir: string; file: string; name: string };

const GROUPS: { out: string; picks: Pick[] }[] = [
  {
    // Уникальные проекты. Каталог /media/chudesa — исторический, раздел до
    // 25.09.2026 назывался «Чудеса»; имена файлов не меняем: кеш на год.
    out: 'chudesa',
    picks: [
      // Мобильный госпиталь на базе городского автобуса
      ...[
        ['DSC_0040.JPG', 'gospital-01-modul-podnyat'],
        ['DSC_0063.JPG', 'gospital-02-raskrytie'],
        ['DSC_0074.JPG', 'gospital-03-razvorachivanie'],
        ['DSC_0076.JPG', 'gospital-04-palatka-raskladka'],
        ['DSC_0082.JPG', 'gospital-05-palatka-nadutaya'],
        ['DSC_0087.JPG', 'gospital-06-kompleks'],
        ['DSC_0090.JPG', 'gospital-07-obschiy-plan'],
        ['DSC_0044.JPG', 'gospital-08-stykovka'],
        ['DSC_0065.JPG', 'gospital-09-perehod'],
        ['DSC_0068.JPG', 'gospital-10-nosilki'],
        ['DSC_0070.JPG', 'gospital-11-salon'],
        ['DSC_0053.JPG', 'gospital-12-reanimaciya'],
        ['DSC_0052.JPG', 'gospital-13-schit'],
        ['DSC_0057.JPG', 'gospital-14-sanuzel'],
        ['DSC_0083.JPG', 'gospital-15-interier-modulya'],
      ].map(([file, name]) => ({ dir: OLD, file, name })),

      // Мобильная баня на шасси «Урал»
      ...[
        ['PHOTO-2022-11-11-16-05-41.jpg', 'banya-01-obschiy-vid'],
        ['PHOTO-2022-11-11-16-05-42.jpg', 'banya-02-vid-sboku'],
        ['PHOTO-2022-11-11-16-05-43-2.jpg', 'banya-03-topka'],
        ['PHOTO-2022-11-11-16-05-46.jpg', 'banya-04-vhod'],
        ['PHOTO-2022-11-11-16-05-47.jpg', 'banya-05-razdevalka'],
        ['PHOTO-2022-11-11-16-05-47-5.jpg', 'banya-06-voda'],
        ['PHOTO-2022-11-11-16-05-48-7.jpg', 'banya-07-kamenka'],
        ['PHOTO-2022-11-11-16-05-48.jpg', 'banya-08-dver-parnoy'],
      ].map(([file, name]) => ({ dir: OLD, file, name })),

      // Автомобиль сопровождения велокоманды (снимки от 01.10.2026)
      ...[
        ['DSC_0057.JPG', 'velo-01-obschiy-vid'],
        ['DSC_0058.JPG', 'velo-02-speredi'],
        ['DSC_0056.JPG', 'velo-03-salon-dver'],
        ['DSC_0047.JPG', 'velo-04-kresla'],
        ['DSC_0043.JPG', 'velo-05-ryad-kresel'],
        ['DSC_0044.JPG', 'velo-06-salon'],
        ['DSC_0050.JPG', 'velo-07-televizor'],
        ['DSC_0052.JPG', 'velo-08-polki'],
        ['DSC_0038.JPG', 'velo-09-otsek'],
        ['DSC_0059.JPG', 'velo-10-otsek-velosiped'],
        ['DSC_0060.JPG', 'velo-11-derzhatel-kolesa'],
        ['DSC_0061.JPG', 'velo-12-krepleniya'],
      ].map(([file, name]) => ({ dir: `${NEW}/Merc_NEW_велосипед`, file, name })),

      // Мобильный комплекс службы крови (снимки от 01.10.2026; DSC_00021 —
      // пересохранённый DSC_0002, не берём)
      ...[
        ['DSC_0002.JPG', 'krov-01-obschiy-vid'],
        ['DSC_0005.JPG', 'krov-02-kresla'],
        ['DSC_0006.JPG', 'krov-03-salon'],
        ['DSC_0008.JPG', 'krov-04-prohod'],
        ['DSC_0010.JPG', 'krov-05-holodilniki'],
      ].map(([file, name]) => ({ dir: `${NEW}/Служба крови`, file, name })),
    ],
  },
  {
    out: 'mobilnye-ofisy',
    picks: [
      // «VIP новый Sprinter»
      ...[
        ['DSC_0160.JPG', 'ofis-1-01-speredi'],
        ['DSC_0161.JPG', 'ofis-1-02-sboku'],
        ['DSC_0163.JPG', 'ofis-1-03-szadi'],
        ['DSC_0187.JPG', 'ofis-1-04-profil'],
        ['DSC_0166.JPG', 'ofis-1-05-dver'],
        ['DSC_0164.JPG', 'ofis-1-06-zadnie-dveri'],
        ['DSC_0169.JPG', 'ofis-1-07-salon'],
        ['DSC_0171.JPG', 'ofis-1-08-kresla'],
        ['DSC_0173.JPG', 'ofis-1-09-televizor'],
        ['DSC_0175.JPG', 'ofis-1-10-prohod'],
        ['DSC_0178.JPG', 'ofis-1-11-konsol'],
        ['DSC_0181.JPG', 'ofis-1-12-stolik'],
        ['DSC_0174.JPG', 'ofis-1-13-audio'],
      ].map(([file, name]) => ({ dir: `${NEW}/VIP/VIP новый Sprinter`, file, name })),

      // «VIP черный MERCEDES»
      ...[
        ['DSC_0147.JPG', 'ofis-2-01-speredi'],
        ['DSC_0193.JPG', 'ofis-2-02-sboku'],
        ['DSC_0192.JPG', 'ofis-2-03-szadi'],
        ['DSC_0200.JPG', 'ofis-2-04-dver'],
        ['DSC_0201.JPG', 'ofis-2-05-stupen'],
        ['DSC_0208.JPG', 'ofis-2-06-divan-stol'],
        ['DSC_0156.JPG', 'ofis-2-07-stol-kresla'],
        ['DSC_0170.JPG', 'ofis-2-08-stol'],
        ['DSC_0164.JPG', 'ofis-2-09-kresla'],
        ['DSC_0174.JPG', 'ofis-2-10-prohod'],
        ['DSC_0210.JPG', 'ofis-2-11-mediakonsol'],
        ['DSC_0157.JPG', 'ofis-2-12-kreslo'],
        ['DSC_0153.JPG', 'ofis-2-13-skladnoy-stol'],
      ].map(([file, name]) => ({ dir: `${NEW}/VIP/VIP черный MERCEDES`, file, name })),

      // «VIP черный с багажником рюкзак»
      ...[
        ['PHOTO-2023-03-06-11-18-00-2.jpg', 'ofis-3-01-speredi'],
        ['IMG_2568.jpg', 'ofis-3-02-speredi-den'],
        ['IMG_2574.jpg', 'ofis-3-03-szadi'],
        ['PHOTO-2023-03-06-11-18-00-3.jpg', 'ofis-3-04-szadi-profil'],
        ['20231204_184137.jpg', 'ofis-3-05-dver'],
        ['20231204_192321.jpg', 'ofis-3-06-zadnie-dveri'],
        ['20231204_192441.jpg', 'ofis-3-07-salon'],
        ['20231204_192453.jpg', 'ofis-3-08-divan'],
        ['20231204_192509.jpg', 'ofis-3-09-potolok'],
        ['20231204_192554.jpg', 'ofis-3-10-kresla-stol'],
        ['20231204_192659.jpg', 'ofis-3-11-stolik'],
        ['20231204_192645.jpg', 'ofis-3-12-pult'],
        ['IMG_2572.jpg', 'ofis-3-13-kresla-den'],
      ].map(([file, name]) => ({ dir: `${NEW}/VIP/VIP черный с багажником рюкзак`, file, name })),
    ],
  },
];

async function main() {
  const map: Record<string, { src: string; w: number; h: number }> = {};
  let bytes = 0;

  for (const group of GROUPS) {
    const out = join('public', 'media', group.out);
    await mkdir(out, { recursive: true });

    for (const { dir, file, name } of group.picks) {
      if (map[name]) throw new Error(`имя повторяется: ${name}`);
      const info = await sharp(join(dir, file))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(join(out, `${name}.webp`));
      bytes += info.size;
      map[name] = { src: `/media/${group.out}/${name}.webp`, w: info.width, h: info.height };
    }
    console.log(`${group.out}: ${group.picks.length} снимков`);
  }

  await writeFile(MAP, JSON.stringify(map, null, 2) + '\n', 'utf8');
  console.log(`готово: ${Object.keys(map).length} снимков, ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
}

main();
