import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalog';
import { PRODUCTS, productsOf } from '@/lib/content';
import { LeadForm } from '@/components/LeadForm';
import styles from './home.module.css';

const COUNTERS = [
  { v: '30+', k: 'лет производства' },
  { v: String(PRODUCTS.length), k: 'исполнений в каталоге' },
  { v: '6', k: 'продуктовых линеек' },
  { v: '85', k: 'регионов поставок' },
];

const DOCS = [
  { t: 'Карточка предприятия и реквизиты', note: 'ИНН, ОГРН, КПП, банковские реквизиты' },
  { t: 'Одобрение типа транспортного средства', note: 'по ТР ТС 018/2011' },
  { t: 'Сертификаты соответствия', note: 'комплект по действующим исполнениям' },
  { t: 'Гарантийная политика', note: 'сроки, порядок обращения, сервис' },
];

export default function HomePage() {
  return (
    <>
      <section className={`grid-bg ${styles.hero}`}>
        <div className={`shell ${styles.heroInner}`}>
          <p className="label">Завод-изготовитель спецтранспорта</p>
          <h1 className={styles.h1}>
            Специальный транспорт
            <br />
            под задачу заказчика
          </h1>
          <p className={styles.heroLead}>
            Автомобили скорой медицинской помощи, транспорт для маломобильных граждан,
            грузопассажирские автомобили, фургоны и мобильные лаборатории. Собственное
            производство и комплектация под техническое задание.
          </p>
          <div className={styles.heroActions}>
            <Link href="/produktsiya" className={styles.primary}>
              Каталог продукции
            </Link>
            <Link href="/tendery" className={styles.secondary}>
              Тендерам и госзаказчикам
            </Link>
          </div>

          <dl className={styles.counters}>
            {COUNTERS.map((c) => (
              <div key={c.k} className={styles.counter}>
                <dt className={`mono ${styles.counterV}`}>{c.v}</dt>
                <dd className={styles.counterK}>{c.k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`shell ${styles.section}`}>
        <div className={styles.sectionHead}>
          <p className="label">Продукция</p>
          <h2 className={styles.h2}>Шесть производственных линеек</h2>
        </div>

        <div className={styles.cats}>
          {CATEGORIES.map((c) => (
            <Link key={c.key} href={`/${c.slug}`} className={styles.cat}>
              <span className={`mono ${styles.catNo}`}>{c.no}</span>
              <h3 className={styles.catTitle}>{c.title}</h3>
              <p className={styles.catLead}>{c.lead}</p>
              <span className={`mono ${styles.catCount}`}>
                {productsOf(c.key).length} исполнений
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`grid-bg ${styles.dark}`}>
        <div className={`shell ${styles.darkGrid}`}>
          <div>
            <p className="label">Тендерам</p>
            <h2 className={styles.h2Dark}>Пакет документов для обоснования закупки</h2>
            <p className={styles.darkLead}>
              Реквизиты, сертификаты и гарантийная политика — одним комплектом, без звонка
              менеджеру. Тендерный отдел собирает обоснование сам и в своём темпе.
            </p>
            <Link href="/tendery" className={styles.primary}>
              Перейти в раздел
            </Link>
          </div>

          <ul className={styles.docs}>
            {DOCS.map((d) => (
              <li key={d.t} className={styles.doc}>
                <span className={`mono ${styles.docFmt}`}>PDF</span>
                <span>
                  <span className={styles.docTitle}>{d.t}</span>
                  <span className={styles.docNote}>{d.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`shell ${styles.section}`} id="zapros">
        <div className={styles.formGrid}>
          <div>
            <p className="label">Заявка</p>
            <h2 className={styles.h2}>Запросить коммерческое предложение</h2>
            <p className={styles.formLead}>
              Опишите задачу — подберём исполнение, рассчитаем стоимость и сроки.
              Заявка попадает напрямую в отдел продаж завода.
            </p>
          </div>
          <LeadForm />
        </div>
      </section>
    </>
  );
}
