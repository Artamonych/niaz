import Image from 'next/image';
import type { StaticPage } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './ArticlePage.module.css';

/** Разделы донора, которым в новой навигации соответствует свой раздел. */
const SECTION_HREF: Record<string, string> = {
  'Информационный раздел': '/informatsionnyy-razdel',
  Новости: '/novosti',
  Галерея: '/galereya',
  Партнеры: '/partnery',
  Достижения: '/dostizheniya',
};

export function ArticlePage({ page }: { page: StaticPage }) {
  const sectionHref = SECTION_HREF[page.section];
  const photos = page.images.slice(0, 6);

  return (
    <div className="shell">
      <Breadcrumbs
        items={[
          ...(page.section && page.section !== 'Информация'
            ? [{ name: page.section, href: sectionHref }]
            : []),
          { name: page.title },
        ]}
      />

      <article className={styles.article}>
        <header className={styles.head}>
          <h1 className={styles.h1}>{page.title}</h1>
          {page.lead && <p className={styles.lead}>{page.lead}</p>}
        </header>

        {photos.length > 0 && (
          <div className={styles.gallery}>
            {photos.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt={`${page.title} — фотография ${i + 1}`}
                width={800}
                height={510}
                className={styles.photo}
              />
            ))}
          </div>
        )}
      </article>

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label">Вопрос заводу</p>
          <h2 className={styles.h2}>Нужна консультация?</h2>
          <p className={styles.ctaLead}>
            Опишите задачу — специалист отдела продаж перезвонит и ответит по существу.
          </p>
        </div>
        <LeadForm subject={page.title} />
      </section>
    </div>
  );
}
