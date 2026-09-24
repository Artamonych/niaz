import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { COMPANIES } from '@/lib/company';
import styles from './rekvizity.module.css';

export const metadata: Metadata = {
  title: 'Реквизиты',
  description:
    'Карточки организаций группы «НиАЗ»: ООО «ГК НиАЗ» и ООО «Нижегородский автомобильный завод» — ИНН, КПП, ОГРН, банковские реквизиты, адреса и контакты для договоров и закупок.',
  alternates: { canonical: '/rekvizity' },
};

/**
 * Карточки организаций для договоров и закупок (п. 4 запроса материалов).
 *
 * Два юрлица показаны рядом, а не одно вместо другого: группа работает обоими,
 * и закупщику важно видеть, с кем он заключает договор. Значения — моноширинным
 * и с возможностью выделить: их копируют в платёжки, а не читают.
 */
export default function Page() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Реквизиты' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Для договоров и закупок</p>
        <h1 className={styles.h1}>Реквизиты</h1>
        <p className={styles.lead}>
          Карточки организаций группы. Производство обеих — в Кстове, на площадке завода.
        </p>
      </header>

      {COMPANIES.map((company) => (
        <section key={company.key} className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.h2}>{company.short}</h2>
              <p className={styles.full}>{company.full}</p>
            </div>
            <span className={`mono ${styles.role}`}>{company.role}</span>
          </div>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

          <dl className={styles.list}>
            {company.requisites.map((row) => (
              <div key={row.label} className={styles.row}>
                <dt className={styles.label}>{row.label}</dt>
                <dd className={`mono ${styles.value}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
