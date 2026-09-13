import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can, leadScope } from '@/lib/roles';
import { Board } from './Board';
import styles from './board.module.css';

export default async function LeadsPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const canAssign = can(user.role, 'leads:assign');

  const [stages, leads, owners] = await Promise.all([
    prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    // Менеджер видит только свои заявки; нераспределённые — у руководителя.
    // Убранные в корзину не показываются никому: их место в /crm/leads/trash.
    prisma.lead.findMany({
      where: { ...leadScope(user), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, fio: true } } },
    }),
    canAssign
      ? prisma.user.findMany({
          where: { active: true },
          select: { id: true, fio: true },
          orderBy: { fio: 'asc' },
        })
      : [],
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fresh = leads.filter((l) => l.createdAt >= today).length;

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Заявки</p>
          <h1 className={styles.h1}>Воронка продаж</h1>
        </div>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statK}>Всего</dt>
            <dd className={`mono ${styles.statV}`}>{leads.length}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statK}>Сегодня</dt>
            <dd className={`mono ${styles.statV}`}>{fresh}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statK}>Без ответственного</dt>
            <dd className={`mono ${styles.statV}`}>{leads.filter((l) => !l.ownerId).length}</dd>
          </div>
        </dl>
      </header>

      <Board
        stages={stages}
        owners={owners}
        editable={can(user.role, 'leads:work')}
        canAssign={canAssign}
        leads={leads.map((lead) => ({
          id: lead.id,
          num: lead.num,
          fio: lead.fio,
          phone: lead.phone,
          org: lead.org,
          subject: lead.subject,
          comment: lead.comment,
          stageId: lead.stageId,
          ownerId: lead.ownerId,
          ownerName: lead.owner?.fio ?? null,
          createdAt: lead.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
