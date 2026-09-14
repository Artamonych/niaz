import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/roles';
import { TrashActions } from '../TrashActions';
import styles from '../../ui.module.css';

const fmt = (d: Date) =>
  d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Корзина заявок (п. 30 бэклога): удалённое лежит здесь, пока его не вернут
 * или не сотрут. Само ничего не чистится — заявка это персональные данные и
 * история работы с клиентом, решение о безвозвратном удалении за человеком.
 */
export default async function TrashPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  if (!can(user.role, 'leads:delete')) notFound();

  // Корзина не чистится сама, поэтому растёт всегда: показываем последние.
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 200,
      include: { owner: { select: { fio: true } } },
    }),
    prisma.lead.count({ where: { deletedAt: { not: null } } }),
  ]);

  const canPurge = can(user.role, 'leads:purge');

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Заявки</p>
          <h1 className={styles.h1}>Корзина</h1>
          <p className={styles.lead}>
            {canPurge
              ? 'Заявку можно вернуть на доску или стереть насовсем. Стёртую не восстановить.'
              : 'Заявку можно вернуть на доску. Стирает насовсем администратор.'}
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>
          {total > leads.length ? `${leads.length} из ${total}` : `${total} в корзине`}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className={styles.empty}>Корзина пуста.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Заявка</th>
                <th>Запрос</th>
                <th>Ответственный</th>
                <th>Убрана</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/crm/leads/${lead.id}/`} className={styles.rowLink}>
                      {lead.fio}
                    </Link>
                    <div className={`mono ${styles.dim}`} style={{ fontSize: 11.5 }}>
                      {lead.num}
                      {lead.org ? ` · ${lead.org}` : ''}
                    </div>
                  </td>
                  <td className={styles.dim}>{lead.subject ?? '—'}</td>
                  <td className={styles.dim}>{lead.owner?.fio ?? 'не назначен'}</td>
                  <td className={`mono ${styles.dim}`} style={{ whiteSpace: 'nowrap' }}>
                    {fmt(lead.deletedAt!)}
                    {lead.deletedBy && (
                      <div style={{ fontSize: 11.5 }}>{lead.deletedBy}</div>
                    )}
                  </td>
                  <td>
                    <TrashActions leadId={lead.id} deleted canPurge={canPurge} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
