import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CATEGORY_BY_KEY, SUBSECTIONS, getSubsection, subsectionHref } from '@/lib/catalog';
import { getLanding } from '@/lib/content';
import { CategoryPage } from '@/components/CategoryPage';

type Props = { params: Promise<{ slug: string; sub: string }> };

/**
 * Подраздел каталога: /<категория>/<подраздел>/ — «Автолавки», «Класс B».
 * Список подразделов задан в lib/catalog.ts (SUBSECTIONS); других адресов нет.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SUBSECTIONS.map((s) => ({ slug: CATEGORY_BY_KEY[s.category].slug, sub: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sub } = await params;
  const subsection = getSubsection(slug, sub);
  if (!subsection) return {};
  return {
    title: subsection.title,
    description: subsection.lead,
    alternates: { canonical: subsectionHref(subsection) },
    openGraph: { title: subsection.title, description: subsection.lead, type: 'website' },
  };
}

export default async function Page({ params }: Props) {
  const { slug, sub } = await params;
  const subsection = getSubsection(slug, sub);
  const landing = getLanding(slug);
  if (!subsection || !landing) notFound();

  return <CategoryPage category={CATEGORY_BY_KEY[subsection.category]} landing={landing} sub={subsection} />;
}
