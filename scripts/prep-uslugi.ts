/**
 * Прайс услуг производства: docx заказчика → data/content/uslugi-tseny.json.
 *
 * Прайс будет обновляться, поэтому он не переписан на страницу руками, а
 * разбирается из исходного документа. Цены переносятся как есть; скрипт только
 * приводит подписи к одному виду («3 - 6» → «3–6 мм», «18 руб/м.п.» → «18»).
 * На незнакомом заголовке или ячейке он падает, а не угадывает: лучше
 * остановиться, чем опубликовать чужую цифру не в той строке.
 *
 * Строки, где цена растёт с объёмом заказа, выводятся в конце — это почти
 * всегда опечатка в исходнике. Скрипт их не правит: цена — решение завода.
 *
 * Запуск: npx tsx scripts/prep-uslugi.ts [путь к docx]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import type { PriceItem, PriceSection, PriceTable } from '../lib/uslugi';

const SRC = process.argv[2] ?? join(process.cwd(), '..', 'Прайс_лист_работы_ЧПУ_ИП_Москалева_Л.docx');
const OUT = join(process.cwd(), 'data', 'content', 'uslugi-tseny.json');

// --- docx: zip → word/document.xml → абзацы и таблицы по порядку -------------

function readZipEntry(buf: Buffer, name: string): string {
  let eocd = buf.length - 22;
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let off = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(off + 10);
    const size = buf.readUInt32LE(off + 20);
    const fl = buf.readUInt16LE(off + 28);
    const xl = buf.readUInt16LE(off + 30);
    const cl = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    if (buf.toString('utf8', off + 46, off + 46 + fl) === name) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    off += 46 + fl + xl + cl;
  }
  throw new Error(`в архиве нет ${name}`);
}

const textOf = (xml: string) =>
  (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) ?? [])
    .map((t) => t.replace(/<[^>]+>/g, ''))
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** Таблицы документа по порядку: строки → ячейки, абзацы ячейки через « / ». */
function tablesOf(xml: string): string[][][] {
  return (xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []).map((tbl) =>
    (tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []).map((tr) =>
      (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
        (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map(textOf).filter(Boolean).join(' / '),
      ),
    ),
  );
}

// --- нормализация подписей -------------------------------------------------

/** Материал из заголовка «Стоимость фрезеровки Фанеры (рублей/метр)». */
const MILLING: Record<string, string> = {
  'фанеры': 'Фанера',
  'композита': 'Композит',
  'мдф': 'МДФ',
  'дсп': 'ДСП',
  'osb (осп)': 'OSB (ОСП)',
  'дерева': 'Дерево',
  'пвх': 'ПВХ',
  'акрила, оргстекла': 'Акрил, оргстекло',
  'пэт': 'ПЭТ',
  'полистирола': 'Полистирол',
  'монолитного поликарбоната': 'Монолитный поликарбонат',
  'капролона (полиамид, па-6)': 'Капролон (полиамид, ПА-6)',
  'капролона(полиамид, па-6)': 'Капролон (полиамид, ПА-6)',
  'фторопласта': 'Фторопласт',
  'гетинакса': 'Гетинакс',
  'текстолита': 'Текстолит',
};

function millingMaterial(heading: string): string {
  const m = heading.match(/^Стоим\S* фрезеровки (.+?) \(рублей\/метр\)$/i);
  const name = m && MILLING[m[1].toLowerCase()];
  if (!name) throw new Error(`незнакомый материал фрезеровки: «${heading}»`);
  return name;
}

/** «3 - 6», «3 -6», «4-6» → «3–6 мм»; «40» → «40 мм». */
function thickness(raw: string): string {
  const t = raw.replace(/\s*-\s*/g, '–').replace(/\s*мм$/, '').trim();
  if (!/^\d+(,\d+)?(–\d+(,\d+)?)?$/.test(t)) throw new Error(`незнакомая толщина: «${raw}»`);
  return `${t} мм`;
}

/** Строка лазерной резки: «ПЭТ / 0,75 мм», «Картон / до 200 гр/кв.м». */
function laserLabel(cell: string): string {
  const raw = cell.split(' / ').pop()!.trim();
  if (/^\d+(,\d+)? ?мм$/.test(raw)) return raw.replace(/ ?мм$/, ' мм');
  // Невидимый «соединитель слов» после косой черты: без него браузер рвёт
  // единицу при переносе — «г/» на одной строке, «м²» на другой.
  if (raw === 'до 200 гр/кв.м') return 'до 200 г/⁠м²';
  if (raw === 'от 200 гр/кв.м Гофрокартон до 6мм') return 'от 200 г/⁠м², гофрокартон до 6 мм';
  throw new Error(`незнакомая строка лазерной резки: «${cell}»`);
}

function num(cell: string): string {
  const t = cell.replace(/\s*руб\/м\.п\.$/, '').trim();
  if (t === 'Цена договорная') return 'договорная';
  if (!/^\d+(,\d+)?$/.test(t)) throw new Error(`не цена: «${cell}»`);
  return t;
}

const MILLING_COLS = ['до 500 м', 'до 1000 м', 'до 2999 м', 'от 3000 м'];
const LASER_COLS = ['до 100 м', '100–500 м', '500–1000 м', '1000–2000 м', 'от 2000 м'];

// --- сборка ----------------------------------------------------------------

function main() {
  const tables = tablesOf(readZipEntry(readFileSync(SRC), 'word/document.xml'));
  const nonEmpty = (r: string[]) => r.some(Boolean);

  const milling: PriceTable[] = [];
  const laser: PriceTable[] = [];
  let model: PriceItem[] = [];
  let engraving: PriceItem[] = [];

  for (const t of tables) {
    const head = t[0];
    const body = t.slice(1).filter(nonEmpty);

    if (head[1] === 'толщина, мм:') {
      milling.push({
        title: millingMaterial(body[0][0]),
        rowHead: 'Толщина',
        cols: MILLING_COLS,
        rows: body.map((r) => ({ label: thickness(r[1]), prices: r.slice(2, 6).map(num) })),
      });
    } else if (head[1] === 'Наименование' && head[2] === 'Стоимость') {
      model = body.map((r) => ({
        title: r[1].replace(/3Д\s*/g, '3D-'),
        price: r[2].replace(/руб\./g, '₽').replace(' - 1 час', ' за час').replace('₽ зависит', '₽, зависит'),
      }));
    } else if (/^(Глубина|Грубина)/.test(head[2] ?? '')) {
      // «Грубина» — опечатка исходника; ловим оба написания, чтобы исправленный
      // прайс не уронил скрипт.
      engraving = body.map((r) => ({
        title: r[1] === 'Гравировка оргстекла' ? 'Оргстекло' : r[1],
        price: `${r[3].replace(/руб\./, '₽')} за см²`,
        detail: `глубина ${r[2]}`,
      }));
    } else if (t[1]?.[1]?.startsWith('Цена при тираже')) {
      const rows = t.slice(3).filter((r) => r[1] && !r.some((c) => c.includes('Цены указаны')));
      const labels = rows.map((r) => laserLabel(r[0]));
      laser.push({
        title: head[0],
        // У картона строки — плотность, а не толщина: шапка «Толщина» была бы неправдой.
        rowHead: labels.every((l) => l.endsWith(' мм')) ? 'Толщина' : 'Материал',
        cols: LASER_COLS,
        rows: rows.map((r, i) => ({ label: labels[i], prices: r.slice(1, 6).map(num) })),
      });
    } else {
      throw new Error(`незнакомая таблица: ${JSON.stringify(head)}`);
    }
  }

  const sections: PriceSection[] = [
    { key: 'frezerovka', title: 'Фрезеровка на станках с ЧПУ', unit: '₽ за погонный метр', tables: milling },
    { key: 'model-3d', title: '3D-фрезеровка и моделирование', items: model },
    {
      key: 'lazernaya-rezka',
      title: 'Лазерная резка',
      unit: '₽ за погонный метр',
      note: 'Цены указаны без учёта стоимости материала.',
      tables: laser,
    },
    { key: 'gravirovka', title: 'Лазерная гравировка', items: engraving },
  ];

  writeFileSync(OUT, JSON.stringify(sections, null, 2) + '\n', 'utf8');

  const cells = [...milling, ...laser].reduce((n, t) => n + t.rows.length * t.cols.length, 0);
  console.log(
    `фрезеровка: ${milling.length} материалов · лазерная резка: ${laser.length} · 3D: ${model.length} · гравировка: ${engraving.length}`,
  );
  console.log(`ячеек с ценой: ${cells} → ${OUT}`);

  // Цена за метр должна падать или стоять с ростом объёма. Рост — повод
  // переспросить завод, а не повод править цифру самим.
  const suspicious: string[] = [];
  for (const [kind, list] of [['фрезеровка', milling], ['лазер', laser]] as const) {
    for (const t of list) {
      for (const r of t.rows) {
        const v = r.prices.filter((p) => p !== 'договорная').map((p) => Number(p.replace(',', '.')));
        if (v.some((x, i) => i > 0 && x > v[i - 1])) {
          suspicious.push(`${kind} · ${t.title}, ${r.label}: ${r.prices.join(' / ')}`);
        }
      }
    }
  }
  if (suspicious.length) {
    console.log(`\nЦена растёт с объёмом — проверить у завода:\n  ${suspicious.join('\n  ')}`);
  }
}

main();
