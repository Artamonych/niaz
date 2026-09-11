import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canManageStaff, roleTitle } from '@/lib/roles';
import { botConfigured, botJoinCode, botUsername } from '@/lib/telegram';
import { disconnectTelegramChat } from '../../actions';
import { PasswordForm } from './PasswordForm';
import styles from '../ui.module.css';

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const [stages, leadCount, clientCount, chats, username] = await Promise.all([
    prisma.stage.findMany({ orderBy: { order: 'asc' } }),
    prisma.lead.count(),
    prisma.client.count(),
    prisma.telegramChat.findMany({ orderBy: { createdAt: 'asc' } }),
    botUsername(),
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

        {/* Код доступа открывает заявки с персональными данными — только тем, кто управляет сотрудниками. */}
        {canManageStaff(user.role) && (
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Заявки в Telegram</h2>
            {botConfigured() ? (
              <>
                <p className={styles.dim} style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.6 }}>
                  Каждая заявка с сайта приходит в подключённые чаты, по понедельникам —
                  отчёт за неделю. Подключить личный чат:{' '}
                  {username ? (
                    <a
                      href={`https://t.me/${username}?start=${botJoinCode()}`}
                      target="_blank"
                      rel="noopener"
                      className={styles.rowLink}
                    >
                      открыть бота
                    </a>
                  ) : (
                    'написать боту'
                  )}{' '}
                  и нажать «Старт». Группу: добавить в неё бота и отправить{' '}
                  <span className="mono">
                    /start{username ? `@${username}` : ''} {botJoinCode()}
                  </span>
                  . Код не пересылайте за пределы отдела продаж.
                </p>

                {chats.length === 0 ? (
                  <p className={styles.dim} style={{ margin: 0, fontSize: 13 }}>
                    Пока ни один чат не подключён.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                    {chats.map((chat) => (
                      <li
                        key={chat.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13 }}
                      >
                        <span>
                          {chat.title}{' '}
                          <span className={styles.dim}>· {chat.type === 'private' ? 'личный' : 'группа'}</span>
                        </span>
                        <form action={disconnectTelegramChat.bind(null, chat.id)}>
                          <button type="submit" className={styles.ghost}>
                            Отключить
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className={styles.dim} style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
                Бот не настроен: на сервере не заданы TG_BOT_TOKEN и TG_JOIN_CODE. Порядок —
                deploy/README.md, раздел про бота заявок.
              </p>
            )}
          </section>
        )}
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
