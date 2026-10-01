import Image from 'next/image';
import type { CategoryPhoto } from '@/lib/content';
import { plural } from '@/lib/plural';
import styles from './PhotoGrid.module.css';

/**
 * Снимки своей съёмки плитками: фото раздела в каталоге и раздел «Интерьеры АСМП».
 *
 * Без состояния: в каталоге снимки отбирает тот же фильтр, что и карточки
 * (CatalogGrid), сюда приходит уже отобранный список.
 */
export function PhotoGrid({
  title,
  lead,
  photos,
  empty,
}: {
  title: string;
  lead?: string;
  photos: CategoryPhoto[];
  /** Текст, когда фильтр не оставил ни одного снимка. Не задан — секции нет. */
  empty?: string;
}) {
  if (!photos.length && !empty) return null;

  return (
    <section className={styles.photos}>
      <div className={styles.head}>
        <h2 className={styles.h2}>{title}</h2>
        <span className={`mono ${styles.count}`}>{photos.length} {plural(photos.length, 'снимок', 'снимка', 'снимков')}</span>
      </div>
      {lead && <p className={styles.lead}>{lead}</p>}

      {photos.length ? (
        <div className={styles.grid}>
          {photos.map((photo, i) => (
            <figure key={photo.src} className={styles.photo}>
              <Image
                src={photo.src}
                alt={`${photo.caption} — производство ООО «Нижегородский автомобильный завод»`}
                width={photo.w}
                height={photo.h}
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 340px"
                className={styles.img}
                loading={i < 3 ? 'eager' : 'lazy'}
              />
              <figcaption className={`mono ${styles.caption}`}>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </section>
  );
}
