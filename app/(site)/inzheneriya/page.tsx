import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import styles from './inzheneriya.module.css';

export const metadata: Metadata = {
  title: 'Инженерия и производство',
  description:
    'Производственные мощности Нижегородского автомобильного завода: участки раскроя панелей, лазерной резки и листообработки, станки с ЧПУ.',
  alternates: { canonical: '/inzheneriya' },
};

/**
 * Раздел из карты сайта заказчика. Собран на том, что подтверждено съёмкой
 * цехов: подписи называют только оборудование, читаемое на самих кадрах.
 * Три других подраздела карты — конструкторский центр, дизайн-центр и
 * перечень услуг — ждут текста завода, см. BACKLOG.md.
 */
const SHOPS = [
  {
    src: '/proizvodstvo/uchastok-raskroya-obschiy-vid.jpg',
    caption: 'Участок раскроя панелей, общий вид',
  },
  {
    src: '/proizvodstvo/uchastok-raskroya-paneley.jpg',
    caption: 'Раскрой панелей: станки с ЧПУ и склад листа',
  },
  {
    src: '/proizvodstvo/chpu-raskroy-sendvich-paneley.jpg',
    caption: 'Раскрой сэндвич-панелей на станке с ЧПУ',
  },
  {
    src: '/proizvodstvo/portalnyy-stanok-chpu.jpg',
    caption: 'Портальный фрезерный станок с ЧПУ',
  },
  {
    src: '/proizvodstvo/lazernyy-kompleks-penta.jpg',
    caption: 'Лазерный раскройный комплекс Penta Laser SWING VII 3015',
  },
  {
    src: '/proizvodstvo/penta-swing-stol-zagruzki.jpg',
    caption: 'Penta Laser SWING VII 3015: стол загрузки листа',
  },
  {
    src: '/proizvodstvo/optovolokonnyy-lazer.jpg',
    caption: 'Оптоволоконный лазерный станок раскроя листа',
  },
  {
    src: '/proizvodstvo/lazernyy-stanok-wattsan.jpg',
    caption: 'Лазерный гравировально-раскройный станок Wattsan',
  },
  {
    src: '/proizvodstvo/uchastok-listoobrabotki.jpg',
    caption: 'Участок листообработки',
  },
  {
    src: '/proizvodstvo/gilotinnye-nozhnitsy-lvd.jpg',
    caption: 'Гильотинные ножницы LVD',
  },
  {
    src: '/proizvodstvo/listogibochnyy-press-lvd.jpg',
    caption: 'Листогибочный пресс LVD PPEB',
  },
];

/** Оборудование, читаемое на табличках станков — без домыслов о парке. */
const EQUIPMENT = [
  { t: 'Лазерный раскрой', d: 'Penta Laser SWING VII 3015, оптоволоконный станок, Wattsan' },
  { t: 'Листообработка', d: 'гильотинные ножницы LVD, листогибочный пресс LVD PPEB' },
  { t: 'Раскрой панелей', d: 'портальные станки с ЧПУ Beaver 3021AVLT8 и 2130ZW' },
];

/** Подразделы карты сайта, для которых завод ещё не передал материалы. */
const PENDING = [
  { t: 'Конструкторский центр', d: 'разработка исполнений под техническое задание' },
  { t: 'Дизайн-центр', d: 'проработка внешнего вида и планировки салона' },
  { t: 'Предоставляемые услуги', d: 'переоборудование, восстановление, модернизация' },
];

export default function EngineeringPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Инженерия' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Собственное производство</p>
        <h1 className={styles.h1}>Инженерия</h1>
        <p className={styles.lead}>
          Кузовные модули, обшивка салона и элементы оснащения изготавливаются на заводе
          в Кстово: раскрой листа и панелей, лазерная резка, гибка. Ниже — участки
          производства и оборудование, на котором собирается техника из каталога.
        </p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <section className={styles.section}>
        <h2 className={styles.h2}>Производственные мощности</h2>

        <ul className={styles.equipment}>
          {EQUIPMENT.map((e) => (
            <li key={e.t} className={styles.equipmentItem}>
              <p className={`mono ${styles.equipmentTitle}`}>{e.t}</p>
              <p className={styles.equipmentText}>{e.d}</p>
            </li>
          ))}
        </ul>

        <div className={styles.gallery}>
          {SHOPS.map((s, i) => (
            <figure key={s.src} className={styles.shot}>
              <Image
                src={s.src}
                alt={`${s.caption} — производство ООО «Нижегородский автомобильный завод»`}
                width={1600}
                height={1067}
                className={styles.photo}
                sizes="(max-width: 700px) 100vw, 50vw"
                priority={i < 2}
              />
              <figcaption className={`mono ${styles.caption}`}>{s.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Готовится к публикации</h2>
        <p className={styles.pendingLead}>
          Эти подразделы предусмотрены картой сайта. Материалы завода по ним ещё не
          переданы — как только появятся описания и цифры, страницы будут опубликованы.
        </p>
        <ul className={styles.pending}>
          {PENDING.map((p) => (
            <li key={p.t} className={styles.pendingItem}>
              <span className={styles.pendingTitle}>{p.t}</span>
              <span className={styles.pendingText}>{p.d}</span>
              <span className={`mono ${styles.pendingState}`}>Готовится</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Задача под заказ</p>
          <h2 className={styles.h2}>Нужна техника, которой нет в каталоге?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу — конструкторы завода предложат исполнение на подходящем шасси
            и рассчитают сроки. Смотрите также{' '}
            <Link href="/produktsiya" className={styles.inlineLink}>
              каталог продукции
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Инженерия и производство" />
      </section>
    </div>
  );
}
