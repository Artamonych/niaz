import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NewsCard } from '@/components/NewsCard';
import { getSection } from '@/lib/content';
import { getNewsFeed } from '@/lib/news';
import styles from './novosti.module.css';

const SECTION = getSection('novosti');
const TITLE = SECTION?.title ?? 'Новости завода';

export const metadata: Metadata = {
  title: TITLE,
  description: SECTION?.lead,
  alternates: { canonical: '/novosti' },
};

/**
 * Лента новостей: новости из CRM и восемь новостей прежнего сайта вместе, по
 * дате. Донорские открываются по своим старым адресам — §6.1 ТЗ.
 */
export default async function NewsPage() {
  const feed = await getNewsFeed();

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: TITLE }]} />

      <header className={styles.head}>
        <h1 className={styles.h1}>{TITLE}</h1>
        {SECTION?.lead && <p className={styles.lead}>{SECTION.lead}</p>}
      </header>

      {feed.length === 0 ? (
        <p className={styles.empty}>Новости готовятся к публикации.</p>
      ) : (
        <div className={styles.grid}>
          {feed.map((item) => (
            <NewsCard key={item.key} item={item} tone="light" withCover />
          ))}
        </div>
      )}
    </div>
  );
}
