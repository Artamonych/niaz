import { Breadcrumbs } from './Breadcrumbs';
import type { LegalBlock, LegalDocument as Doc } from '@/lib/legal/types';
import styles from './LegalDocument.module.css';

/**
 * Правовой документ: политика, согласие, соглашение.
 *
 * Вёрстка нарочно спокойная и узкая по колонке — такие тексты читают подряд,
 * а не просматривают. Таблицы оставлены таблицами: состав данных и перечень
 * файлов cookie так проверяются глазами, а не вычитываются из абзаца.
 */
function Block({ block }: { block: LegalBlock }) {
  if ('p' in block) return <p className={styles.p}>{block.p}</p>;

  if ('list' in block) {
    return (
      <ul className={styles.list}>
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if ('ol' in block) {
    return (
      <ol className={styles.ol}>
        {block.ol.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {block.table.head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalDocument({ doc }: { doc: Doc }) {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: doc.title }]} />

      <header className={styles.head}>
        <p className="label label-deep">{doc.label}</p>
        <h1 className={styles.h1}>{doc.title}</h1>
        <p className={`mono ${styles.approved}`}>Действует с {doc.approved}</p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <article className={styles.doc}>
        {doc.sections.map((section, i) => (
          <section
            key={section.title ?? i}
            id={section.id}
            className={section.part ? styles.part : styles.section}
          >
            {section.title &&
              (section.part ? (
                <h2 className={styles.h2Part}>{section.title}</h2>
              ) : (
                <h2 className={styles.h2}>{section.title}</h2>
              ))}
            {section.blocks.map((block, j) => (
              <Block key={j} block={block} />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
