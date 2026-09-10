import type { Metadata } from 'next';
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

export default function TendersPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Тендерам и госзаказчикам' }]} />

      <header className={styles.head}>
        <p className="label">44-ФЗ · 223-ФЗ</p>
        <h1 className={styles.h1}>Тендерам и госзаказчикам</h1>
        <p className={styles.lead}>
          Завод-изготовитель специализированного транспорта. Собрали здесь всё, что
          тендерный отдел обычно выпрашивает по телефону: документы предприятия,
          подтверждение соответствия и гарантийные обязательства.
        </p>
      </header>

      <section className={styles.steps}>
        {STEPS.map((step) => (
          <div key={step.n} className={styles.step}>
            <span className={`mono ${styles.stepNo}`}>{step.n}</span>
            <h2 className={styles.stepTitle}>{step.t}</h2>
            <p className={styles.stepText}>{step.d}</p>
          </div>
        ))}
      </section>

      <section className={styles.docsSection}>
        <div className={styles.docsHead}>
          <p className="label">Пакет документов</p>
          <h2 className={styles.h2}>Документы для обоснования закупки</h2>
        </div>

        <ul className={styles.docs}>
          {DOCS.map((doc) => {
            const body = (
              <>
                <span className={`mono ${styles.fmt}`}>{doc.ready ? 'СТР' : 'PDF'}</span>
                <span className={styles.docBody}>
                  <span className={styles.docTitle}>{doc.t}</span>
                  <span className={styles.docNote}>{doc.note}</span>
                </span>
                <span className={`mono ${styles.docState}`}>
                  {doc.ready ? 'Открыть' : 'По запросу'}
                </span>
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
        </ul>

        <p className={styles.docsNote}>
          Документы, отмеченные «по запросу», высылаем в день обращения — оставьте
          заявку ниже или позвоните{' '}
          <a href="tel:88005504455" className="mono">8 800 550-44-55</a>.
        </p>
      </section>

      <section className={styles.formSection} id="zapros">
        <div>
          <p className="label">Запрос</p>
          <h2 className={styles.h2}>Запросить пакет документов и КП</h2>
          <p className={styles.formLead}>
            Укажите ИНН организации — подготовим комплект сразу под вашу закупку,
            с реквизитами и спецификацией.
          </p>
        </div>
        <LeadForm subject="Пакет документов для тендера" />
      </section>
    </div>
  );
}
