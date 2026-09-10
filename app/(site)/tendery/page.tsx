import type { Metadata } from 'next';
import { CATEGORIES } from '@/lib/catalog';
import { PRODUCTS } from '@/lib/content';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import styles from './tendery.module.css';

export const metadata: Metadata = {
  title: 'Тендерам и госзаказчикам',
  description:
    'Документы для обоснования закупки спецтранспорта по 44-ФЗ и 223-ФЗ: реквизиты завода, сертификаты соответствия, гарантийная политика, шаблон технического задания.',
  alternates: { canonical: '/tendery' },
};

/**
 * Деал-рум — главный дифференциатор из ТЗ (§L2): тендерный отдел забирает
 * пакет документов сам, без звонка менеджеру.
 *
 * Файлы подставляются заказчиком: у завода они есть, но в открытом доступе
 * на действующем сайте не выложены.
 */
const DOCS = [
  {
    t: 'Карточка предприятия и реквизиты',
    note: 'ИНН, ОГРН, КПП, банковские реквизиты, юридический адрес',
    ready: false,
  },
  {
    t: 'Одобрение типа транспортного средства (ОТТС)',
    note: 'по ТР ТС 018/2011, по каждой модели',
    ready: false,
  },
  {
    t: 'Декларации и сертификаты соответствия',
    note: 'комплект по действующим исполнениям',
    ready: false,
  },
  {
    t: 'Положение о гарантийных обязательствах',
    note: 'сроки и объём гарантии завода',
    ready: true,
    href: '/polozhenie-o-garantiynyh-obyazatelstvah',
  },
  {
    t: 'Порядок обращения при гарантийном случае',
    note: 'регламент и контакты службы качества',
    ready: true,
    href: '/poryadok-obrascheniya-pri-garantiynom-sluchae',
  },
  {
    t: 'Шаблон технического задания',
    note: 'заготовка ТЗ на закупку спецтранспорта',
    ready: false,
  },
];

const STEPS = [
  {
    n: '01',
    t: 'Забираете документы',
    d: 'Комплект для обоснования закупки — без звонка и переписки с менеджером.',
  },
  {
    n: '02',
    t: 'Согласуете исполнение',
    d: 'Инженеры завода помогают собрать техническое задание под реальную задачу.',
  },
  {
    n: '03',
    t: 'Получаете расчёт',
    d: 'Коммерческое предложение со сроками производства и условиями поставки.',
  },
];

const STATS = [
  { v: String(PRODUCTS.length), k: 'исполнений в каталоге' },
  { v: String(CATEGORIES.length), k: 'производственных линеек' },
  { v: '1 день', k: 'на ответ по запросу' },
  { v: '44 · 223', k: 'федеральных закона' },
];

export default function TendersPage() {
  return (
    <>
      <div className="shell">
        <Breadcrumbs items={[{ name: 'Тендерам и госзаказчикам' }]} />
      </div>

      <section className={`grid-bg ${styles.hero}`}>
        <div className="shell">
          <p className="label">44-ФЗ · 223-ФЗ · нацрежим</p>
          <h1 className={styles.h1}>Тендерам и госзаказчикам</h1>
          <p className={styles.lead}>
            Завод-изготовитель специализированного транспорта. Собрали здесь всё, что
            тендерный отдел обычно выпрашивает по телефону: документы предприятия,
            подтверждение соответствия и гарантийные обязательства.
          </p>

          <dl className={styles.stats}>
            {STATS.map((s) => (
              <div key={s.k} className={styles.stat}>
                <dt className={`mono ${styles.statV}`}>{s.v}</dt>
                <dd className={`mono ${styles.statK}`}>{s.k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className={`shell ${styles.body}`}>
        <section className={styles.docsSection}>
          <h2 className={styles.h2}>Пакет документов для обоснования закупки</h2>
          <p className={styles.docsLead}>
            Реквизиты, сертификаты и гарантийная политика — одним комплектом, без звонка
            менеджеру. Тендерный отдел собирает обоснование сам и в своём темпе.
          </p>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

          <ul className={styles.docs}>
            {DOCS.map((doc) => {
              const body = (
                <>
                  <span className={styles.docBody}>
                    <span className={`mono ${styles.fmt}`}>{doc.ready ? 'СТР' : 'PDF'}</span>
                    <span className={styles.docTitle}>{doc.t}</span>
                    <span className={styles.docNote}>{doc.note}</span>
                  </span>
                  <span className={styles.docState}>{doc.ready ? 'Открыть' : 'По запросу'}</span>
                </>
              );

              return (
                <li key={doc.t} className={styles.doc}>
                  {doc.href ? (
                    <a href={doc.href} className={styles.docLink}>
                      {body}
                    </a>
                  ) : (
                    <span className={styles.docLink}>{body}</span>
                  )}
                </li>
              );
            })}

            <li className={styles.docsFoot}>
              <span className={`mono ${styles.docsFootNote}`}>
                Документы «по запросу» высылаем в день обращения
              </span>
              <a href="tel:88005504455" className={styles.docsFootCta}>
                Позвонить 8 800 550-44-55
              </a>
            </li>
          </ul>
        </section>

        <section className={styles.stepsSection}>
          <h2 className={styles.h2}>Как проходит закупка</h2>
          <div className={styles.steps}>
            {STEPS.map((step) => (
              <div key={step.n} className={styles.step}>
                <p className={`label label-deep ${styles.stepNo}`}>Шаг {step.n}</p>
                <h3 className={styles.stepTitle}>{step.t}</h3>
                <p className={styles.stepText}>{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.formSection} id="zapros">
          <div className={styles.formGrid}>
            <div>
              <h2 className={styles.h3}>Запросить пакет документов и КП</h2>
              <p className={styles.formLead}>
                Укажите ИНН организации — подготовим комплект сразу под вашу закупку,
                с реквизитами и спецификацией.
              </p>
              <p className={`mono ${styles.formNote}`}>
                Форма передаёт страницу и предмет запроса в CRM завода
              </p>
            </div>
            <LeadForm subject="Пакет документов для тендера" />
          </div>
        </section>
      </div>
    </>
  );
}
