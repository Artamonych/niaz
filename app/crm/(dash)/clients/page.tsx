import Link from 'next/link';
import { prisma } from '@/lib/db';
import styles from '../ui.module.css';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      manager: { select: { fio: true } },
      _count: { select: { leads: true } },
    },
  });

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Контрагенты</p>
          <h1 className={styles.h1}>Карточки организаций</h1>
          <p className={styles.lead}>
            Заводятся из заявок. Здесь хранятся реквизиты, которые запрашивают при
            заключении контракта.
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>{clients.length} записей</span>
      </header>

      {clients.length === 0 ? (
        <p className={styles.empty}>
          Контрагентов пока нет. Откройте заявку и нажмите «Завести контрагента».
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Организация</th>
                <th>ИНН</th>
                <th>Контакт</th>
                <th>Менеджер</th>
                <th>Статус</th>
                <th>Заявок</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/crm/clients/${client.id}`} className={styles.rowLink}>
                      {client.name}
                    </Link>
                    {client.city && <div className={styles.dim}>{client.city}</div>}
                  </td>
                  <td className="mono">{client.inn ?? '—'}</td>
                  <td>
                    {client.contact ?? '—'}
                    {client.phone && <div className={`mono ${styles.dim}`}>{client.phone}</div>}
                  </td>
                  <td className={styles.dim}>{client.manager?.fio ?? '—'}</td>
                  <td>
                    <span className={`mono ${styles.badge}`}>{client.status}</span>
                  </td>
                  <td className="mono">{client._count.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
