import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can, canWorkLead } from '@/lib/roles';
import { convertToClient } from '../../../actions';
import { TrashActions } from '../TrashActions';
import { CommentForm } from './CommentForm';
import styles from './lead.module.css';

const fmt = (d: Date) =>
  d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) notFound();

  const [user, lead] = await Promise.all([
    currentUser(),
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        stage: true,
        owner: { select: { fio: true } },
        client: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'desc' } },
      },
    }),
  ]);

  if (!lead) notFound();
  // Чужая заявка менеджеру не показывается: в ней контакты клиента.
  if (!user || (!can(user.role, 'leads:viewAll') && lead.ownerId !== user.id)) notFound();
  // Заявка в корзине только читается: работать с ней можно после возврата.
  const trashed = lead.deletedAt !== null;
  const editable = canWorkLead(user, lead) && !trashed;
  const canTrash = can(user.role, 'leads:delete');

  const facts = [
    { k: 'Телефон', v: lead.phone, href: `tel:${lead.phone.replace(/[^\d+]/g, '')}` },
    { k: 'Почта', v: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
    { k: 'Организация', v: lead.org },
    { k: 'ИНН', v: lead.inn },
    { k: 'Запрос', v: lead.subject },
    { k: 'Источник', v: lead.source },
    { k: 'Страница', v: lead.sourceUrl, href: lead.sourceUrl ?? undefined },
    { k: 'Ответственный', v: lead.owner?.fio ?? 'не назначен' },
    { k: 'Создана', v: fmt(lead.createdAt) },
  ].filter((f) => f.v);

  return (
    <>
      <Link href="/crm" className={`mono ${styles.back}`}>
        ← Все заявки
      </Link>

      <header className={styles.head}>
        <div>
          <p className={`mono ${styles.num}`}>{lead.num}</p>
          <h1 className={styles.h1}>{lead.fio}</h1>
          {lead.org && <p className={styles.org}>{lead.org}</p>}
        </div>

        <div className={styles.headSide}>
          <span className={`mono ${styles.stage}`} style={{ borderColor: lead.stage.accent, color: lead.stage.accent }}>
            {lead.stage.title}
          </span>

          {lead.client ? (
            <Link href={`/crm/clients/${lead.client.id}`} className={styles.clientLink}>
              Контрагент: {lead.client.name}
            </Link>
          ) : (
            editable && (
              <form action={convertToClient.bind(null, lead.id)}>
                <button type="submit" className={styles.convert}>
                  Завести контрагента
                </button>
              </form>
            )
          )}

          {canTrash && (
            <TrashActions
              leadId={lead.id}
              deleted={trashed}
              canPurge={can(user.role, 'leads:purge')}
            />
          )}
        </div>
      </header>

      {trashed && (
        <p className={styles.trashed}>
          Заявка в корзине{lead.deletedBy ? `, убрал её ${lead.deletedBy}` : ''}. На доске её нет;
          чтобы снова работать с ней, верните её из корзины.
        </p>
      )}

      <div className={styles.grid}>
        <section>
          <h2 className={styles.h2}>Данные заявки</h2>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.k} className={styles.fact}>
                <dt className={styles.factK}>{f.k}</dt>
                <dd className={`mono ${styles.factV}`}>
                  {f.href ? (
                    <a href={f.href} className={styles.factLink}>
                      {f.v}
                    </a>
                  ) : (
                    f.v
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {lead.comment && (
            <>
              <h2 className={styles.h2}>Задача клиента</h2>
              <p className={styles.comment}>{lead.comment}</p>
            </>
          )}
        </section>

        <section>
          <h2 className={styles.h2}>Лента событий</h2>
          {editable && <CommentForm leadId={lead.id} />}

          <ol className={styles.feed}>
            {lead.events.map((event) => (
              <li key={event.id} className={styles.event}>
                <div className={styles.eventTop}>
                  <span className={styles.eventAuthor}>{event.authorName}</span>
                  <span className={`mono ${styles.eventTime}`}>{fmt(event.createdAt)}</span>
                </div>
                <p className={event.kind === 'system' ? styles.eventSystem : styles.eventText}>
                  {event.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
