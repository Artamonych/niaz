import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/roles';
import { mailerConfigured } from '@/lib/mailer';
import { retryMailMessage } from '../../actions';
import styles from '../ui.module.css';

const LIMIT = 100;

const fmt = (d: Date) =>
  d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const STATUS: Record<string, string> = {
  pending: 'в очереди',
  sent: 'отправлено',
  failed: 'не доставлено',
};

/**
 * Очередь писем: видно, что ушло, что ждёт повтора и что не доставлено.
 * Свой сервис отправки шлёт напрямую, и отказ почтового узла получателя —
 * единственный способ узнать о проблеме. Раздел для администратора.
 */
export default async function MailPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  if (!can(user.role, 'settings:system')) redirect('/crm');

  const [messages, pending, failed] = await Promise.all([
    prisma.mailMessage.findMany({ orderBy: { createdAt: 'desc' }, take: LIMIT }),
    prisma.mailMessage.count({ where: { status: 'pending' } }),
    prisma.mailMessage.count({ where: { status: 'failed' } }),
  ]);

  return (
    <>
      <header className={styles.head}>
        <div>
          <p className="label">Почта</p>
          <h1 className={styles.h1}>Очередь писем</h1>
          <p className={styles.lead}>
            Письма уходят с этого сервера прямо на почтовые узлы получателей. Временный
            отказ — не потеря: письмо остаётся в очереди и уходит позже.
          </p>
        </div>
        <span className={`mono ${styles.badge}`}>
          {pending} в очереди · {failed} не доставлено
        </span>
      </header>

      {!mailerConfigured() && (
        <p className={styles.empty}>
          Почта выключена: не задан MAIL_FROM. Порядок включения — deploy/README.md,
          раздел «Письма о заявках».
        </p>
      )}

      {messages.length === 0 ? (
        <p className={styles.empty}>Писем пока не было.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Когда</th>
                <th>Кому</th>
                <th>Тема</th>
                <th>Состояние</th>
                <th>Ошибка</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className={`mono ${styles.dim}`} style={{ whiteSpace: 'nowrap' }}>
                    {fmt(message.createdAt)}
                  </td>
                  <td className="mono">{message.to}</td>
                  <td>{message.subject}</td>
                  <td>
                    <span className={`mono ${styles.badge}`}>
                      {STATUS[message.status] ?? message.status}
                    </span>
                    {message.attempts > 0 && (
                      <div className={styles.dim} style={{ fontSize: 11.5 }}>
                        попыток: {message.attempts}
                      </div>
                    )}
                  </td>
                  <td className={styles.dim} style={{ maxWidth: 320 }}>
                    {message.lastError ?? '—'}
                  </td>
                  <td>
                    {message.status !== 'sent' && (
                      <form action={retryMailMessage.bind(null, message.id)}>
                        <button type="submit" className={styles.ghost}>
                          Повторить
                        </button>
                      </form>
                    )}
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
