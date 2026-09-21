import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import styles from './inzheneriya.module.css';

export const metadata: Metadata = {
  title: 'Инженерия и производство',
  description:
    'Производственные мощности Нижегородского автомобильного завода: раскрой панелей, лазерная резка, листообработка, станки с ЧПУ. Криволинейный раскрой, мебель и интерьер для автомобилей и прицепов, 3D-формы и оснастка.',
  alternates: { canonical: '/inzheneriya' },
};

/**
 * Раздел из карты сайта заказчика. Собран на том, что подтверждено съёмкой
 * цехов: подписи называют только оборудование, читаемое на самих кадрах.
 * Конструкторский центр и дизайн-центр по правкам от 21.09.2026 стоят первыми;
 * их подразделы и тексты завод передаст сам, пока это заглушки.
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

/** Услуги производства — формулировки завода из правок от 21.09.2026. */
const SERVICES = [
  'Криволинейный раскрой листовых материалов на станках с ЧПУ',
  'Изготовление мебели и элементов интерьера для автомобилей и прицепов',
  'Изготовление 3D-форм и оснастки',
];

/** Центры инженерии: страницы есть, материалы завод ещё не передал. */
const CENTERS = [
  { t: 'Конструкторский центр', d: 'разработка исполнений под техническое задание', href: '/konstruktorskiy-tsentr/' },
  { t: 'Дизайн-центр', d: 'проработка внешнего вида и планировки салона', href: '/dizayn-tsentr/' },
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
        <ul className={styles.pending}>
          {CENTERS.map((c) => (
            <li key={c.t}>
              <Link href={c.href} className={styles.pendingItem}>
                <span className={styles.pendingTitle}>{c.t}</span>
                <span className={styles.pendingText}>{c.d}</span>
                <span className={`mono ${styles.pendingState}`}>Готовится</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} id="moshchnosti">
        <h2 className={styles.h2}>Производственные мощности</h2>

        <ul className={styles.equipment}>
          {EQUIPMENT.map((e) => (
            <li key={e.t} className={styles.equipmentItem}>
              <p className={`mono ${styles.equipmentTitle}`}>{e.t}</p>
              <p className={styles.equipmentText}>{e.d}</p>
            </li>
          ))}
        </ul>

        <h3 className={styles.h3} id="uslugi">
          Услуги
        </h3>
        <ul className={styles.pending}>
          {SERVICES.map((t) => (
            <li key={t} className={styles.pendingItem}>
              <span className={styles.pendingTitle}>{t}</span>
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
                sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 640px"
                priority={i < 2}
              />
              <figcaption className={`mono ${styles.caption}`}>{s.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Задача под заказ</p>
          <h2 className={styles.h2}>Нужна техника, которой нет в каталоге?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу — конструкторы завода предложат исполнение на подходящем шасси
            и рассчитают сроки. Смотрите также{' '}
            <Link href="/produktsiya/" className={styles.inlineLink}>
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
