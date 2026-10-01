import Link from 'next/link';
import type { Metadata } from 'next';
import { CATEGORIES } from '@/lib/catalog';
import { PRODUCTS, productsOf } from '@/lib/content';
import { plural } from '@/lib/plural';
import { MOBILE_OFFICES_LINE } from '@/lib/projects';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import styles from './produktsiya.module.css';

export const metadata: Metadata = {
  title: 'Продукция',
  description:
    'Каталог специализированного транспорта Нижегородского автомобильного завода: автомобили скорой медицинской помощи, транспорт для маломобильных граждан, грузопассажирские автомобили, фургоны, спецавтомобили и лаборатории, жилые прицепы.',
  alternates: { canonical: '/produktsiya' },
};

export default function CatalogRootPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Продукция' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Каталог</p>
        <h1 className={styles.h1}>Продукция завода</h1>
        <p className={styles.lead}>
          {PRODUCTS.length} {plural(PRODUCTS.length, 'исполнение', 'исполнения', 'исполнений')} в {CATEGORIES.length + 1}{' '}
          {plural(CATEGORIES.length + 1, 'производственной линейке', 'производственных линейках', 'производственных линейках')}. Любое из них
          комплектуется под техническое задание заказчика.
        </p>
      </header>

      <div className={styles.grid}>
        {CATEGORIES.map((category) => {
          const items = productsOf(category.key);
          return (
            <section key={category.key} className={`u-corner ${styles.cat}`}>
              <div className={styles.catHead}>
                <span className={`mono ${styles.no}`}>{category.no}</span>
                <h2 className={styles.catTitle}>
                  <Link href={`/${category.slug}/`}>{category.title}</Link>
                </h2>
                <p className={styles.catLead}>{category.lead}</p>
              </div>

              <ul className={styles.items}>
                {items.slice(0, 6).map((item) => (
                  <li key={item.slug}>
                    <Link href={`/${item.slug}/`} className={styles.item}>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>

              <Link href={`/${category.slug}/`} className={`mono ${styles.more}`}>
                Все исполнения — {items.length} →
              </Link>
            </section>
          );
        })}

        {/* «Мобильные офисы» — направление без карточек каталога: вместо исполнений — проекты. */}
        <section className={`u-corner ${styles.cat}`}>
          <div className={styles.catHead}>
            <span className={`mono ${styles.no}`}>{String(CATEGORIES.length + 1).padStart(2, '0')}</span>
            <h2 className={styles.catTitle}>
              <Link href={`${MOBILE_OFFICES_LINE.href}/`}>{MOBILE_OFFICES_LINE.title}</Link>
            </h2>
            <p className={styles.catLead}>{MOBILE_OFFICES_LINE.lead}</p>
          </div>

          <ul className={styles.items}>
            {MOBILE_OFFICES_LINE.projects.map((project) => (
              <li key={project.id}>
                <Link href={`${MOBILE_OFFICES_LINE.href}/#${project.id}`} className={styles.item}>
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>

          <Link href={`${MOBILE_OFFICES_LINE.href}/`} className={`mono ${styles.more}`}>
            Все проекты — {MOBILE_OFFICES_LINE.projects.length} →
          </Link>
        </section>
      </div>
    </div>
  );
}
