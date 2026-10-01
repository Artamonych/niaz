import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { PhotoGrid } from '@/components/PhotoGrid';
import { interiorPhotos } from '@/lib/content';
import styles from './interery-asmp.module.css';

export const metadata: Metadata = {
  title: 'Интерьеры АСМП',
  description:
    'Медицинские салоны автомобилей скорой медицинской помощи производства Нижегородского автомобильного завода: компоновка, отделка, крепление носилок и оборудования.',
  alternates: { canonical: '/interery-asmp' },
};

/**
 * Раздел «Интерьеры АСМП» (правка заказчика от 01.10.2026).
 *
 * Салоны — из съёмки завода: папка «АСМП/Интерьер» и салоны класса A из снимков
 * от 01.10.2026 (scripts/prep-catalog-photos.ts). К карточкам и классам кадры
 * не привязаны, кроме тех, где класс известен по папке, — он и стоит в подписи.
 */
export default function InteriorsPage() {
  const photos = interiorPhotos();

  return (
    <div className="shell">
      <Breadcrumbs
        items={[
          { name: 'Продукция', href: '/produktsiya/' },
          { name: 'АСМП', href: '/avtomobili-skoroy-meditsinskoy-pomoschi/' },
          { name: 'Интерьеры' },
        ]}
      />

      <header className={styles.head}>
        <p className="label label-deep">Автомобили скорой медицинской помощи</p>
        <h1 className={styles.h1}>Интерьеры АСМП</h1>
        <p className={styles.lead}>
          Медицинские салоны, которые завод собирает в кузовах микроавтобусов: компоновка
          рабочих мест бригады, отделка, крепление носилок и оборудования. Состав салона
          определяется классом автомобиля и техническим заданием.
        </p>
      </header>

      <PhotoGrid
        title="Салоны"
        lead="Съёмка завода. Подпись говорит только то, что известно про кадр."
        photos={photos}
      />

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Салон под задачу</p>
          <h2 className={styles.h2}>Нужен салон под ваше техническое задание?</h2>
          <p className={styles.ctaLead}>
            Опишите класс автомобиля и состав оборудования — предложим компоновку и рассчитаем
            сроки. Смотрите также{' '}
            <Link href="/avtomobili-skoroy-meditsinskoy-pomoschi/" className={styles.inlineLink}>
              каталог АСМП
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Интерьеры АСМП" />
      </section>
    </div>
  );
}
