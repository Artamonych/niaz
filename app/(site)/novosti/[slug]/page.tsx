import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { VideoEmbed } from '@/components/VideoEmbed';
import { getPublishedPost } from '@/lib/news';
import { formatNewsDate, newsPhotoUrl, toDay } from '@/lib/news-shared';
import styles from './post.module.css';

type Props = { params: Promise<{ slug: string }> };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? '';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const cover = post.photos.find((p) => p.isCover) ?? post.photos[0];
  const description = post.excerpt.slice(0, 300);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/novosti/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.publishedAt.toISOString(),
      ...(cover ? { images: [newsPhotoUrl(cover.file)] } : {}),
    },
  };
}

/** Новость из CRM. Черновик или новость с будущей датой отдают 404. */
export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const day = toDay(post.publishedAt);
  const paragraphs = post.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const cover = post.photos.find((p) => p.isCover) ?? post.photos[0];
  const gallery = post.photos.filter((p) => p.id !== cover?.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(cover ? { image: [`${SITE}${newsPhotoUrl(cover.file)}`] } : {}),
    publisher: { '@type': 'Organization', name: 'ООО «Нижегородский автомобильный завод»' },
  };

  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs items={[{ name: 'Новости завода', href: '/novosti/' }, { name: post.title }]} />

      <article className={styles.article}>
        <header className={styles.head}>
          <p className={`mono ${styles.date}`}>
            <time dateTime={day}>{formatNewsDate(day)}</time>
          </p>
          <h1 className={styles.h1}>{post.title}</h1>
          <p className={styles.lead}>{post.excerpt}</p>
        </header>

        {/*
          <img>, а не next/image — осознанно. Фото уже ужаты при загрузке до
          1600 px, а оптимизатор Next перекодировал бы их на лету при каждом
          новом размере: на сервере с 1,9 ГБ памяти это плохой обмен.
        */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={newsPhotoUrl(cover.file)}
            alt={post.title}
            width={cover.width}
            height={cover.height}
            className={styles.cover}
          />
        )}

        <div className={styles.body}>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <VideoEmbed url={post.videoUrl} title={post.title} />

        {gallery.length > 0 && (
          <div className={styles.gallery}>
            {gallery.map((photo, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={newsPhotoUrl(photo.file)}
                alt={`${post.title} — фото ${i + 2}`}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                className={styles.photo}
              />
            ))}
          </div>
        )}
      </article>

      <Link href="/novosti/" className={`u-underline ${styles.back}`}>
        ← Все новости завода
      </Link>
    </div>
  );
}
