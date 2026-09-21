import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { KINDS, type Category } from '@/lib/catalog';
import { asmpClass, photosOf, productsOf, type CategoryLanding } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { CatalogGrid, CatalogGridFromUrl, type CatalogItem } from './CatalogGrid';
import { LeadForm } from './LeadForm';
import styles from './CategoryPage.module.css';

export function CategoryPage({
  category,
  landing,
}: {
  category: Category;
  landing: CategoryLanding;
}) {
  const kinds = KINDS[category.key] ?? [];
  const items: CatalogItem[] = productsOf(category.key).map((p) => ({
    slug: p.slug,
    title: p.title,
    chassis: p.chassis,
    brand: p.brand,
    cls: asmpClass(p.title),
    kinds: kinds.filter((k) => k.match(p)).map((k) => k.key),
    specCount: p.spec.length,
    image: p.images[0],
  }));

  const grid = {
    items,
    showClass: category.key === 'asmp',
    kinds: kinds.map(({ key, label }) => ({ key, label })),
  };

  // Своя съёмка завода по этому разделу — она честнее фотографий старого сайта.
  const photos = photosOf(category.key);

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Продукция', href: '/produktsiya/' }, { name: category.short }]} />

      <header className={styles.head}>
        <span className={`mono ${styles.no}`}>{category.no}</span>
        <h1 className={styles.h1}>{landing.title || category.title}</h1>
        <p className={styles.lead}>{landing.lead || category.lead}</p>

        <div className={styles.actions}>
          <Link href="/tendery/" className={`u-corner ${styles.ghost}`}>
            Документы для закупки
          </Link>
          <Link href="#zapros" className={`u-corner ${styles.ghost}`}>
            Подобрать под ТЗ
          </Link>
        </div>
      </header>

      {/*
        Текст раздела с донора: очищенная разметка (scripts/clean-html.ts).
        Стоит до каталога — это вводная часть страницы, а не примечание.
      */}
      {landing.body && (
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: landing.body }} />
      )}

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      {/* Запасной вариант — та же сетка без фильтра: он и уходит в HTML. */}
      <Suspense fallback={<CatalogGrid {...grid} />}>
        <CatalogGridFromUrl {...grid} />
      </Suspense>

      {photos.length > 0 && (
        <section className={styles.photos}>
          <div className={styles.photosHead}>
            <h2 className={styles.h2}>Фотографии раздела</h2>
            <span className={`mono ${styles.photosCount}`}>{photos.length} снимков</span>
          </div>
          <p className={styles.photosLead}>
            Съёмка завода. Подписи говорят только то, что известно про кадр: исполнение по
            снимку не определить, поэтому фотографии показаны на уровне раздела.
          </p>

          <div className={styles.photoGrid}>
            {photos.map((photo, i) => (
              <figure key={photo.src} className={styles.photo}>
                <Image
                  src={photo.src}
                  alt={`${photo.caption} — производство ООО «Нижегородский автомобильный завод»`}
                  width={photo.w}
                  height={photo.h}
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 340px"
                  className={styles.photoImg}
                  loading={i < 3 ? 'eager' : 'lazy'}
                />
                <figcaption className={`mono ${styles.photoCaption}`}>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

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
