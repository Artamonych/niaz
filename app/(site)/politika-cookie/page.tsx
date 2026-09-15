import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { COOKIE_DOC } from '@/lib/legal/cookie';

export const metadata: Metadata = {
  title: 'Политика в отношении файлов cookie',
  description:
    'Какие файлы cookie использует сайт ООО «Нижегородский автомобильный завод», зачем они нужны и как управлять согласием.',
  alternates: { canonical: '/politika-cookie' },
};

export default function CookiePage() {
  return <LegalDocument doc={COOKIE_DOC} />;
}
