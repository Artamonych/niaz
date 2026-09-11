import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { isNewsLive, newsPhotoUrl, toDay } from '@/lib/news-shared';
import { NewsForm } from '../NewsForm';
import { NewsPhotos } from '../NewsPhotos';
import styles from '../../ui.module.css';

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, post] = await Promise.all([
    currentUser(),
    prisma.newsPost.findUnique({
      where: { id },
      include: { photos: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
    }),
  ]);
  if (!post) notFound();

  const editable = Boolean(user && canEdit(user.role));
  const live = isNewsLive(post);
  // Адрес сайта абсолютный: у CRM может быть свой домен.
  const siteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/novosti/${post.slug}/`;

  return (
    <>
      <Link href="/crm/news/" className={`mono ${styles.back}`}>
        ← Все новости
      </Link>
      <header className={styles.head}>
        <div>
          <p className="label">Новости</p>
          <h1 className={styles.h1}>{post.title}</h1>
          <p className={styles.lead}>
            {live ? (
              <>
                На сайте:{' '}
                <a href={siteUrl} target="_blank" rel="noopener" className={styles.rowLink}>
                  {siteUrl}
                </a>
              </>
            ) : (
              'На сайте не видна: это черновик или дата публикации ещё не наступила.'
            )}
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        {/*
          key по адресу, а не по дате правки: форма пересоздаётся, только если
          адрес реально сменился (занятый получил суффикс), — иначе сообщение
          «Сохранено» исчезало бы вместе со старой формой раньше, чем его увидят.
        */}
        <NewsForm
          key={post.slug}
          editable={editable}
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            body: post.body,
            videoUrl: post.videoUrl,
            status: post.status,
            publishedAt: toDay(post.publishedAt),
          }}
        />
        <NewsPhotos
          postId={post.id}
          editable={editable}
          photos={post.photos.map((p) => ({ id: p.id, url: newsPhotoUrl(p.file), isCover: p.isCover }))}
        />
      </div>
    </>
  );
}
