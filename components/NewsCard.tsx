import Link from 'next/link';
import type { NewsItem } from '@/lib/news';
import { formatNewsDate } from '@/lib/news-shared';
import styles from './NewsCard.module.css';

/**
 * Карточка ленты новостей по прототипу: дата моноширинным, заголовок, анонс,
 * верхняя грань дочерчивается при наведении. Один компонент на тёмную главную
 * и светлый раздел новостей — меняется только тема.
 */
export function NewsCard({
  item,
  tone,
  withCover = false,
}: {
  item: NewsItem;
  tone: 'dark' | 'light';
  withCover?: boolean;
}) {
  return (
    <Link href={item.href} className={`${styles.card} ${styles[tone]}`}>
      {/*
        <img>, а не next/image — осознанно: обложки из CRM уже ужаты при
        загрузке, а оптимизатор перекодировал бы их на лету — на сервере
        с 1,9 ГБ памяти это плохой обмен (см. страницу новости).
      */}
      {withCover && item.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover} alt="" loading="lazy" className={styles.cover} />
      )}
      <span className={`mono ${styles.date}`}>{formatNewsDate(item.date)}</span>
      <span className={styles.title}>{item.title}</span>
      {item.excerpt && <span className={styles.excerpt}>{item.excerpt}</span>}
    </Link>
  );
}
