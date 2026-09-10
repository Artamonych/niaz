import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { ClientForm } from './ClientForm';
import styles from '../../ui.module.css';

const fmt = (d: Date) =>
  d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, client] = await Promise.all([
    currentUser(),
    prisma.client.findUnique({
      where: { id },
      include: {
        manager: { select: { fio: true } },
        leads: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
  ]);

  if (!client) notFound();
  const editable = Boolean(user && canEdit(user.role));

  return (
    <>
      <Link href="/crm/clients" className={`mono ${styles.back}`}>
        ← Все контрагенты
      </Link>

      <header className={styles.head}>
        <div>
          <p className="label">Контрагент</p>
          <h1 className={styles.h1}>{client.name}</h1>
          <p className={styles.lead}>
            Менеджер: {client.manager?.fio ?? 'не назначен'} · заведён {fmt(client.createdAt)}
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>{client.status}</span>
      </header>

      <div className={styles.grid}>
        <ClientForm client={client} editable={editable} />

        <div>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Заявки контрагента</h2>
            {client.leads.length === 0 ? (
              <p className={styles.dim}>Связанных заявок нет.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table} style={{ minWidth: 0 }}>
                  <tbody>
                    {client.leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <Link href={`/crm/leads/${lead.id}`} className={`mono ${styles.rowLink}`}>
                            {lead.num}
                          </Link>
                        </td>
                        <td className={styles.dim}>{lead.subject ?? lead.fio}</td>
                        <td>
                          <span className={`mono ${styles.badge}`}>{lead.stage.title}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.panel} style={{ marginTop: 20 }}>
            <h2 className={styles.panelTitle}>История</h2>
            {client.events.length === 0 ? (
              <p className={styles.dim}>Событий пока нет.</p>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {client.events.map((event) => (
                  <li key={event.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{event.authorName}</span>
                      <span className={`mono ${styles.dim}`} style={{ fontSize: 10.5 }}>
                        {fmt(event.createdAt)}
                      </span>
                    </div>
                    <p className={styles.dim} style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5 }}>
                      {event.text}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
