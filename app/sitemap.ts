import type { MetadataRoute } from 'next';
import { LANDINGS, PRODUCTS, STATIC_PAGES, RESERVED_SLUGS } from '@/lib/content';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://com-transport.ru';

/**
 * Карта сайта по §6.1 ТЗ: попадают только адреса, отдающие 200.
 * Снятый раздел «Автобусы» живёт в 301-карте и в sitemap не входит.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Адреса канонические: со слэшем на конце, как их отдаёт сайт (trailingSlash).
  const url = (path: string) => `${BASE}${path}`;

  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    { url: url('/produktsiya/'), changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/tendery/'), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/inzheneriya/'), changeFrequency: 'monthly', priority: 0.7 },

    ...LANDINGS.map((l) => ({
      url: url(`/${l.slug}/`),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    ...PRODUCTS.map((p) => ({
      url: url(`/${p.slug}/`),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    ...STATIC_PAGES.filter((p) => !RESERVED_SLUGS.has(p.slug)).map((p) => ({
      url: url(`/${p.slug}/`),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
