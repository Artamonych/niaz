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

async function crmNews(limit?: number): Promise<NewsItem[]> {
  // База лежит на томе и на сборке образа недоступна. Раньше от этого спасал
  // connection(), но он же делал главную динамической — теперь читаем с
  // подстраховкой: на сборке лента соберётся из новостей донора, а новости
  // CRM подтянутся при первой же пересборке страницы на сервере (п. 35).
  const posts = await prisma.newsPost
    .findMany({
      where: published(),
      orderBy: { publishedAt: 'desc' },
      // Лента на главной показывает три карточки — незачем поднимать все.
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        photos: { where: { isCover: true }, take: 1, select: { file: true } },
      },
    })
    .catch((err: unknown) => {
      console.error('[news] база недоступна, лента только из архива:', err);
      return [];
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
 * Страницы, где она выводится, пересобираются по времени (revalidate) и сразу
 * после правки новости в CRM — поэтому читать базу на каждый заход не нужно.
 */
export async function getNewsFeed(limit?: number): Promise<NewsItem[]> {
  const feed = [...(await crmNews(limit)), ...donorNews()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
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
  return prisma.newsPost
    .findMany({ where: published(), select: { slug: true, updatedAt: true } })
    .catch((err: unknown) => {
      console.error('[news] карта сайта собирается без новостей CRM:', err);
      return [];
    });
}
