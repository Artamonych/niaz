import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { formatNewsDate, isNewsLive, toDay } from '@/lib/news-shared';
import styles from '../ui.module.css';

function statusOf(post: { status: string; publishedAt: Date }) {
  if (post.status !== 'PUBLISHED') return 'Черновик';
  return isNewsLive(post) ? 'На сайте' : 'Ждёт даты';
}

export default async function NewsListPage() {
  const [user, posts] = await Promise.all([
    currentUser(),
    prisma.newsPost.findMany({
      orderBy: { publishedAt: 'desc' },
      include: { _count: { select: { photos: true } } },
    }),
  ]);
  const editable = Boolean(user && canEdit(user.role));

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Новости</p>
          <h1 className={styles.h1}>Новости завода</h1>
          <p className={styles.lead}>
            Публикуются на сайте — в ленте на главной и в разделе «Новости». Черновики
            видны только здесь.
          </p>
        </div>
        {editable && (
          <Link href="/crm/news/new/" className={styles.submit}>
            Добавить новость
          </Link>
        )}
      </header>

      {posts.length === 0 ? (
        <p className={styles.empty}>
          Новостей из CRM пока нет. Восемь новостей прежнего сайта показываются в ленте
          автоматически и здесь не редактируются.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Заголовок</th>
                <th>Статус</th>
                <th>Фото</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="mono">
                    {formatNewsDate(toDay(post.publishedAt))}
                  </td>
                  <td>
                    <Link href={`/crm/news/${post.id}/`} className={styles.rowLink}>
                      {post.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`mono ${styles.badge}`}>{statusOf(post)}</span>
                  </td>
                  <td className="mono">{post._count.photos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
