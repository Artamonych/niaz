import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { ServiceEditor } from './ServiceEditor';
import styles from '../ui.module.css';

export default async function ServicesPage() {
  const [user, services] = await Promise.all([
    currentUser(),
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Услуги</p>
          <h1 className={styles.h1}>Справочник услуг</h1>
          <p className={styles.lead}>
            Список того, что завод продаёт помимо самой техники. Используется в заявках
            и коммерческих предложениях.
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>{services.length} услуг</span>
      </header>

      <ServiceEditor services={services} editable={Boolean(user && canEdit(user.role))} />
    </>
  );
}
