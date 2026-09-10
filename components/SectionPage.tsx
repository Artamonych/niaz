import Link from 'next/link';
import type { SectionIndex } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import styles from './SectionPage.module.css';

export function SectionPage({ section }: { section: SectionIndex }) {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: section.title }]} />

      <header className={styles.head}>
        <h1 className={styles.h1}>{section.title}</h1>
        <p className={styles.lead}>{section.lead}</p>
      </header>

      {section.items.length === 0 ? (
        <p className={styles.empty}>Материалы готовятся к публикации.</p>
      ) : (
        <ul className={styles.list}>
          {section.items.map((item) => (
            <li key={item.slug}>
              <Link href={`/${item.slug}/`} className={styles.item}>
                <h2 className={styles.itemTitle}>{item.title}</h2>
                {item.lead && <p className={styles.itemLead}>{item.lead}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
