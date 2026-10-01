import Image from 'next/image';
import Link from 'next/link';
import type { StaticPage } from '@/lib/content';
import type { GalleryGroup } from '@/lib/gallery';
import { plural } from '@/lib/plural';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './GalleryIndex.module.css';

/** Сколько кадров группы показать здесь; остальные — на странице раздела. */
const PREVIEW = 8;

/**
 * Раздел «Галерея» — съёмка завода по разделам сайта (lib/gallery.ts).
 *
 * До 01.10.2026 здесь была витрина страниц старого сайта по маркам шасси;
 * фото старого сайта сняты, и витрина собрана заново из своей съёмки. У группы
 * превью и переход в раздел, где лежат все кадры.
 */
export function GalleryIndex({ page, groups }: { page: StaticPage; groups: GalleryGroup[] }) {
  const total = groups.reduce((n, g) => n + g.photos.length, 0);

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: page.title }]} />

      <header className={styles.head}>
        <h1 className={styles.h1}>{page.title}</h1>
        <p className={styles.lead}>
          Съёмка завода по разделам: {total} {plural(total, 'снимок', 'снимка', 'снимков')} выпущенной
          техники, салонов и штучных проектов.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.href} className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.h2}>
              <Link href={group.href}>{group.title}</Link>
            </h2>
            <span className={`mono ${styles.count}`}>
              {group.photos.length} {plural(group.photos.length, 'снимок', 'снимка', 'снимков')}
            </span>
          </div>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

          <div className={styles.grid}>
            {group.photos.slice(0, PREVIEW).map((photo) => (
              <figure key={photo.src} className={styles.card}>
                <Image
                  src={photo.src}
                  alt={`${photo.caption} — производство ООО «Нижегородский автомобильный завод»`}
                  width={photo.w}
                  height={photo.h}
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 33vw, 280px"
                  className={styles.img}
                  loading="lazy"
                />
                <figcaption className={`mono ${styles.caption}`}>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>

          {group.photos.length > PREVIEW && (
            <Link href={group.href} className={`u-underline ${styles.more}`}>
              Все снимки раздела «{group.title}» →
            </Link>
          )}
        </section>
      ))}

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Вопрос заводу</p>
          <h2 className={styles.ctaTitle}>Нужна такая же машина?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу — подберём исполнение под неё и рассчитаем сроки.
          </p>
        </div>
        <LeadForm subject="Галерея" />
      </section>
    </div>
  );
}
