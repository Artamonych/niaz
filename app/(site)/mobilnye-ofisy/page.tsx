import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { ProjectShowcase } from '@/components/ProjectShowcase';
import { MOBILE_OFFICES } from '@/lib/projects';
import styles from './mobilnye-ofisy.module.css';

export const metadata: Metadata = {
  title: 'Мобильные офисы',
  description:
    'Представительские микроавтобусы на Mercedes-Benz Sprinter производства Нижегородского автомобильного завода: салоны-переговорные и салоны-лаунж с кожаными креслами, столами, медиаоборудованием.',
  alternates: { canonical: '/mobilnye-ofisy' },
};

/**
 * Раздел «Мобильные офисы» (правка заказчика от 01.10.2026): представительские
 * микроавтобусы. Данные и правило «только то, что видно на съёмке» —
 * в lib/projects.ts.
 */
export default function MobileOfficesPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Продукция', href: '/produktsiya/' }, { name: 'Мобильные офисы' }]} />

      <header className={styles.head}>
        <p className="label label-deep">Представительские микроавтобусы</p>
        <h1 className={styles.h1}>Мобильные офисы</h1>
        <p className={styles.lead}>
          Салоны для работы и встреч в дороге на базе Mercedes-Benz Sprinter: кожаные кресла,
          переговорные столы, медиаоборудование, отделка и свет. Каждый салон собирается под
          заказчика — ниже три выполненных проекта.
        </p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <ProjectShowcase projects={MOBILE_OFFICES} />

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Салон под заказчика</p>
          <h2 className={styles.h2}>Нужен мобильный офис?</h2>
          <p className={styles.ctaLead}>
            Опишите, сколько мест нужно и для чего салон — переговоры, работа, отдых. Предложим
            компоновку и рассчитаем сроки. Другие штучные машины — в{' '}
            <Link href="/unikalnye-proekty/" className={styles.inlineLink}>
              уникальных проектах
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Мобильный офис" />
      </section>
    </div>
  );
}
