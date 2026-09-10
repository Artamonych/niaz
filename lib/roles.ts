/** Роли из прототипа CRM. Хранятся строкой: SQLite не поддерживает enum. */
export const ROLES = {
  HEAD: 'Руководитель отдела продаж',
  MANAGER: 'Менеджер по продажам',
  ADMIN: 'Администратор',
  VIEWER: 'Наблюдатель',
} as const;

export type RoleKey = keyof typeof ROLES;

export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];

export const roleTitle = (key: string) => ROLES[key as RoleKey] ?? key;

/** Наблюдатель только смотрит — любые изменения в CRM ему закрыты. */
export const canEdit = (role: string) => role !== 'VIEWER';

/** Сотрудников и услуги заводят администратор и руководитель отдела. */
export const canManageStaff = (role: string) => role === 'ADMIN' || role === 'HEAD';
