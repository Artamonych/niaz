import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { ProjectShowcase } from '@/components/ProjectShowcase';
import { UNIQUE_PROJECTS } from '@/lib/projects';
import styles from './unikalnye-proekty.module.css';

export const metadata: Metadata = {
  // До 25.09.2026 раздел назывался «Чудеса» и жил на /chudesa/ — оттуда 301 (next.config.ts).
  // Снимки остались в /media/chudesa/: это адрес файлов, посетитель его не видит.
  title: 'Уникальные проекты завода',
  description:
    'Штучные проекты Нижегородского автомобильного завода: мобильный госпиталь на базе городского автобуса, мобильная баня на полноприводном шасси, мобильный комплекс службы крови, автомобиль сопровождения велокоманды.',
  alternates: { canonical: '/unikalnye-proekty' },
};

/**
 * Раздел штучных проектов. Данные и правило «только то, что видно на
 * съёмке» — в lib/projects.ts.
 */
export default function UniqueProjectsPage() {
  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Уникальные проекты' }]} />

      <header className={styles.head}>
        <p className="label label-deep">О заводе</p>
        <h1 className={styles.h1}>Уникальные проекты</h1>
        <p className={styles.lead}>
          Машины, которых нет в каталоге: их собирали под конкретную задачу, по одной штуке.
          Здесь то, что видно на съёмке, — конструкция, компоновка и решения, ради которых эти
          проекты и делались.
        </p>
      </header>

      <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

      <ProjectShowcase projects={UNIQUE_PROJECTS} />

      <section className={styles.cta} id="zapros">
        <div>
          <p className="label label-deep">Штучная работа</p>
          <h2 className={styles.h2}>Нужна машина под вашу задачу?</h2>
          <p className={styles.ctaLead}>
            Характеристики этих проектов и условия — по запросу: каждый собирался под своего
            заказчика. Опишите задачу, и конструкторы предложат исполнение. Серийные машины —
            в{' '}
            <Link href="/produktsiya/" className={styles.inlineLink}>
              каталоге продукции
            </Link>
            .
          </p>
        </div>
        <LeadForm subject="Уникальный проект" />
      </section>
    </div>
  );
}
