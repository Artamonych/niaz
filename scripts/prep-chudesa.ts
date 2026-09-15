import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'D:/Сайт/фото/Чудеса';
const OUT = 'public/media/chudesa';

/**
 * Готовит снимки раздела «Чудеса» из исходников заказчика.
 *
 * Отбор — масштаб комплекса и решения, которых нет у серийной техники; из
 * восьми десятков кадров съёмки взяты 23. Два кадра отброшены сознательно:
 * на них армейская символика, а показать нужно конструкцию.
 *
 * Исходники лежат у заказчика (папка «фото/Чудеса»), в репозиторий не едут:
 * 50 МБ ради 1,2 МБ готовых webp. Запуск: npx tsx scripts/prep-chudesa.ts
 */
const PICK: { file: string; name: string; alt: string }[] = [
  // Мобильный госпиталь на базе городского автобуса
  { file: 'DSC_0040.JPG', name: 'gospital-01-modul-podnyat', alt: 'Автобус с поднятым модулем крыши, вид сбоку' },
  { file: 'DSC_0063.JPG', name: 'gospital-02-raskrytie', alt: 'Раскрытый модуль над крышей автобуса' },
  { file: 'DSC_0074.JPG', name: 'gospital-03-razvorachivanie', alt: 'Развёртывание комплекса на площадке' },
  { file: 'DSC_0076.JPG', name: 'gospital-04-palatka-raskladka', alt: 'Раскладка пневмокаркасного модуля рядом с автобусом' },
  { file: 'DSC_0082.JPG', name: 'gospital-05-palatka-nadutaya', alt: 'Надутый пневмокаркасный модуль, рядом люди' },
  { file: 'DSC_0087.JPG', name: 'gospital-06-kompleks', alt: 'Автобус и два пневмокаркасных модуля в развёрнутом виде' },
  { file: 'DSC_0090.JPG', name: 'gospital-07-obschiy-plan', alt: 'Общий план развёрнутого комплекса' },
  { file: 'DSC_0044.JPG', name: 'gospital-08-stykovka', alt: 'Модуль пристыкован к борту автобуса' },
  { file: 'DSC_0065.JPG', name: 'gospital-09-perehod', alt: 'Переход из салона автобуса в пневмокаркасный модуль' },
  { file: 'DSC_0068.JPG', name: 'gospital-10-nosilki', alt: 'Трёхъярусное размещение носилок в салоне' },
  { file: 'DSC_0070.JPG', name: 'gospital-11-salon', alt: 'Салон с носилками, вид вдоль прохода' },
  { file: 'DSC_0053.JPG', name: 'gospital-12-reanimaciya', alt: 'Реанимационное место с кислородной разводкой' },
  { file: 'DSC_0052.JPG', name: 'gospital-13-schit', alt: 'Электрощит и пост управления комплексом' },
  { file: 'DSC_0057.JPG', name: 'gospital-14-sanuzel', alt: 'Санузел с умывальником внутри автобуса' },
  { file: 'DSC_0083.JPG', name: 'gospital-15-interier-modulya', alt: 'Интерьер пневмокаркасного модуля с освещением' },

  // Мобильная баня на шасси «Урал»
  { file: 'PHOTO-2022-11-11-16-05-41.jpg', name: 'banya-01-obschiy-vid', alt: 'Мобильная баня на полноприводном шасси, вид спереди' },
  { file: 'PHOTO-2022-11-11-16-05-42.jpg', name: 'banya-02-vid-sboku', alt: 'Кузов-фургон мобильной бани, вид сбоку' },
  { file: 'PHOTO-2022-11-11-16-05-43-2.jpg', name: 'banya-03-topka', alt: 'Топка печи в отсеке борта: баню топят снаружи' },
  { file: 'PHOTO-2022-11-11-16-05-46.jpg', name: 'banya-04-vhod', alt: 'Вход в баню с откидной лестницей' },
  { file: 'PHOTO-2022-11-11-16-05-47.jpg', name: 'banya-05-razdevalka', alt: 'Раздевалка с лавкой и душевой кабиной' },
  { file: 'PHOTO-2022-11-11-16-05-47-5.jpg', name: 'banya-06-voda', alt: 'Водонагреватели в помывочном отделении' },
  { file: 'PHOTO-2022-11-11-16-05-48-7.jpg', name: 'banya-07-kamenka', alt: 'Каменка в парной' },
  { file: 'PHOTO-2022-11-11-16-05-48.jpg', name: 'banya-08-dver-parnoy', alt: 'Дверь парной и деревянный настил пола' },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  let bytes = 0;

  for (const { file, name } of PICK) {
    const path = join(OUT, `${name}.webp`);
    await sharp(join(SRC, file))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path);
    const meta = await sharp(path).metadata();
    bytes += (await sharp(path).toBuffer()).length;
    process.stdout.write(`${name}: ${meta.width}×${meta.height}  `);
  }

  console.log(`\nготово: ${PICK.length} снимков, ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
}

main();
