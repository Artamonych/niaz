import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES, MENU } from '@/lib/catalog';
import { PRODUCTS, productsOf } from '@/lib/content';
import { BusBlueprint } from '@/components/BusBlueprint';
import { LeadForm } from '@/components/LeadForm';
import { NewsCard } from '@/components/NewsCard';
import { getNewsFeed } from '@/lib/news';
import styles from './home.module.css';

const COUNTERS = [
  { n: 30, suffix: '+', k: 'лет производства' },
  { n: PRODUCTS.length, suffix: '', k: 'исполнений в каталоге' },
  { n: CATEGORIES.length, suffix: '', k: 'продуктовых линеек' },
  { n: 85, suffix: '', k: 'регионов поставок' },
];

const MARKS = ['ОТТС · ТР ТС 018/2011', 'ГОСТ 33665-2024', '44-ФЗ · 223-ФЗ'];

/**
 * Разделы завода — все три блока одной схемы: перечень того, что в разделе уже
 * есть. Текстов-описаний у завода по ним нет, поэтому ничего не сочиняем.
 * Фото есть только у инженерии, так что снимков нет ни у одного — иначе блоки
 * разной высоты и веса.
 */
const ENGINEERING = '/inzheneriya/#moshchnosti';

const TEASERS = [
  {
    label: 'Предприятие',
    title: 'О заводе',
    href: '/o-kompanii/',
    more: 'О компании',
    items: MENU.about[0].items,
  },
  {
    label: 'Сервис',
    title: 'АСМП-сервис',
    href: '/garantii/',
    more: 'Гарантии и документы',
    items: MENU.service[0].items,
  },
  {
    label: 'Собственное производство',
    title: 'Инженерия',
    href: '/inzheneriya/',
    more: 'Производственные мощности',
    // Участки со страницы «Инженерия» — оборудование подтверждено съёмкой цехов.
    items: [
      { label: 'Лазерный раскрой', href: ENGINEERING },
      { label: 'Листообработка', href: ENGINEERING },
      { label: 'Раскрой панелей на станках с ЧПУ', href: ENGINEERING },
    ],
  },
];

export default async function HomePage() {
  // Лента читается на каждый запрос — почему, см. getNewsFeed.
  const news = await getNewsFeed(3);

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

            {/*
              Первый абзац отвечает сразу двум задачам: держит поисковые запросы
              по видам техники и даёт прямой ответ, чем занят завод. Суть —
              разработка исполнения под требования заказчика; закупки по 44 и
              223-ФЗ названы как канал поставки, а не как род занятий.
            */}
            <p className={styles.heroLead}>
              Разрабатываем и производим спецтранспорт по техническому заданию:
              автомобили скорой помощи классов A, B и C по ГОСТ 33665-2024, транспорт
              для маломобильных граждан, фургоны, мобильные лаборатории. Поставка
              в том числе по 44-ФЗ и 223-ФЗ.
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

      <section className={styles.teasers}>
        <div className={`shell ${styles.teaserGrid}`}>
          {TEASERS.map((t) => (
            <article key={t.title} className={styles.teaser}>
              <div className={styles.teaserBody}>
                <p className="label label-deep">{t.label}</p>
                <h2 className={styles.teaserTitle}>
                  <Link href={t.href}>{t.title}</Link>
                </h2>
                <ul className={styles.teaserList}>
                  {t.items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
                <Link href={t.href} className={`u-underline ${styles.teaserMore}`}>
                  {t.more} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {news.length > 0 && (
        <section className={`grid-bg ${styles.newsSection}`}>
          <div className="shell">
            <div className={styles.sectionHead}>
              <h2 className={styles.h2Dark}>Новости завода</h2>
              <Link href="/novosti/" className={`u-underline ${styles.allLink}`}>
                Все новости →
              </Link>
            </div>
            <div className={`rule rule-dark ${styles.headRule}`} data-line="1" aria-hidden="true" />
            <div className={styles.newsGrid}>
              {news.map((item) => (
                <NewsCard key={item.key} item={item} tone="dark" />
              ))}
            </div>
          </div>
        </section>
      )}

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
