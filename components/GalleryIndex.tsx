import Image from 'next/image';
import Link from 'next/link';
import type { GalleryGroup, StaticPage } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './GalleryIndex.module.css';

/**
 * Раздел «Галерея» (п. 20 бэклога).
 *
 * Три десятка страниц со снимками лежали вне навигации: попасть на них можно
 * было только из поиска, хотя в sitemap.xml они есть. Здесь они собраны в
 * витрину по маркам шасси — марка берётся из данных донора.
 *
 * Плитки со снимком, а не список заголовков: у этих страниц нет текста,
 * и единственное, чем они различаются, — сами фотографии.
 */
export function GalleryIndex({ page, groups }: { page: StaticPage; groups: GalleryGroup[] }) {
  const shots = (pages: GalleryGroup['pages']) => pages.reduce((n, p) => n + p.images.length, 0);
  const total = groups.reduce((sum, g) => sum + shots(g.pages), 0);

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: page.title }]} />

      <header className={styles.head}>
        <h1 className={styles.h1}>{page.title}</h1>
        <p className={styles.lead}>
          Фотографии выпущенной техники по маркам базового шасси: {total} снимков.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.mark} className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.h2}>{group.mark}</h2>
            <span className={`mono ${styles.count}`}>{shots(group.pages)} фото</span>
          </div>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

          <ul className={styles.grid}>
            {group.pages.map((item) => (
              <li key={item.slug}>
                <Link href={`/${item.slug}/`} className={`u-corner ${styles.card}`}>
                  <span className={styles.photo}>
                    <Image
                      src={item.images[0]}
                      alt={item.title}
                      width={800}
                      height={510}
                      sizes="(max-width: 700px) 100vw, 33vw"
                      className={styles.img}
                    />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={`mono ${styles.badge}`}>{item.images.length} фото</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Снимки самой страницы «Галерея» — они были на ней у донора. */}
      {page.images.length > 0 && (
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.h2}>Разное</h2>
            <span className={`mono ${styles.count}`}>{page.images.length} фото</span>
          </div>
          <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

          <div className={styles.loose}>
            {page.images.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt={`Галерея — фотография ${i + 1}`}
                width={800}
                height={510}
                sizes="(max-width: 700px) 100vw, 33vw"
                className={styles.looseImg}
              />
            ))}
          </div>
        </section>
      )}

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
