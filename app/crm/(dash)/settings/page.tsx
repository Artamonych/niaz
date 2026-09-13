import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can, roleTitle } from '@/lib/roles';
import { botConfigured, botInviteLink, botJoinCode, botUsername } from '@/lib/telegram';
import { mailConfigured } from '@/lib/mail';
import { disconnectTelegramChat, mailBotInviteToSelf, refreshBotToken } from '../../actions';
import { PasswordForm } from './PasswordForm';
import styles from '../ui.module.css';

/**
 * Для администратора это «Настройки»: профиль, стадии, состояние базы и общий
 * чат бота. Для остальных — «Профиль»: свои данные, пароль и подключение
 * Telegram. Раздел не закрыт целиком, иначе руководителю и менеджеру негде
 * сменить себе пароль.
 */
export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const isAdmin = can(user.role, 'settings:system');

  const [me, myChats, stages, leadCount, clientCount, sharedChats, username] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { tgToken: true } }),
    prisma.telegramChat.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
    isAdmin ? prisma.stage.findMany({ orderBy: { order: 'asc' } }) : [],
    isAdmin ? prisma.lead.count() : 0,
    isAdmin ? prisma.client.count() : 0,
    isAdmin
      ? prisma.telegramChat.findMany({
          where: { userId: null },
          orderBy: { createdAt: 'asc' },
        })
      : [],
    botUsername(),
  ]);

  const invite = me?.tgToken ? await botInviteLink(me.tgToken) : null;
  const allLeads = can(user.role, 'notify:allLeads');

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">{isAdmin ? 'Настройки' : 'Профиль'}</p>
          <h1 className={styles.h1}>
            {isAdmin ? 'Учётная запись и система' : 'Учётная запись'}
          </h1>
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
          <h2 className={styles.panelTitle}>Заявки в Telegram</h2>
          {!botConfigured() ? (
            <p className={styles.dim} style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
              Бот не настроен: на сервере не заданы TG_BOT_TOKEN и TG_JOIN_CODE. Порядок —
              deploy/README.md, раздел про бота заявок.
            </p>
          ) : (
            <>
              <p className={styles.dim} style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.6 }}>
                {allLeads
                  ? 'Вы будете получать все заявки с сайта и недельный отчёт.'
                  : 'Вы будете получать заявки, назначенные вам.'}{' '}
                Ссылка личная: она привязывает чат к вашей учётной записи, пересылать её
                другим нельзя.
              </p>

              {invite ? (
                <p style={{ margin: '0 0 12px' }}>
                  <a href={invite} target="_blank" rel="noopener" className={styles.rowLink}>
                    Открыть бота и нажать «Старт»
                  </a>
                </p>
              ) : (
                me?.tgToken && (
                  <p className={styles.dim} style={{ margin: '0 0 12px', fontSize: 12.5 }}>
                    Ссылка появится, когда бот выйдет на связь: имя бота ещё не получено.
                  </p>
                )
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <form action={refreshBotToken}>
                  <button type="submit" className={me?.tgToken ? styles.ghost : styles.submit}>
                    {me?.tgToken ? 'Новая ссылка' : 'Получить ссылку'}
                  </button>
                </form>

                {/* Письмо со ссылкой — только когда почта настроена: иначе кнопка обманывает. */}
                {mailConfigured() && (
                  <form action={mailBotInviteToSelf}>
                    <button type="submit" className={styles.ghost}>
                      Прислать ссылку письмом
                    </button>
                  </form>
                )}
              </div>

              {myChats.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                  {myChats.map((chat) => (
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
          )}
        </section>

        {isAdmin && botConfigured() && (
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Общий чат отдела</h2>
            <p className={styles.dim} style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.6 }}>
              Чат, подключённый общим кодом, получает <b>все</b> заявки — независимо от
              ролей. Добавьте бота в группу и отправьте{' '}
              <span className="mono">
                /start{username ? `@${username}` : ''} {botJoinCode()}
              </span>
              . Код не пересылайте за пределы отдела продаж.
            </p>

            {sharedChats.length === 0 ? (
              <p className={styles.dim} style={{ margin: 0, fontSize: 13 }}>
                Общих чатов нет — заявки уходят только по личным ссылкам сотрудников.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {sharedChats.map((chat) => (
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
          </section>
        )}

        {isAdmin && (
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
        )}

        {isAdmin && (
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>В базе</h2>
            <dl style={{ display: 'grid', gap: 10, margin: 0 }}>
              <Row k="Заявок" v={String(leadCount)} />
              <Row k="Контрагентов" v={String(clientCount)} />
            </dl>
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
