import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalog';
import { PRODUCTS, productsOf } from '@/lib/content';
import { BusBlueprint } from '@/components/BusBlueprint';
import { LeadForm } from '@/components/LeadForm';
import styles from './home.module.css';

const COUNTERS = [
  { n: 30, suffix: '+', k: 'лет производства' },
  { n: PRODUCTS.length, suffix: '', k: 'исполнений в каталоге' },
  { n: CATEGORIES.length, suffix: '', k: 'продуктовых линеек' },
  { n: 85, suffix: '', k: 'регионов поставок' },
];

const DOCS = [
  { t: 'Карточка предприятия и реквизиты', note: 'ИНН, ОГРН, КПП, банковские реквизиты' },
  { t: 'Одобрение типа транспортного средства', note: 'по ТР ТС 018/2011' },
  { t: 'Сертификаты соответствия', note: 'комплект по действующим исполнениям' },
  { t: 'Гарантийная политика', note: 'сроки, порядок обращения, сервис' },
];

const MARKS = ['ОТТС · ТР ТС 018/2011', 'ГОСТ 33665-2024', '44-ФЗ · 223-ФЗ'];

export default function HomePage() {
  return (
    <>
      <section className={`grid-bg ${styles.hero}`}>
        {/* Направляющие колонок — «чертёжный» слой поверх сетки. */}
        <div className={styles.guides} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className={`shell ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <span className={`rule ${styles.eyebrowRule}`} data-line="1" aria-hidden="true" />
              <span className="label">Завод-изготовитель спецтранспорта</span>
            </p>

            {/*
              Разбивка ступенькой — не украшение: «Специальный транспорт» это
              11.88em, в колонку героя такая строка влезает только мелким
              кеглем. Три строки держат крупный заголовок и ровный флаг слева.
            */}
            <h1 className={styles.h1}>
              Специальный
              <br />
              транспорт
              <br />
              под ваши задачи
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
              <Link href="/tendery" className={`u-corner ${styles.secondary}`}>
                Тендерам и госзаказчикам
              </Link>
            </div>

            <p className={`mono ${styles.marks}`}>
              {MARKS.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </p>
          </div>

          {/* Чертёж: рамка с угловыми маркерами, внутри — анимация листа. */}
          <div className={styles.sheet}>
            <span className={`${styles.bracket} ${styles.bracketTl}`} aria-hidden="true" />
            <span className={`${styles.bracket} ${styles.bracketTr}`} aria-hidden="true" />
            <span className={`${styles.bracket} ${styles.bracketBl}`} aria-hidden="true" />
            <span className={`${styles.bracket} ${styles.bracketBr}`} aria-hidden="true" />
            <div className={styles.sheetInner}>
              <BusBlueprint sheetTitle="СПЕЦТРАНСПОРТ" />
            </div>
          </div>
        </div>
      </section>

      <section className={`grid-bg ${styles.countersBand}`}>
        <dl className={`shell ${styles.counters}`}>
          {COUNTERS.map((c) => (
            <div key={c.k} className={styles.counter}>
              <dt className={styles.counterV}>
                <span data-count={c.n}>{c.n}</span>
                {c.suffix && <span className={styles.counterSuffix}>{c.suffix}</span>}
              </dt>
              <dd className={`mono ${styles.counterK}`}>{c.k}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`grid-bg ${styles.catsSection}`}>
        <div className="shell">
          <div className={styles.sectionHead}>
            <h2 className={styles.h2Dark}>Спецтехника</h2>
            <Link href="/produktsiya" className={`u-underline ${styles.allLink}`}>
              Весь каталог →
            </Link>
          </div>
          <div className={`rule rule-dark ${styles.headRule}`} data-line="1" aria-hidden="true" />

          <div className={styles.cats}>
            {CATEGORIES.map((c) => {
              const items = productsOf(c.key);
              const photo = items.find((p) => p.images[0])?.images[0];

              return (
                <Link key={c.key} href={`/${c.slug}`} className={`u-corner ${styles.cat}`}>
                  <span className={styles.catPhoto}>
                    {photo ? (
                      <Image
                        src={photo}
                        alt={`${c.title} — продукция завода`}
                        width={800}
                        height={500}
                        className={styles.catImg}
                      />
                    ) : (
                      <span className={`mono ${styles.catPhotoStub}`}>ФОТО ГОТОВИТСЯ</span>
                    )}
                  </span>
                  <span className={styles.catBody}>
                    <span className={`mono ${styles.catNo}`}>{c.no}</span>
                    <span className={styles.catTitle}>{c.short}</span>
                    <span className={styles.catLead}>{c.lead}</span>
                    <span className={`mono ${styles.catCount}`}>
                      {items.length} исполнений
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.tenders}>
        <div className={`shell ${styles.tendersGrid}`}>
          <div>
            <p className="label label-deep">Тендерам и госзаказчикам</p>
            <h2 className={styles.h2}>
              Пакет документов
              <br />
              для обоснования закупки
            </h2>
            <p className={styles.tendersLead}>
              Реквизиты, сертификаты и гарантийная политика — одним комплектом, без звонка
              менеджеру. Тендерный отдел собирает обоснование сам и в своём темпе.
            </p>
            <Link href="/tendery" className={styles.dark}>
              Перейти в раздел
            </Link>
          </div>

          <ul className={styles.docs}>
            {DOCS.map((d) => (
              <li key={d.t} className={styles.doc}>
                <span className={`mono ${styles.docFmt}`}>PDF</span>
                <span className={styles.docBody}>
                  <span className={styles.docTitle}>{d.t}</span>
                  <span className={styles.docNote}>{d.note}</span>
                </span>
              </li>
            ))}
            <li className={`mono ${styles.docsMore}`}>+ ещё документы в разделе</li>
          </ul>
        </div>
      </section>

      <section className={`shell ${styles.formSection}`} id="zapros">
        <div>
          <p className="label label-deep">Заявка</p>
          <h2 className={styles.h2}>Запросить коммерческое предложение</h2>
          <p className={styles.formLead}>
            Опишите задачу — подберём исполнение, рассчитаем стоимость и сроки.
            Заявка попадает напрямую в отдел продаж завода.
          </p>
          <p className={`mono ${styles.formNote}`}>Ответ в течение 1 рабочего дня</p>
        </div>
        <LeadForm />
      </section>
    </>
  );
}
