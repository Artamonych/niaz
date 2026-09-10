import Link from 'next/link';
import styles from './Breadcrumbs.module.css';

export type Crumb = { name: string; href?: string };

/** Крошки + микроразметка BreadcrumbList: у донора она была, терять нельзя. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const full = [{ name: 'Главная', href: '/' }, ...items];

  return (
    <nav aria-label="Хлебные крошки" className={styles.wrap}>
      <ol className={styles.list} itemScope itemType="https://schema.org/BreadcrumbList">
        {full.map((item, i) => (
          <li
            key={`${item.name}-${i}`}
            className={styles.item}
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {item.href ? (
              <Link href={item.href} className={styles.link} itemProp="item">
                <span itemProp="name">{item.name}</span>
              </Link>
            ) : (
              <span itemProp="name" className={styles.current}>
                {item.name}
              </span>
            )}
            <meta itemProp="position" content={String(i + 1)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
