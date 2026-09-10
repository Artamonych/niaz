import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { roleTitle } from '@/lib/roles';
import { PasswordForm } from './PasswordForm';
import styles from '../ui.module.css';

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const [stages, leadCount, clientCount] = await Promise.all([
    prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    prisma.lead.count(),
    prisma.client.count(),
  ]);

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Настройки</p>
          <h1 className={styles.h1}>Учётная запись и система</h1>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Профиль</h2>
          <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
            <Row k="Сотрудник" v={user.fio} />
            <Row k="Почта" v={user.email} />
            <Row k="Роль" v={roleTitle(user.role)} />
          </dl>
        </section>

        <PasswordForm />

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Стадии воронки</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {stages.map((stage) => (
              <li
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  borderInlineStart: `3px solid ${stage.accent}`,
                  paddingInlineStart: 10,
                }}
              >
                {stage.title}
              </li>
            ))}
          </ol>
          <p className={styles.dim} style={{ marginTop: 14, fontSize: 12 }}>
            Набор стадий задан при установке. Менять его на ходу нельзя: заявки уже
            распределены, и переименование сломает историю в ленте событий.
          </p>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>В базе</h2>
          <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
            <Row k="Заявок" v={String(leadCount)} />
            <Row k="Контрагентов" v={String(clientCount)} />
          </dl>
        </section>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <dt className={styles.dim} style={{ fontSize: 13 }}>
        {k}
      </dt>
      <dd className="mono" style={{ margin: 0, fontSize: 13 }}>
        {v}
      </dd>
    </div>
  );
}
