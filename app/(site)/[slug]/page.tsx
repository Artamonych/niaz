import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CATEGORIES,
  LANDINGS,
  PRODUCTS,
  STATIC_PAGES,
  SECTIONS,
  RESERVED_SLUGS,
  getLanding,
  getSection,
  getProduct,
  getStaticPage,
} from '@/lib/content';
import { CategoryPage } from '@/components/CategoryPage';
import { ProductPage } from '@/components/ProductPage';
import { ArticlePage } from '@/components/ArticlePage';
import { SectionPage } from '@/components/SectionPage';

type Props = { params: Promise<{ slug: string }> };

/**
 * Один роут на все страницы донора: у WordPress они лежали плоско в корне,
 * и URL 1:1 (§6.1 ТЗ) требует сохранить ровно эту структуру.
 */
export function generateStaticParams() {
  return [
    ...SECTIONS.filter((s) => !RESERVED_SLUGS.has(s.slug)).map((s) => ({ slug: s.slug })),
    ...LANDINGS.map((l) => ({ slug: l.slug })),
    ...PRODUCTS.map((p) => ({ slug: p.slug })),
    ...STATIC_PAGES.filter((p) => !RESERVED_SLUGS.has(p.slug)).map((p) => ({ slug: p.slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const landing = getLanding(slug);
  const product = getProduct(slug);
  const page = getStaticPage(slug);
  const section = getSection(slug);
  const entry = landing ?? product ?? section ?? page;
  if (!entry) return {};

  // У донора meta description отсутствует на 250 страницах из 327 — генерируем.
  const description =
    ('lead' in entry && entry.lead) ||
    (product ? `${product.title}. Комплектация, характеристики и условия поставки от завода-изготовителя.` : '') ||
    `${entry.title} — Нижегородский автомобильный завод.`;

  return {
    title: entry.title,
    description: description.slice(0, 300),
    alternates: { canonical: `/${slug}` },
    openGraph: { title: entry.title, description: description.slice(0, 300), type: 'website' },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const section = getSection(slug);
  if (section) return <SectionPage section={section} />;

  const landing = getLanding(slug);
  if (landing) {
    const category = CATEGORIES.find((c) => c.key === landing.key);
    if (category) return <CategoryPage category={category} landing={landing} />;
  }

  const product = getProduct(slug);
  if (product) return <ProductPage product={product} />;

  const page = getStaticPage(slug);
  if (page) return <ArticlePage page={page} />;

  notFound();
}
