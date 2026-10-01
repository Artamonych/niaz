import Link from 'next/link';
import { Suspense } from 'react';
import { KINDS, subsectionHref, subsectionsOf, type Category, type Subsection } from '@/lib/catalog';
import { asmpClass, photosOf, productsOf, type CategoryLanding } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { CatalogGrid, CatalogGridFromUrl, type CatalogItem } from './CatalogGrid';
import { LeadForm } from './LeadForm';
import styles from './CategoryPage.module.css';

/**
 * Страница раздела каталога — или его подраздела (sub): «Автолавки», «Класс B».
 *
 * У подраздела свой заголовок и описание, а карточки и снимки отобраны под
 * него заранее; фильтр по тому же признаку на его странице не нужен. Текст
 * донора у подраздела не показываем: он про весь раздел — именно из-за него
 * «Автолавки» читались как «Спецавтомобили» (правка от 01.10.2026).
 */
export function CategoryPage({
  category,
  landing,
  sub,
}: {
  category: Category;
  landing: CategoryLanding;
  sub?: Subsection;
}) {
  const kinds = KINDS[category.key] ?? [];
  const subKind = sub && 'kind' in sub.filter ? sub.filter.kind : undefined;
  const subCls = sub && 'cls' in sub.filter ? sub.filter.cls : undefined;

  const items: CatalogItem[] = productsOf(category.key)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      chassis: p.chassis,
      brand: p.brand,
      cls: asmpClass(p.title),
      kinds: kinds.filter((k) => k.match(p)).map((k) => k.key),
      specCount: p.spec.length,
      image: p.images[0],
    }))
    .filter((i) => (!subKind || i.kinds.includes(subKind)) && (!subCls || i.cls === subCls));

  // Своя съёмка завода по этому разделу — она честнее фотографий старого сайта.
  const photos = photosOf(category.key).filter(
    (p) => (!subKind || p.kind === subKind) && (!subCls || p.cls === subCls),
  );

  const grid = {
    items,
    // На странице класса фильтр по классу лишний, на странице вида — по виду.
    showClass: category.key === 'asmp' && !subCls,
    kinds: subKind ? [] : kinds.map(({ key, label }) => ({ key, label })),
    photos,
    photosLead:
      'Съёмка завода. Подписи говорят только то, что известно про кадр: исполнение по снимку не определить, поэтому фотографии показаны на уровне раздела.',
  };

  const subs = sub ? [] : subsectionsOf(category.key);

  return (
    <div className="shell">
      <Breadcrumbs
        items={
          sub
            ? [
                { name: 'Продукция', href: '/produktsiya/' },
                { name: category.short, href: `/${category.slug}/` },
                { name: sub.short },
              ]
            : [{ name: 'Продукция', href: '/produktsiya/' }, { name: category.short }]
        }
      />

      <header className={styles.head}>
        <span className={`mono ${styles.no}`}>{category.no}</span>
        <h1 className={styles.h1}>{sub ? sub.title : landing.title || category.title}</h1>
        <p className={styles.lead}>{sub ? sub.lead : landing.lead || category.lead}</p>

        <div className={styles.actions}>
          <Link href="#zapros" className={`u-corner ${styles.ghost}`}>
            Подобрать под ТЗ
          </Link>
          {sub && (
            <Link href={`/${category.slug}/`} className={`u-corner ${styles.ghost}`}>
              Весь раздел «{category.short}»
            </Link>
          )}
        </div>

        {subs.length > 0 && (
          <nav className={styles.subs} aria-label="Подразделы">
            {subs.map((s) => (
              <Link key={s.slug} href={`${subsectionHref(s)}/`} className={`u-corner mono ${styles.subLink}`}>
                {s.short}
              </Link>
            ))}
            {/* Салоны АСМП — отдельный раздел (правка от 01.10.2026). */}
            {category.key === 'asmp' && (
              <Link href="/interery-asmp/" className={`u-corner mono ${styles.subLink}`}>
                Интерьеры
              </Link>
            )}
          </nav>
        )}
      </header>

      {/*
        Текст раздела с донора: очищенная разметка (scripts/clean-html.ts).
        Стоит до каталога — это вводная часть страницы, а не примечание.
      */}
      {!sub && landing.body && (
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: landing.body }} />
      )}

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      {/* Запасной вариант — та же сетка без фильтра: он и уходит в HTML. */}
      <Suspense fallback={<CatalogGrid {...grid} />}>
        <CatalogGridFromUrl {...grid} />
      </Suspense>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Подбор исполнения</p>
          <h2 className={styles.h2}>Не нашли нужную комплектацию?</h2>
          <p className={styles.ctaLead}>
            Завод собирает технику под техническое задание. Опишите задачу — инженеры
            предложат исполнение и рассчитают сроки.
          </p>
        </div>
        <LeadForm subject={sub ? sub.title : category.title} />
      </section>
    </div>
  );
}
