/**
 * Карточки организаций в PDF — для скачивания с «Контактов» и «Реквизитов».
 *
 * PDF собирается из lib/company.ts — тех же данных, что на странице
 * /rekvizity/, поэтому файл и страница не расходятся. До 01.10.2026 на
 * «Контактах» лежал PDF донора: адрес на Сурикова, «Росбанк», директор
 * Барканова и отменённые коды ОКВЭД — всё устарело.
 *
 * Печатает headless Chromium (тот, что ставит Playwright, или Chrome).
 * Подписи и печати в файле нет: для закупки подписанный PDF присылает завод.
 *
 * Запуск: npx tsx scripts/prep-rekvizity-pdf.ts [путь к chrome]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPANIES } from '../lib/company';

const OUT = join(process.cwd(), 'public', 'files');

/** Имя файла по ключу карточки — на эти адреса ведут ссылки сайта. */
export const PDF_NAMES: Record<string, string> = {
  gk: 'rekvizity-ooo-gk-niaz.pdf',
  niaz: 'rekvizity-ooo-niaz.pdf',
};

const CHROMES = [
  process.argv[2],
  join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium_headless_shell-1217', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter((p): p is string => !!p);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(company: (typeof COMPANIES)[number]) {
  const rows = company.requisites
    .map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Карточка организации — ${esc(company.short)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font: 10.5pt/1.45 Arial, 'Segoe UI', sans-serif; color: #111; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  .full { margin: 0 0 6mm; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; vertical-align: top; padding: 2.2mm 3mm; border-bottom: 0.3mm solid #ccc; }
  th { width: 34%; font-weight: normal; color: #555; }
  td { font-family: Consolas, 'Courier New', monospace; font-size: 10pt; }
  .note { margin-top: 8mm; font-size: 8.5pt; color: #777; }
</style></head><body>
  <h1>Карточка организации · ${esc(company.short)}</h1>
  <p class="full">${esc(company.full)}</p>
  <table>${rows}</table>
  <p class="note">Сведения с сайта com-transport.ru. ОКВЭД — по выписке из ЕГРЮЛ от 25.09.2026.</p>
</body></html>`;
}

function main() {
  const chrome = CHROMES.find((p) => existsSync(p));
  if (!chrome) throw new Error(`не найден Chromium; передайте путь первым аргументом. Искали: ${CHROMES.join(', ')}`);

  mkdirSync(OUT, { recursive: true });
  const work = join(tmpdir(), `niaz-rekvizity-${Date.now()}`);
  mkdirSync(work, { recursive: true });

  try {
    for (const company of COMPANIES) {
      const name = PDF_NAMES[company.key];
      if (!name) throw new Error(`нет имени файла для карточки «${company.key}»`);
      const page = join(work, `${company.key}.html`);
      writeFileSync(page, html(company), 'utf8');
      const target = join(OUT, name);
      execFileSync(chrome, [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${target}`,
        pathToFileURL(page).href,
      ], { stdio: 'ignore' });
      if (!existsSync(target)) throw new Error(`PDF не создан: ${target}`);
      console.log(`${company.short} → public/files/${name}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
