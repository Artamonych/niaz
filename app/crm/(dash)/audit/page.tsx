import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/roles';
import { AUDIT_TITLES, type AuditAction } from '@/lib/audit';
import styles from '../ui.module.css';

/** Сколько записей показываем: журнал нужен «что было на днях», а не архив. */
const LIMIT = 200;

const fmt = (d: Date) =>
  d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Журнал действий: кто что изменил и удалил. Отдельно от ленты событий —
 * та привязана к заявке и видна менеджерам, а здесь всё разом, включая
 * сотрудников, новости и подключение чатов. Читает только администратор.
 */
export default async function AuditPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  if (!can(user.role, 'audit:view')) redirect('/crm');

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: LIMIT }),
    prisma.auditLog.count(),
  ]);

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Журнал</p>
          <h1 className={styles.h1}>Действия в CRM</h1>
          <p className={styles.lead}>
            Кто что изменил и удалил. Записи не редактируются и не удаляются — на них
            опираются при разборе спорных случаев.
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>
          {total > LIMIT ? `последние ${LIMIT} из ${total}` : `${total} записей`}
        </span>
      </header>

      {records.length === 0 ? (
        <p className={styles.empty}>Записей пока нет.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Когда</th>
                <th>Кто</th>
                <th>Что</th>
                <th>Объект</th>
                <th>Подробности</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className={`mono ${styles.dim}`} style={{ whiteSpace: 'nowrap' }}>
                    {fmt(record.createdAt)}
                  </td>
                  <td>{record.actorName}</td>
                  <td>{AUDIT_TITLES[record.action as AuditAction] ?? record.action}</td>
                  <td className={styles.dim}>{record.target}</td>
                  <td className={styles.dim}>{record.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
