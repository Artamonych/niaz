import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import styles from './chudesa.module.css';

export const metadata: Metadata = {
  title: 'Чудеса — уникальные проекты завода',
  description:
    'Штучные проекты Нижегородского автомобильного завода: мобильный госпиталь на базе городского автобуса и мобильная баня на полноприводном шасси.',
  alternates: { canonical: '/chudesa' },
};

/**
 * Раздел штучных проектов.
 *
 * Правило то же, что в «Инженерии»: пишем только то, что подтверждено съёмкой.
 * Ни вместимости, ни сроков, ни заказчиков — этих данных завод не передавал, а
 * придумывать их в разделе, который смотрят госзаказчики, нельзя. Появятся
 * характеристики — добавим.
 */
type Project = {
  id: string;
  title: string;
  base: string;
  lead: string;
  /** Решения, которые видно на снимках. */
  features: { t: string; d: string }[];
  shots: { src: string; caption: string; w: number; h: number; wide?: boolean }[];
};

const PROJECTS: Project[] = [
  {
    id: 'mobilnyy-gospital',
    title: 'Мобильный госпиталь',
    base: 'База: городской автобус',
    lead:
      'Автобус, который разворачивается в госпиталь прямо на площадке. Модуль крыши поднимается, ' +
      'к бортам пристыковываются пневмокаркасные модули, и вместо одной машины получается комплекс ' +
      'с местами для пострадавших, реанимацией, санузлом и собственным электропитанием.',
    features: [
      { t: 'Подъёмный модуль крыши', d: 'Верхняя часть кузова поднимается, увеличивая высоту салона' },
      { t: 'Пневмокаркасные модули', d: 'Пристыковываются к бортам, переход — изнутри салона' },
      { t: 'Трёхъярусные носилки', d: 'Места для пострадавших вдоль обоих бортов' },
      { t: 'Реанимационное место', d: 'Разводка кислорода и медицинского оборудования' },
      { t: 'Санузел с душем', d: 'Автономный блок внутри кузова' },
      { t: 'Пост управления', d: 'Электрощит комплекса с органами управления' },
    ],
    shots: [
      { src: 'gospital-07-obschiy-plan', caption: 'Развёрнутый комплекс: автобус и два пневмокаркасных модуля', wide: true, w: 1024, h: 681 },
      { src: 'gospital-01-modul-podnyat', caption: 'Модуль крыши поднят — вид сбоку', w: 1024, h: 681 },
      { src: 'gospital-02-raskrytie', caption: 'Раскрытие модуля над крышей', w: 1024, h: 681 },
      { src: 'gospital-03-razvorachivanie', caption: 'Развёртывание на площадке', w: 1024, h: 681 },
      { src: 'gospital-04-palatka-raskladka', caption: 'Раскладка пневмокаркасного модуля', w: 1024, h: 681 },
      { src: 'gospital-05-palatka-nadutaya', caption: 'Модуль надут, рядом расчёт', w: 1024, h: 681 },
      { src: 'gospital-06-kompleks', caption: 'Модуль пристыкован, работает электростанция', w: 1024, h: 681 },
      { src: 'gospital-08-stykovka', caption: 'Модуль пристыкован к борту', w: 1024, h: 681 },
      { src: 'gospital-09-perehod', caption: 'Переход из салона в модуль', w: 1024, h: 681 },
      { src: 'gospital-10-nosilki', caption: 'Трёхъярусное размещение носилок', w: 1024, h: 681 },
      { src: 'gospital-11-salon', caption: 'Салон вдоль прохода', w: 1024, h: 681 },
      { src: 'gospital-12-reanimaciya', caption: 'Реанимационное место', w: 1024, h: 681 },
      { src: 'gospital-13-schit', caption: 'Электрощит и пост управления', w: 1024, h: 681 },
      { src: 'gospital-15-interier-modulya', caption: 'Внутри пневмокаркасного модуля', w: 1024, h: 681 },
      { src: 'gospital-14-sanuzel', caption: 'Санузел с умывальником', w: 681, h: 1024 },
    ],
  },
  {
    id: 'mobilnaya-banya',
    title: 'Мобильная баня',
    base: 'База: полноприводное шасси «Урал»',
    lead:
      'Кузов-фургон, внутри которого настоящая баня: парная с каменкой, помывочная с ' +
      'водонагревателями и раздевалка. Печь топится снаружи — через люк в борту, так что дрова ' +
      'и огонь остаются за пределами помещения.',
    features: [
      { t: 'Наружная топка', d: 'Печь загружается из отсека в борту кузова' },
      { t: 'Парная с каменкой', d: 'Полки и обшивка из дерева, окно с отдельным стеклопакетом' },
      { t: 'Помывочная', d: 'Душ и водонагреватели внутри кузова' },
      { t: 'Раздевалка', d: 'Лавка и деревянный настил пола' },
      { t: 'Откидная лестница', d: 'Вход в кузов с высокого полноприводного шасси' },
    ],
    shots: [
      { src: 'banya-01-obschiy-vid', caption: 'Баня на полноприводном шасси', wide: true, w: 1280, h: 958 },
      { src: 'banya-02-vid-sboku', caption: 'Кузов-фургон, вид сбоку', w: 1280, h: 958 },
      { src: 'banya-03-topka', caption: 'Топка печи в отсеке борта', w: 958, h: 1280 },
      { src: 'banya-04-vhod', caption: 'Вход с откидной лестницей', w: 958, h: 1280 },
      { src: 'banya-05-razdevalka', caption: 'Раздевалка и душевая', w: 958, h: 1280 },
      { src: 'banya-06-voda', caption: 'Водонагреватели помывочной', w: 958, h: 1280 },
      { src: 'banya-07-kamenka', caption: 'Каменка в парной', w: 958, h: 1280 },
      { src: 'banya-08-dver-parnoy', caption: 'Дверь парной, настил пола', w: 958, h: 1280 },
    ],
  },
];

const url = (name: string) => `/media/chudesa/${name}.webp`;

export default function ChudesaPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Чудеса' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Уникальные проекты завода</p>
        <h1 className={styles.h1}>Чудеса</h1>
        <p className={styles.lead}>
          Машины, которых нет в каталоге: их собирали под конкретную задачу, по одной штуке.
          Здесь то, что видно на съёмке, — конструкция, компоновка и решения, ради которых эти
          проекты и делались.
        </p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      {PROJECTS.map((project) => (
        <section key={project.id} className={styles.project} id={project.id}>
          <div className={styles.projectHead}>
            <div>
              <h2 className={styles.h2}>{project.title}</h2>
              <p className={`mono ${styles.base}`}>{project.base}</p>
            </div>
            <p className={styles.projectLead}>{project.lead}</p>
          </div>

          <ul className={styles.features}>
            {project.features.map((f) => (
              <li key={f.t} className={styles.feature}>
                <p className={`mono ${styles.featureTitle}`}>{f.t}</p>
                <p className={styles.featureText}>{f.d}</p>
              </li>
            ))}
          </ul>

          <div className={styles.gallery}>
            {project.shots.map((shot, i) => (
              <figure
                key={shot.src}
                className={shot.wide ? `${styles.shot} ${styles.shotWide}` : styles.shot}
              >
                <Image
                  src={url(shot.src)}
                  alt={`${shot.caption} — ${project.title}, ООО «Нижегородский автомобильный завод»`}
                  width={shot.w}
                  height={shot.h}
                  sizes={
                    shot.wide
                      ? '(max-width: 1200px) 100vw, 1200px'
                      : '(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 400px'
                  }
                  className={styles.photo}
                  priority={i === 0}
                />
                <figcaption className={`mono ${styles.caption}`}>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Штучная работа</p>
          <h2 className={styles.h2}>Нужна машина под вашу задачу?</h2>
          <p className={styles.ctaLead}>
            Характеристики этих проектов и условия — по запросу: каждый собирался под своего
            заказчика. Опишите задачу, и конструкторы предложат исполнение. Серийные машины —
            в{' '}
            <Link href="/produktsiya/" className={styles.inlineLink}>
              каталоге продукции
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Уникальный проект" />
      </section>
    </div>
  );
}
