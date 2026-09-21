import type { PlannedPage as Planned } from '@/lib/catalog';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './PlannedPage.module.css';

/**
 * Подраздел из меню, материалы по которому завод ещё не передал: честно
 * говорим, что страница готовится, и даём оставить заявку по теме.
 */
export function PlannedPage({ page }: { page: Planned }) {
  return (
    <div className="shell">
      <Breadcrumbs items={[page.parent, { name: page.title }]} />

      <header className={styles.head}>
        <p className="label label-deep">{page.parent.name}</p>
        <h1 className={styles.h1}>{page.title}</h1>
        <p className={styles.lead}>{page.lead}</p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <p className={styles.notice}>
        <span className={`mono ${styles.state}`}>Готовится</span>
        Описание раздела готовится к публикации. Пока оно не вышло, задайте вопрос
        через форму — специалист завода свяжется с вами.
      </p>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Заявка</p>
          <h2 className={styles.h2}>{page.title}: задать вопрос</h2>
        </div>
        <LeadForm subject={page.title} />
      </section>
    </div>
  );
}
