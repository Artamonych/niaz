import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://com-transport.ru';

/**
 * Тестовый домен закрыт от индексации, боевой открыт (§6.1 ТЗ: «не уехать
 * с noindex» и одновременно не дать стейджингу попасть в поиск).
 * Управляется переменной SITE_INDEXABLE.
 */
const indexable = process.env.SITE_INDEXABLE === 'true';

export default function robots(): MetadataRoute.Robots {
  if (!indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/crm', '/api/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
