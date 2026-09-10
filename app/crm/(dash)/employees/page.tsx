import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canManageStaff } from '@/lib/roles';
import { EmployeeEditor } from './EmployeeEditor';
import styles from '../ui.module.css';

export default async function EmployeesPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  // Список сотрудников — не для всех: там роли и доступы.
  if (!canManageStaff(user.role)) redirect('/crm');

  const employees = await prisma.user.findMany({
    orderBy: [{ active: 'desc' }, { fio: 'asc' }],
    select: { id: true, fio: true, email: true, phone: true, role: true, active: true },
  });

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Сотрудники</p>
          <h1 className={styles.h1}>Доступ к CRM</h1>
          <p className={styles.lead}>
            Роль определяет права: «Наблюдатель» только смотрит, менять данные не может.
            Сотрудников не удаляем — отключаем доступ, чтобы сохранить историю по заявкам.
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>{employees.filter((e) => e.active).length} активных</span>
      </header>

      <EmployeeEditor employees={employees} currentUserId={user.id} />
    </>
  );
}
