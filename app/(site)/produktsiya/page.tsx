import Link from 'next/link';
import type { Metadata } from 'next';
import { CATEGORIES } from '@/lib/catalog';
import { PRODUCTS, productsOf } from '@/lib/content';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import styles from './produktsiya.module.css';

export const metadata: Metadata = {
  title: 'Продукция',
  description:
    'Каталог специализированного транспорта Нижегородского автомобильного завода: автомобили скорой медицинской помощи, транспорт для маломобильных граждан, грузопассажирские автомобили, фургоны, спецавтомобили и лаборатории.',
  alternates: { canonical: '/produktsiya' },
};

export default function CatalogRootPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Продукция' }]} />

      <header className={styles.head}>
        <p className="label">Каталог</p>
        <h1 className={styles.h1}>Продукция завода</h1>
        <p className={styles.lead}>
          {PRODUCTS.length} исполнений в шести производственных линейках. Любое из них
          комплектуется под техническое задание заказчика.
        </p>
      </header>

      <div className={styles.grid}>
        {CATEGORIES.map((category) => {
          const items = productsOf(category.key);
          return (
            <section key={category.key} className={styles.cat}>
              <div className={styles.catHead}>
                <span className={`mono ${styles.no}`}>{category.no}</span>
                <h2 className={styles.catTitle}>
                  <Link href={`/${category.slug}`}>{category.title}</Link>
                </h2>
                <p className={styles.catLead}>{category.lead}</p>
              </div>

              <ul className={styles.items}>
                {items.slice(0, 6).map((item) => (
                  <li key={item.slug}>
                    <Link href={`/${item.slug}`} className={styles.item}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link href={`/${category.slug}`} className={`mono ${styles.more}`}>
                Все исполнения — {items.length} →
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
