import { cache } from 'react';
import { connection } from 'next/server';
import { prisma } from './db';
import { STATIC_PAGES } from './content';
import { newsPhotoUrl, newsToday, toDay } from './news-shared';

/** Карточка ленты: общий вид для новостей донора и новостей из CRM. */
export type NewsItem = {
  key: string;
  title: string;
  excerpt: string;
  /** YYYY-MM-DD */
  date: string;
  href: string;
  cover: string | null;
};

/** Опубликована, и её день по Москве наступил — то же правило, что isNewsLive. */
const published = () => ({
  status: 'PUBLISHED',
  publishedAt: { lte: new Date(`${newsToday()}T00:00:00Z`) },
});

/** Новости донора: статичные, с плоскими адресами (§6.1 ТЗ), в CRM не правятся. */
function donorNews(): NewsItem[] {
  return STATIC_PAGES.filter((p) => p.section === 'Новости' && p.date).map((p) => ({
    key: `donor:${p.slug}`,
    title: p.title,
    excerpt: p.lead,
    date: p.date as string,
    href: `/${p.slug}/`,
    cover: p.images[0] ?? null,
  }));
}

async function crmNews(): Promise<NewsItem[]> {
  const posts = await prisma.newsPost.findMany({
    where: published(),
    orderBy: { publishedAt: 'desc' },
    include: { photos: { where: { isCover: true }, take: 1 } },
  });

  return posts.map((p) => ({
    key: `crm:${p.id}`,
    title: p.title,
    excerpt: p.excerpt,
    date: toDay(p.publishedAt),
    href: `/novosti/${p.slug}/`,
    cover: p.photos[0] ? newsPhotoUrl(p.photos[0].file) : null,
  }));
}

/**
 * Общая лента: CRM и донор вперемешку, по дате.
 *
 * connection() обязателен. Запросы better-sqlite3 синхронные и иначе
 * выполнились бы на этапе сборки, когда базы в образе нет: страница
 * собралась бы без новостей из CRM и так отдавалась бы после каждого деплоя.
 */
export async function getNewsFeed(limit?: number): Promise<NewsItem[]> {
  await connection();
  const feed = [...(await crmNews()), ...donorNews()].sort((a, b) => b.date.localeCompare(a.date));
  return limit ? feed.slice(0, limit) : feed;
}

/**
 * Опубликованная новость из CRM со всеми фото — или null, если на сайте её не
 * видно. Обёрнута в cache(): её зовут и generateMetadata, и сама страница, а
 * без этого на один просмотр приходилось бы два одинаковых запроса к базе.
 */
export const getPublishedPost = cache(async (slug: string) => {
  await connection();
  return prisma.newsPost.findFirst({
    where: { slug, ...published() },
    include: { photos: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
  });
});

/** Адреса опубликованных новостей — для sitemap.xml. */
export async function getPublishedNewsUrls() {
  await connection();
  return prisma.newsPost.findMany({ where: published(), select: { slug: true, updatedAt: true } });
}
