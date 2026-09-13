import { prisma } from './db';

/**
 * Журнал действий в CRM: кто что изменил и удалил.
 *
 * Пишется рядом с самим изменением и намеренно «тихо»: сбой записи в журнал
 * не должен отменять уже сделанное действие — иначе из-за журнала перестанет
 * работать CRM. Поэтому ошибки только в лог сервера.
 */
export type AuditAction =
  | 'lead.stage'
  | 'lead.assign'
  | 'lead.comment'
  | 'lead.convert'
  | 'lead.trash'
  | 'lead.restore'
  | 'lead.purge'
  | 'client.update'
  | 'news.save'
  | 'news.delete'
  | 'news.photo'
  | 'service.save'
  | 'service.delete'
  | 'employee.save'
  | 'employee.block'
  | 'employee.delete'
  | 'client.assign'
  | 'telegram.connect'
  | 'telegram.disconnect'
  | 'password.change'
  | 'mail.retry';

/** Подписи для страницы журнала. */
export const AUDIT_TITLES: Record<AuditAction, string> = {
  'lead.stage': 'Стадия заявки',
  'lead.assign': 'Ответственный по заявке',
  'lead.comment': 'Комментарий к заявке',
  'lead.convert': 'Контрагент из заявки',
  'lead.trash': 'Заявка убрана в корзину',
  'lead.restore': 'Заявка возвращена из корзины',
  'lead.purge': 'Заявка стёрта насовсем',
  'client.update': 'Карточка контрагента',
  'news.save': 'Новость сохранена',
  'news.delete': 'Новость удалена',
  'news.photo': 'Фото новости',
  'service.save': 'Услуга сохранена',
  'service.delete': 'Услуга удалена',
  'employee.save': 'Сотрудник заведён или изменён',
  'employee.block': 'Доступ сотрудника',
  'employee.delete': 'Сотрудник удалён',
  'client.assign': 'Контрагент передан',
  'telegram.connect': 'Чат Telegram подключён',
  'telegram.disconnect': 'Чат Telegram отключён',
  'password.change': 'Смена пароля',
  'mail.retry': 'Повторная отправка письма',
};

type Actor = { id: string; fio: string } | null;

export async function audit(
  actor: Actor,
  action: AuditAction,
  target: string,
  details?: string,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        target,
        details: details ?? null,
        actorId: actor?.id ?? null,
        // Без сотрудника действие пришло из бота: чат подключился сам.
        actorName: actor?.fio ?? 'Telegram',
      },
    });
  } catch (err) {
    console.error(`[audit] ${action} ${target}: ${(err as Error).message}`);
  }
}
