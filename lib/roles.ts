/**
 * Права в CRM: одна таблица «роль × действие» вместо разрозненных проверок.
 *
 * Роли согласованы с заказчиком 13.09.2026:
 *   Администратор — всё, включая сотрудников и системные настройки;
 *   Руководитель  — вся работа с заявками и контрагентами, новости и услуги,
 *                   но без заведения сотрудников и системных настроек;
 *   Менеджер      — только свои заявки и свои контрагенты;
 *   Наблюдатель   — видит всё, не меняет ничего (для показов и проверок).
 */
export const ROLES = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель отдела продаж',
  MANAGER: 'Менеджер по продажам',
  VIEWER: 'Наблюдатель',
} as const;

export type RoleKey = keyof typeof ROLES;

export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];

export const roleTitle = (key: string) => ROLES[key as RoleKey] ?? key;

/** Кто действует: роль решает права, id — принадлежность заявок и карточек. */
export type Actor = { id: string; role: string };

export type Action =
  /** Видеть все заявки, а не только свои. */
  | 'leads:viewAll'
  /** Назначать ответственного и снимать его. */
  | 'leads:assign'
  /** Работать с заявкой: стадия, комментарии, контрагент из заявки. */
  | 'leads:work'
  /** Видеть всех контрагентов, а не только своих. */
  | 'clients:viewAll'
  /** Править карточки контрагентов. */
  | 'clients:edit'
  /** Новости сайта и справочник услуг. */
  | 'content:manage'
  /** Сотрудники: заводить, править, блокировать. */
  | 'staff:manage'
  /** Системные настройки: стадии, состояние базы, общий чат бота. */
  | 'settings:system'
  /** Получать уведомления обо всех заявках, а не только о своих. */
  | 'notify:allLeads';

const MATRIX: Record<Action, RoleKey[]> = {
  'leads:viewAll': ['ADMIN', 'HEAD', 'VIEWER'],
  'leads:assign': ['ADMIN', 'HEAD'],
  'leads:work': ['ADMIN', 'HEAD', 'MANAGER'],
  'clients:viewAll': ['ADMIN', 'HEAD', 'VIEWER'],
  'clients:edit': ['ADMIN', 'HEAD', 'MANAGER'],
  'content:manage': ['ADMIN', 'HEAD'],
  'staff:manage': ['ADMIN'],
  'settings:system': ['ADMIN'],
  'notify:allLeads': ['ADMIN', 'HEAD'],
};

export const can = (role: string, action: Action) => MATRIX[action].includes(role as RoleKey);

/**
 * Условие выборки заявок: менеджер видит только назначенные ему. Заявка без
 * ответственного менеджеру не видна — её распределяют руководитель и
 * администратор, им же уходят уведомления по ней.
 */
export const leadScope = (user: Actor) =>
  can(user.role, 'leads:viewAll') ? {} : { ownerId: user.id };

/** То же для контрагентов: менеджеру — только те, где он менеджер. */
export const clientScope = (user: Actor) =>
  can(user.role, 'clients:viewAll') ? {} : { managerId: user.id };

/** Может ли работать с конкретной заявкой: своей — да, чужой — только сверху. */
export const canWorkLead = (user: Actor, lead: { ownerId: string | null }) =>
  can(user.role, 'leads:work') && (can(user.role, 'leads:viewAll') || lead.ownerId === user.id);

/** То же для карточки контрагента. */
export const canEditClient = (user: Actor, client: { managerId: string | null }) =>
  can(user.role, 'clients:edit') &&
  (can(user.role, 'clients:viewAll') || client.managerId === user.id);
