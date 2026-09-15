import type { Metadata } from 'next';
import { LegalDocument } from '@/components/LegalDocument';
import { PERSONAL_DATA_DOC } from '@/lib/legal/personal-data';

export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description:
    'Как ООО «Нижегородский автомобильный завод» обрабатывает персональные данные, полученные через сайт: состав данных, цели, сроки хранения и права субъекта.',
  alternates: { canonical: '/politika-konfidentsialnosti' },
};

/**
 * Адрес достался от донора и проиндексирован, поэтому документ живёт по нему,
 * а не по новому пути. Прежнее содержимое было политикой чужого сайта —
 * в тексте стоял домен com-transport.ru.
 */
export default function PersonalDataPage() {
  return <LegalDocument doc={PERSONAL_DATA_DOC} />;
}
