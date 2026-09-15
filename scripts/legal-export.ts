/**
 * Выгружает правовые документы сайта в Markdown — для передачи юристу и сборки
 * Word-версии. Источник один: lib/legal/*, чтобы напечатанный документ и текст
 * на сайте не разошлись.
 *
 * Запуск: npx tsx scripts/legal-export.ts [папка]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PERSONAL_DATA_DOC } from '../lib/legal/personal-data';
import { COOKIE_DOC } from '../lib/legal/cookie';
import type { LegalDocument } from '../lib/legal/types';

const OUT = process.argv[2] ?? join(process.cwd(), '..');

function toMarkdown(doc: LegalDocument): string {
  const out: string[] = [`# ${doc.title}`, '', `Действует с ${doc.approved}`, ''];

  for (const section of doc.sections) {
    if (section.title) {
      out.push(section.part ? `## ${section.title}` : `### ${section.title}`, '');
    }

    for (const block of section.blocks) {
      if ('p' in block) {
        out.push(block.p, '');
      } else if ('list' in block) {
        out.push(...block.list.map((i) => `- ${i}`), '');
      } else if ('ol' in block) {
        out.push(...block.ol.map((i, n) => `${n + 1}. ${i}`), '');
      } else {
        const { head, rows } = block.table;
        out.push(`| ${head.join(' | ')} |`);
        out.push(`|${head.map(() => '---').join('|')}|`);
        out.push(...rows.map((r) => `| ${r.join(' | ')} |`), '');
      }
    }
  }

  return out.join('\n');
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const files: [string, LegalDocument][] = [
    ['НиАЗ — политика обработки персональных данных.md', PERSONAL_DATA_DOC],
    ['НиАЗ — политика в отношении файлов cookie.md', COOKIE_DOC],
  ];

  for (const [name, doc] of files) {
    const path = join(OUT, name);
    const text = toMarkdown(doc);
    await writeFile(path, text, 'utf8');
    console.log(`${name}: ${text.length.toLocaleString('ru-RU')} знаков`);
  }
}

main();
