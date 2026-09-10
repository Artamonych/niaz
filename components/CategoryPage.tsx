import Link from 'next/link';
import type { Category } from '@/lib/catalog';
import { asmpClass, chassisBrand, productsOf, type CategoryLanding } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { CatalogGrid, type CatalogItem } from './CatalogGrid';
import { LeadForm } from './LeadForm';
import styles from './CategoryPage.module.css';

export function CategoryPage({
  category,
  landing,
}: {
  category: Category;
  landing: CategoryLanding;
}) {
  const items: CatalogItem[] = productsOf(category.key).map((p) => ({
    slug: p.slug,
    title: p.title,
    chassis: p.chassis,
    brand: chassisBrand(p.chassis),
    cls: asmpClass(p.title),
    specCount: p.spec.length,
    image: p.images[0],
  }));

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Продукция', href: '/produktsiya' }, { name: category.short }]} />

      <header className={styles.head}>
        <span className={`mono ${styles.no}`}>{category.no}</span>
        <h1 className={styles.h1}>{landing.title || category.title}</h1>
        <p className={styles.lead}>{landing.lead || category.lead}</p>

        <div className={styles.actions}>
          <Link href="/tendery" className={`u-corner ${styles.ghost}`}>
            Документы для закупки
          </Link>
          <Link href="#zapros" className={`u-corner ${styles.ghost}`}>
            Подобрать под ТЗ
          </Link>
        </div>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <CatalogGrid items={items} showClass={category.key === 'asmp'} />

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Подбор исполнения</p>
          <h2 className={styles.h2}>Не нашли нужную комплектацию?</h2>
          <p className={styles.ctaLead}>
            Завод собирает технику под техническое задание. Опишите задачу — инженеры
            предложат исполнение и рассчитают сроки.
          </p>
        </div>
        <LeadForm subject={category.title} />
      </section>
    </div>
  );
}
