import type { StaticPage } from '@/lib/content';
import { PARTNERS } from '@/lib/partners';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './PartnersPage.module.css';

/**
 * Раздел «Партнёры».
 *
 * У донора страница пустая — весь её смысл лежал в семи дочерних списках
 * дилеров. Списки устарели вместе с марками, поэтому раздел собран заново:
 * плитки с названиями, без логотипов (правка от 24.09.2026).
 *
 * Плитка держится на типографике, как таблички на чертеже: номер позиции
 * моноширинным, под ним линия, под линией — марка крупно.
 */
export function PartnersPage({ page }: { page: StaticPage }) {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: page.title }]} />

      <header className={styles.head}>
        <p className="label label-deep">Марки</p>
        <h1 className={styles.h1}>{page.title}</h1>
        <p className={styles.lead}>
          Марки базовых шасси и автомобилей, на которых завод строит свои исполнения.
        </p>
      </header>

      <ul className={styles.grid}>
        {PARTNERS.map((partner) => (
          <li key={partner.name} className={`u-corner ${styles.tile}`}>
            <span className={`mono ${styles.no}`}>{partner.no}</span>
            <span className={styles.rule} aria-hidden="true" />
            <span className={styles.name}>
              {partner.name}
              {partner.note && <span className={`mono ${styles.note}`}>{partner.note}</span>}
            </span>
          </li>
        ))}
      </ul>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Вопрос заводу</p>
          <h2 className={styles.ctaTitle}>Нужна машина на конкретном шасси?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу — подберём базу и исполнение под неё.
          </p>
        </div>
        <LeadForm subject="Партнёры" />
      </section>
    </div>
  );
}
