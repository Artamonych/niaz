import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { PRICE_SECTIONS, type PriceTable } from '@/lib/uslugi';
import styles from './uslugi.module.css';

export const metadata: Metadata = {
  title: 'Услуги производства: фрезеровка, лазерная резка, гравировка',
  description:
    'Цены на фрезеровку на станках с ЧПУ, лазерную резку, гравировку и 3D-обработку на производстве Нижегородского автомобильного завода в Кстове: фанера, МДФ, ДСП, пластики, акрил, композит, текстолит.',
  alternates: { canonical: '/inzheneriya/uslugi' },
};

/**
 * Прайс услуг производства (правка заказчика от 24.09.2026: «от имени завода,
 * в раздел Инженерии»). Данные — lib/uslugi.ts, их собирает
 * scripts/prep-uslugi.ts из docx заказчика.
 *
 * Таблицы повторяют сетку исходника: строка — толщина, столбец — объём заказа.
 * Числа моноширинным и по правому краю: их сравнивают по столбцу.
 */
export default function ServicesPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Инженерия', href: '/inzheneriya/' }, { name: 'Услуги производства' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Инженерия</p>
        <h1 className={styles.h1}>Услуги производства</h1>
        <p className={styles.lead}>
          Фрезеровка, лазерная резка, гравировка и 3D-обработка на оборудовании завода в Кстове.
          Цена реза — за погонный метр, зависит от толщины материала и объёма заказа.
        </p>

        <nav className={styles.toc} aria-label="Разделы прайса">
          {PRICE_SECTIONS.map((s) => (
            <a key={s.key} href={`#${s.key}`} className={`u-corner mono ${styles.tocLink}`}>
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      {PRICE_SECTIONS.map((section) => (
        <section key={section.key} id={section.key} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>{section.title}</h2>
            {section.unit && <span className={`mono ${styles.unit}`}>{section.unit}</span>}
          </div>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />
          {section.note && <p className={styles.note}>{section.note}</p>}

          {section.tables && (
            <div className={styles.grid}>
              {section.tables.map((table) => (
                <PriceGrid key={table.title} table={table} />
              ))}
            </div>
          )}

          {section.items && (
            <dl className={styles.items}>
              {section.items.map((item) => (
                <div key={item.title} className={styles.item}>
                  <dt className={styles.itemTitle}>
                    {item.title}
                    {item.detail && <span className={`mono ${styles.itemDetail}`}>{item.detail}</span>}
                  </dt>
                  <dd className={`mono ${styles.itemPrice}`}>{item.price}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Расчёт заказа</p>
          <h2 className={styles.h2}>Нужна деталь по вашему чертежу?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу: материал, толщину и объём. Посчитаем стоимость и сроки. Смотрите
            также{' '}
            <Link href="/inzheneriya/" className={styles.inlineLink}>
              оборудование завода
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Услуги производства" />
      </section>
    </div>
  );
}

const NEGOTIABLE = 'договорная';

function PriceGrid({ table }: { table: PriceTable }) {
  // Столбец, где во всех строках «договорная», — это примечание, а не цены:
  // выносим его под таблицу. На телефоне он иначе уходил за край и уводил
  // вбок всю таблицу ради одного и того же слова.
  const last = table.cols.length - 1;
  const lastNegotiable = table.rows.every((r) => r.prices[last] === NEGOTIABLE);
  const cols = lastNegotiable ? table.cols.slice(0, last) : table.cols;

  return (
    <figure className={styles.table}>
      <figcaption className={styles.tableTitle}>{table.title}</figcaption>
      {/* Прокрутка только у таблицы: на узком экране страница вбок не едет. */}
      <div className={styles.scroll}>
        <table>
          <thead>
            <tr>
              <th rowSpan={2} scope="col" className={styles.thLabel}>
                {table.rowHead}
              </th>
              <th colSpan={cols.length} scope="colgroup" className={styles.thGroup}>
                Объём заказа
              </th>
            </tr>
            <tr>
              {cols.map((c) => (
                <th key={c} scope="col" className={`mono ${styles.thCol}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className={`mono ${styles.rowLabel}`}>
                  {row.label}
                </th>
                {row.prices.slice(0, cols.length).map((p, i) => (
                  <td key={i} className={`mono ${p === NEGOTIABLE ? styles.cellNeg : styles.cell}`}>
                    {p}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lastNegotiable && (
        <p className={`mono ${styles.tableNote}`}>{table.cols[last]} — цена договорная</p>
      )}
    </figure>
  );
}
