'use server';

import { randomBytes, randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { can, canEditClient, canWorkLead, type Action } from '@/lib/roles';
import { audit } from '@/lib/audit';
import { slugify } from '@/lib/news-shared';
import { removeNewsFiles } from '@/lib/uploads';
import { parseVideo } from '@/lib/video';
import { disconnectChat, notifyLeadAssigned } from '@/lib/telegram';
import {
  mailConfigured,
  notifyLeadAssignedByMail,
  sendBotInvite,
  sendPasswordReset,
  sendRegistrationInvite,
} from '@/lib/mail';
import { crmBase } from '@/lib/crm-url';
import { retryMail } from '@/lib/mailer';
import { botInviteLink } from '@/lib/telegram';

export type ActionState = { error?: string; ok?: string };

/** Кто действует. Без сессии — на вход. */
async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  return user;
}

/** Проверка по таблице прав (lib/roles.ts): роль либо может действие, либо нет. */
async function requireAction(action: Action) {
  const user = await requireUser();
  if (!can(user.role, action)) throw new Error('Недостаточно прав');
  return user;
}

/** Работа с конкретной заявкой: менеджеру — только со своей. */
async function requireLead(leadId: number) {
  const user = await requireUser();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Заявка не найдена');
  if (!canWorkLead(user, lead)) throw new Error('Эта заявка назначена другому сотруднику');
  return { user, lead };
}

/** Повторить отправку письма из очереди — вручную, из раздела «Почта». */
export async function retryMailMessage(id: string) {
  const user = await requireAction('settings:system');
  const message = await prisma.mailMessage.findUnique({ where: { id }, select: { to: true } });
  if (!message) return;

  await retryMail(id);
  await audit(user, 'mail.retry', `Письмо ${message.to}`);
  revalidatePath('/crm/mail');
}

/**
 * Отключить чат Telegram от заявок. Свой чат отключает сам сотрудник, чужой
 * и общий чат отдела — только тот, кому доступны системные настройки.
 */
export async function disconnectTelegramChat(chatId: string) {
  const user = await requireUser();
  const chat = await prisma.telegramChat.findUnique({ where: { id: chatId } });
  if (!chat) return;
  if (chat.userId !== user.id && !can(user.role, 'settings:system')) {
    throw new Error('Недостаточно прав');
  }

  await disconnectChat(chatId);
  await audit(
    user,
    'telegram.disconnect',
    `Чат ${chat.title}`,
    chat.userId === user.id ? 'свой чат' : 'чат отдела или другого сотрудника',
  );
  revalidatePath('/crm/settings');
}

/**
 * Личный токен для ссылки в бота. Выдаётся по требованию: пока сотрудник не
 * захотел уведомления, токена у него нет и ссылку подсунуть некому.
 * Повторный вызов выдаёт новый токен — старая ссылка перестаёт работать,
 * уже привязанные чаты остаются.
 */
export async function refreshBotToken() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { tgToken: randomUUID().replace(/-/g, '').slice(0, 16) },
  });
  revalidatePath('/crm/settings');
  revalidatePath('/crm/employees');
}

/**
 * Прислать себе письмо с личной ссылкой на бота — так это описал заказчик:
 * сотрудник переходит в бота из письма. Токен выдаётся, если его ещё нет.
 */
export async function mailBotInviteToSelf() {
  const user = await requireUser();

  let record = await prisma.user.findUnique({ where: { id: user.id }, select: { tgToken: true } });
  if (!record?.tgToken) {
    record = await prisma.user.update({
      where: { id: user.id },
      data: { tgToken: randomUUID().replace(/-/g, '').slice(0, 16) },
      select: { tgToken: true },
    });
  }

  const link = record.tgToken ? await botInviteLink(record.tgToken) : null;
  if (!link) throw new Error('Бот ещё не вышел на связь — ссылку выдать нечем');

  await sendBotInvite(user.email, user.fio, link);
  await audit(user, 'telegram.connect', `Сотрудник ${user.fio}`, 'отправлено письмо со ссылкой на бота');
  revalidatePath('/crm/settings');
}

const loginSchema = z.object({
  email: z.string().trim().email('Проверьте адрес почты'),
  password: z.string().min(1, 'Введите пароль'),
});

/**
 * Защита от перебора пароля (п. 34 бэклога).
 *
 * Счёт ведётся в памяти процесса: приложение одно, отдельная таблица ради
 * этого не нужна, а запись в базу на каждую попытку сама стала бы рычагом
 * нагрузки. После перезапуска счёт обнуляется — для CRM отдела это приемлемо.
 * Считаем и по учётной записи (подбор пароля к конкретному человеку), и по
 * адресу в сети (перебор учёток подряд).
 */
const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 10 };
const loginFails = new Map<string, number[]>();

const freshFails = (key: string, now: number) =>
  (loginFails.get(key) ?? []).filter((t) => now - t < LOGIN_LIMIT.windowMs);

function loginBlocked(keys: string[]): boolean {
  const now = Date.now();
  return keys.some((key) => freshFails(key, now).length >= LOGIN_LIMIT.max);
}

function loginFailed(keys: string[]) {
  const now = Date.now();
  for (const key of keys) loginFails.set(key, [...freshFails(key, now), now]);
}

/**
 * Хеш, с которым сверяется пароль, когда учётной записи нет. Без него ответ на
 * несуществующий адрес приходит заметно быстрее, и по задержке видно, заведён
 * ли такой сотрудник.
 */
let absentHash: Promise<string> | null = null;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const head = await headers();
  const ip = head.get('x-forwarded-for')?.split(',')[0].trim() ?? head.get('x-real-ip') ?? 'unknown';
  const keys = [`email:${parsed.data.email}`, `ip:${ip}`];

  if (loginBlocked(keys)) {
    return { error: 'Слишком много попыток входа. Попробуйте через четверть часа.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Одна формулировка на «нет пользователя» и «неверный пароль»: не подсказываем перебором.
  if (!user || !user.active) {
    absentHash ??= hashPassword(randomUUID());
    await verifyPassword(parsed.data.password, await absentHash);
    loginFailed(keys);
    return { error: 'Неверная почта или пароль' };
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    loginFailed(keys);
    return { error: 'Неверная почта или пароль' };
  }

  for (const key of keys) loginFails.delete(key);

  await createSession({
    userId: user.id,
    role: user.role,
    fio: user.fio,
    pv: user.passwordVersion,
  });
  redirect('/crm');
}

export async function logout() {
  await destroySession();
  redirect('/crm/login');
}

export async function moveLead(leadId: number, stageId: string) {
  const { user, lead } = await requireLead(leadId);

  const [stage, from] = await Promise.all([
    prisma.stage.findUnique({ where: { id: stageId } }),
    prisma.stage.findUnique({ where: { id: lead.stageId } }),
  ]);
  if (!stage || !from) throw new Error('Стадия не найдена');
  if (lead.stageId === stageId) return;

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { stageId } }),
    prisma.event.create({
      data: {
        kind: 'system',
        leadId,
        clientId: lead.clientId,
        authorId: user.id,
        authorName: user.fio,
        text: `Стадия заявки: ${from.title} → ${stage.title}`,
      },
    }),
  ]);

  await audit(user, 'lead.stage', `Заявка ${lead.num}`, `${from.title} → ${stage.title}`);

  revalidatePath('/crm');
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function assignLead(leadId: number, ownerId: string | null) {
  const user = await requireAction('leads:assign');

  const [owner, lead] = await Promise.all([
    ownerId ? prisma.user.findUnique({ where: { id: ownerId } }) : null,
    prisma.lead.findUnique({ where: { id: leadId } }),
  ]);
  if (!lead) throw new Error('Заявка не найдена');

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { ownerId } }),
    prisma.event.create({
      data: {
        kind: 'system',
        leadId,
        authorId: user.id,
        authorName: user.fio,
        text: owner ? `Ответственный: ${owner.fio}` : 'Ответственный снят',
      },
    }),
  ]);

  // Менеджер не получал эту заявку, когда она пришла с сайта: ответственного
  // ещё не было. Сообщаем ему теперь — и только ему.
  if (ownerId && ownerId !== user.id) {
    after(() => notifyLeadAssigned({ ...lead, ownerId }, ownerId));
    after(() => notifyLeadAssignedByMail({ ...lead, ownerId }, ownerId));
  }

  await audit(user, 'lead.assign', `Заявка ${lead.num}`, owner ? owner.fio : 'ответственный снят');

  revalidatePath('/crm');
  revalidatePath(`/crm/leads/${leadId}`);
}

/**
 * Корзина заявок (п. 30 бэклога). Заявка — персональные данные и история
 * работы с клиентом, поэтому удаление обратимо: заявка уходит с доски и из
 * счётчиков, но лежит в «Корзине», пока её не вернут или не сотрут.
 */
export async function trashLead(leadId: number) {
  const user = await requireAction('leads:delete');
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.deletedAt) return;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date(), deletedBy: user.fio },
    }),
    // Запись остаётся в ленте контрагента: там видно, что заявку убрали.
    prisma.event.create({
      data: {
        kind: 'system',
        leadId,
        clientId: lead.clientId,
        authorId: user.id,
        authorName: user.fio,
        text: 'Заявка убрана в корзину',
      },
    }),
  ]);

  await audit(user, 'lead.trash', `Заявка ${lead.num}`, lead.fio);

  revalidatePath('/crm');
  revalidatePath('/crm/leads/trash');
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function restoreLead(leadId: number) {
  const user = await requireAction('leads:delete');
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !lead.deletedAt) return;

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { deletedAt: null, deletedBy: null } }),
    prisma.event.create({
      data: {
        kind: 'system',
        leadId,
        clientId: lead.clientId,
        authorId: user.id,
        authorName: user.fio,
        text: 'Заявка возвращена из корзины',
      },
    }),
  ]);

  await audit(user, 'lead.restore', `Заявка ${lead.num}`, lead.fio);

  revalidatePath('/crm');
  revalidatePath('/crm/leads/trash');
  revalidatePath(`/crm/leads/${leadId}`);
}

/**
 * Стереть насовсем — только из корзины и только администратором. Лента
 * событий заявки уходит каскадом; контрагент, заведённый из неё, остаётся.
 */
export async function purgeLead(leadId: number) {
  const user = await requireAction('leads:purge');
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  if (!lead.deletedAt) throw new Error('Сначала уберите заявку в корзину');

  await prisma.lead.delete({ where: { id: leadId } });
  await audit(user, 'lead.purge', `Заявка ${lead.num}`, `${lead.fio}, стёрта насовсем`);

  revalidatePath('/crm');
  revalidatePath('/crm/leads/trash');
  redirect('/crm/leads/trash/');
}

const commentSchema = z.string().trim().min(1, 'Комментарий пустой').max(4000);

export async function addComment(
  leadId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, lead } = await requireLead(leadId);

  const parsed = commentSchema.safeParse(formData.get('text'));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.event.create({
    data: {
      kind: 'comment',
      leadId,
      clientId: lead.clientId,
      authorId: user.id,
      authorName: user.fio,
      text: parsed.data,
    },
  });

  revalidatePath(`/crm/leads/${leadId}`);
  return { ok: 'Комментарий добавлен' };
}

/**
 * Превращает заявку в контрагента: тендерным закупкам нужна карточка
 * с ИНН и банковскими реквизитами, а не строка в канбане.
 */
export async function convertToClient(leadId: number) {
  const { user, lead } = await requireLead(leadId);
  if (lead.clientId) redirect(`/crm/clients/${lead.clientId}`);

  const client = await prisma.client.create({
    data: {
      name: lead.org || lead.fio,
      inn: lead.inn,
      contact: lead.fio,
      phone: lead.phone,
      email: lead.email,
      comment: lead.comment,
      source: lead.source,
      managerId: lead.ownerId ?? user.id,
      leads: { connect: { id: lead.id } },
      events: {
        create: {
          kind: 'system',
          authorId: user.id,
          authorName: user.fio,
          text: `Контрагент заведён из заявки ${lead.num}`,
        },
      },
    },
  });

  await audit(user, 'lead.convert', `Контрагент ${client.name}`, `из заявки ${lead.num}`);

  revalidatePath('/crm');
  revalidatePath('/crm/clients');
  redirect(`/crm/clients/${client.id}`);
}

/**
 * Передача контрагента другому менеджеру. Вместе с карточкой переходят его
 * заявки — иначе новый ответственный не увидит ни одной и не сможет работать.
 *
 * Авторство прошлых записей в истории не меняется: их писали другие люди, и
 * подменять автора — значит испортить историю. Вместо этого добавляется
 * отдельная запись о самой передаче.
 */
async function handOverClient(
  user: { id: string; fio: string },
  clientId: string,
  clientName: string,
  fromId: string | null,
  toId: string | null,
) {
  const [from, to] = await Promise.all([
    fromId ? prisma.user.findUnique({ where: { id: fromId }, select: { fio: true } }) : null,
    toId ? prisma.user.findUnique({ where: { id: toId }, select: { fio: true } }) : null,
  ]);

  const was = from?.fio ?? 'без ответственного';
  const now = to?.fio ?? 'без ответственного';
  const text = `Контрагент передан: ${was} → ${now}`;

  const leads = await prisma.lead.findMany({ where: { clientId }, select: { id: true } });

  await prisma.$transaction([
    prisma.lead.updateMany({ where: { clientId }, data: { ownerId: toId } }),
    prisma.event.create({
      data: { kind: 'system', clientId, authorId: user.id, authorName: user.fio, text },
    }),
    // По записи в ленту каждой заявки: менеджер смотрит заявку, а не карточку.
    ...leads.map((lead) =>
      prisma.event.create({
        data: {
          kind: 'system',
          leadId: lead.id,
          authorId: user.id,
          authorName: user.fio,
          text: `Ответственный: ${now} (вместе с контрагентом)`,
        },
      }),
    ),
  ]);

  await audit(user, 'client.assign', `Контрагент ${clientName}`, `${was} → ${now}, заявок: ${leads.length}`);
  revalidatePath('/crm');
}

const clientSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название организации').max(200),
  /** Ответственный менеджер. Меняют только те, кто вправе назначать заявки. */
  managerId: z.string().trim().max(40).optional(),
  inn: z.string().trim().regex(/^(\d{10}|\d{12})?$/, 'ИНН — 10 или 12 цифр').optional(),
  kpp: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  contact: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(2000).optional(),
  bankAccount: z.string().trim().max(34).optional(),
  bankBik: z.string().trim().max(12).optional(),
  bankName: z.string().trim().max(200).optional(),
  bankCorr: z.string().trim().max(34).optional(),
  address: z.string().trim().max(300).optional(),
});

export async function saveClient(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { managerId: true, name: true },
  });
  if (!client) return { error: 'Контрагент не найден' };
  if (!canEditClient(user, client)) {
    return { error: 'Этот контрагент закреплён за другим менеджером' };
  }

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { managerId, ...fields } = parsed.data;
  // Передавать контрагента другому вправе те же, кто назначает заявки.
  const handover = can(user.role, 'leads:assign') && (managerId ?? '') !== (client.managerId ?? '');
  const nextManagerId = handover ? managerId || null : undefined;

  await prisma.client.update({
    where: { id: clientId },
    data: { ...fields, ...(nextManagerId !== undefined ? { managerId: nextManagerId } : {}) },
  });

  if (handover) await handOverClient(user, clientId, fields.name, client.managerId, nextManagerId ?? null);
  else await audit(user, 'client.update', `Контрагент ${fields.name}`);

  revalidatePath(`/crm/clients/${clientId}`);
  revalidatePath('/crm/clients');
  return { ok: 'Карточка сохранена' };
}

const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название услуги').max(120),
  price: z.coerce.number().int().min(0, 'Цена не может быть отрицательной'),
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAction('content:manage');

  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const id = String(formData.get('id') ?? '');
  if (id) {
    await prisma.service.update({ where: { id }, data: parsed.data });
  } else {
    const exists = await prisma.service.findUnique({ where: { name: parsed.data.name } });
    if (exists) return { error: 'Услуга с таким названием уже есть' };
    await prisma.service.create({ data: parsed.data });
  }

  await audit(actor, 'service.save', `Услуга ${parsed.data.name}`, `${parsed.data.price} ₽`);

  revalidatePath('/crm/services');
  return { ok: 'Сохранено' };
}

export async function deleteService(id: string) {
  const actor = await requireAction('content:manage');
  const service = await prisma.service.delete({ where: { id } });
  await audit(actor, 'service.delete', `Услуга ${service.name}`);
  revalidatePath('/crm/services');
}

const employeeSchema = z.object({
  fio: z.string().trim().min(2, 'Укажите ФИО').max(120),
  email: z.string().trim().email('Проверьте адрес почты'),
  phone: z.string().trim().max(32).optional(),
  role: z.enum(['HEAD', 'MANAGER', 'ADMIN', 'VIEWER'], { message: 'Выберите роль' }),
});

/**
 * Временный пароль: 12 знаков из алфавита без похожих друг на друга символов
 * (нет 0/O, 1/l/I) — его диктуют по телефону и перепечатывают из письма.
 *
 * Алфавит ровно 32 знака, поэтому остаток от деления байта распределён
 * равномерно и случайность не перекашивается.
 */
const TEMP_ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
const tempPassword = () =>
  Array.from(randomBytes(12), (byte) => TEMP_ABC[byte % TEMP_ABC.length]).join('');

/** Личный токен привязки Telegram — чтобы ссылка на бота попала в первое письмо. */
const newTgToken = () => randomUUID().replace(/-/g, '').slice(0, 16);

/**
 * Выдать сотруднику временный пароль и отправить письмо. Возвращает строку для
 * администратора: письмо ушло — говорим об этом, почта выключена или письмо не
 * принято — показываем пароль на экране, иначе доступ окажется никому не известен.
 */
async function issueTempPassword(
  user: { id: string; fio: string; email: string; tgToken: string | null },
  kind: 'new' | 'reset',
): Promise<string> {
  const password = tempPassword();
  const tgToken = user.tgToken ?? newTgToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      tgToken,
      // Сброс доступа обязан выбить того, кто сидит по старому паролю.
      passwordVersion: { increment: 1 },
    },
  });

  const loginUrl = crmBase() ? `${crmBase()}/crm/login/` : '';

  if (!mailConfigured()) {
    return `Почта выключена — передайте временный пароль лично: ${password}`;
  }

  try {
    if (kind === 'new') {
      await sendRegistrationInvite(
        user.email,
        user.fio,
        password,
        loginUrl,
        await botInviteLink(tgToken),
      );
    } else {
      await sendPasswordReset(user.email, user.fio, password, loginUrl);
    }
    return `Письмо с доступом отправлено на ${user.email}`;
  } catch (err) {
    return `Письмо не отправлено (${(err as Error).message}). Временный пароль: ${password}`;
  }
}

export async function saveEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAction('staff:manage');

  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rest = parsed.data;
  const id = String(formData.get('id') ?? '');

  if (id) {
    await prisma.user.update({ where: { id }, data: rest });
    await audit(actor, 'employee.save', `Сотрудник ${rest.fio}`, `изменён, роль ${rest.role}`);
    revalidatePath('/crm/employees');
    return { ok: 'Сохранено' };
  }

  const exists = await prisma.user.findUnique({ where: { email: rest.email } });
  if (exists) return { error: 'Сотрудник с такой почтой уже заведён' };

  // Пароль придумывает система: набранный администратором пароль знают двое.
  const created = await prisma.user.create({
    data: { ...rest, passwordHash: '', mustChangePassword: true },
    select: { id: true, fio: true, email: true, tgToken: true },
  });
  const note = await issueTempPassword(created, 'new');

  await audit(actor, 'employee.invite', `Сотрудник ${rest.fio}`, `роль ${rest.role}`);

  revalidatePath('/crm/employees');
  return { ok: `Сотрудник заведён. ${note}` };
}

/** Сброс доступа: сотрудник забыл пароль или пароль мог утечь. */
export async function resetEmployeePassword(id: string): Promise<ActionState> {
  const actor = await requireAction('staff:manage');

  const employee = await prisma.user.findUnique({
    where: { id },
    select: { id: true, fio: true, email: true, tgToken: true },
  });
  if (!employee) return { error: 'Сотрудник не найден' };

  const note = await issueTempPassword(employee, 'reset');
  await audit(actor, 'password.reset', `Сотрудник ${employee.fio}`, 'выдан временный пароль');

  revalidatePath('/crm/employees');
  return { ok: `Пароль сброшен. ${note}` };
}

const firstPasswordSchema = z
  .object({
    next: z.string().min(8, 'Новый пароль от 8 символов'),
    repeat: z.string(),
  })
  .refine((v) => v.next === v.repeat, { message: 'Пароли не совпадают' });

/**
 * Замена временного пароля на постоянный. Текущий пароль здесь не спрашиваем:
 * сотрудник только что вошёл с ним, а лишний ввод провоцирует держать письмо
 * открытым рядом. До замены разделы CRM не открываются — см. layout.
 */
export async function setInitialPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const parsed = firstPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Действие годится только для временного пароля: текущий здесь не
  // спрашивается, и без этой проверки чужой открытой сессии хватило бы, чтобы
  // назначить свой пароль и закрепиться в ней (п. 34 бэклога).
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (!record?.mustChangePassword) redirect('/crm');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.next),
      mustChangePassword: false,
      passwordVersion: { increment: 1 },
    },
    select: { role: true, fio: true, passwordVersion: true },
  });
  // Своя же кука помнит прежнее поколение пароля — выдаём её заново.
  await createSession({
    userId: user.id,
    role: updated.role,
    fio: updated.fio,
    pv: updated.passwordVersion,
  });
  await audit(user, 'password.change', `Сотрудник ${user.fio}`, 'заменил временный пароль');

  redirect('/crm');
}

/**
 * Удалить сотрудника насовсем. Пока на нём висят контрагенты — нельзя:
 * сначала передайте их другому (карточка контрагента → «Ответственный»),
 * вместе с ними перейдут и заявки.
 *
 * Заявки без контрагента становятся нераспределёнными, а история остаётся:
 * имя автора хранится в событии строкой и переживает удаление учётной записи.
 * Если удалять нечего — есть «Отключить»: доступ закрыт, данные на месте.
 */
export async function deleteEmployee(id: string): Promise<ActionState> {
  const actor = await requireAction('staff:manage');
  if (id === actor.id) return { error: 'Нельзя удалить самого себя' };

  const employee = await prisma.user.findUnique({
    where: { id },
    select: { fio: true, _count: { select: { clients: true, leads: true } } },
  });
  if (!employee) return { error: 'Сотрудник не найден' };

  if (employee._count.clients > 0) {
    return {
      error: `На сотруднике ${employee._count.clients} контрагент(ов) — сначала передайте их другому менеджеру`,
    };
  }

  await prisma.$transaction([
    // Заявки не удаляем: это история продаж. Просто снимаем ответственного.
    prisma.lead.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
    // Автор события остаётся подписью, ссылка на учётную запись обнуляется.
    prisma.event.updateMany({ where: { authorId: id }, data: { authorId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  await audit(
    actor,
    'employee.delete',
    `Сотрудник ${employee.fio}`,
    employee._count.leads ? `заявок снято с ответственного: ${employee._count.leads}` : 'без заявок',
  );

  revalidatePath('/crm/employees');
  revalidatePath('/crm');
  return { ok: 'Сотрудник удалён' };
}

/** Отключить доступ, не удаляя: данные и история остаются на месте. */
export async function toggleEmployee(id: string, active: boolean) {
  const actor = await requireAction('staff:manage');
  const employee = await prisma.user.update({ where: { id }, data: { active } });
  await audit(actor, 'employee.block', `Сотрудник ${employee.fio}`, active ? 'доступ включён' : 'доступ отключён');
  revalidatePath('/crm/employees');
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Введите текущий пароль'),
    next: z.string().min(8, 'Новый пароль от 8 символов'),
    repeat: z.string(),
  })
  .refine((v) => v.next === v.repeat, { message: 'Пароли не совпадают' });

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(parsed.data.current, record.passwordHash))) {
    return { error: 'Текущий пароль неверен' };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.next),
      passwordVersion: { increment: 1 },
    },
    select: { role: true, fio: true, passwordVersion: true },
  });
  // Прочие сессии — забытый браузер, чужое устройство — после смены не работают.
  await createSession({
    userId: user.id,
    role: updated.role,
    fio: updated.fio,
    pv: updated.passwordVersion,
  });
  await audit(user, 'password.change', `Сотрудник ${user.fio}`, 'сменил себе пароль');

  return { ok: 'Пароль изменён' };
}

/*
 * Новости. Публичные страницы ленты рендерятся на каждый запрос, поэтому после
 * правок сбрасывается только кэш экранов CRM — сайт увидит изменения сам.
 */

const newsSchema = z.object({
  title: z.string().trim().min(3, 'Заголовок — от 3 символов').max(200),
  excerpt: z
    .string()
    .trim()
    .min(10, 'Анонс — от 10 символов')
    .max(400, 'Анонс — до 400 символов: он идёт в карточку ленты'),
  body: z.string().trim().min(10, 'Текст новости пустой').max(20000),
  videoUrl: z.string().trim().max(500).optional(),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Адрес — только латиница, цифры и дефис')
    .optional(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Проверьте дату публикации'),
  status: z.enum(['DRAFT', 'PUBLISHED'], { message: 'Выберите статус' }),
});

/** Свободный адрес: занятый дополняется номером, как делал WordPress донора. */
async function freeNewsSlug(base: string, exceptId: string | null) {
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === exceptId) return slug;
  }
}

/**
 * Создание и правка новости. Новая после сохранения открывается на своей
 * странице: фото привязываются к записи, поэтому загружаются вторым шагом.
 */
export async function saveNews(
  postId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAction('content:manage');

  const parsed = newsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { slug: wanted, videoUrl, publishedAt, ...rest } = parsed.data;
  if (videoUrl && !parseVideo(videoUrl)) {
    return { error: 'Ссылка на видео не похожа на адрес страницы — начните с https://' };
  }

  const data = {
    ...rest,
    slug: await freeNewsSlug(wanted || slugify(rest.title), postId),
    videoUrl: videoUrl || null,
    publishedAt: new Date(`${publishedAt}T00:00:00Z`),
  };

  const state = rest.status === 'PUBLISHED' ? 'опубликована' : 'черновик';

  if (postId) {
    await prisma.newsPost.update({ where: { id: postId }, data });
    await audit(actor, 'news.save', `Новость «${rest.title}»`, `изменена, ${state}`);
    revalidatePath('/crm/news');
    revalidatePath(`/crm/news/${postId}`);
    return { ok: rest.status === 'PUBLISHED' ? 'Сохранено и опубликовано' : 'Черновик сохранён' };
  }

  const created = await prisma.newsPost.create({ data });
  await audit(actor, 'news.save', `Новость «${rest.title}»`, `создана, ${state}`);
  revalidatePath('/crm/news');
  redirect(`/crm/news/${created.id}/`);
}

export async function deleteNews(postId: string) {
  const actor = await requireAction('content:manage');

  const photos = await prisma.newsPhoto.findMany({ where: { postId }, select: { file: true } });
  const post = await prisma.newsPost.delete({ where: { id: postId } });
  // Строки фото ушли каскадом, файлы на диске — нет: чистим сами.
  await removeNewsFiles(photos.map((p) => p.file));

  await audit(
    actor,
    'news.delete',
    `Новость «${post.title}»`,
    photos.length ? `вместе с фото: ${photos.length}` : 'без фото',
  );

  revalidatePath('/crm/news');
  redirect('/crm/news/');
}

export async function deleteNewsPhoto(photoId: string) {
  const actor = await requireAction('content:manage');

  const photo = await prisma.newsPhoto.findUnique({
    where: { id: photoId },
    include: { post: { select: { title: true } } },
  });
  if (!photo) return;

  await prisma.newsPhoto.delete({ where: { id: photoId } });
  await removeNewsFiles([photo.file]);
  await audit(actor, 'news.photo', `Новость «${photo.post.title}»`, 'удалено фото');

  // Без превью лента показала бы новость без картинки — назначаем следующее фото.
  if (photo.isCover) {
    const next = await prisma.newsPhoto.findFirst({
      where: { postId: photo.postId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    if (next) await prisma.newsPhoto.update({ where: { id: next.id }, data: { isCover: true } });
  }

  revalidatePath(`/crm/news/${photo.postId}`);
}

export async function setNewsCover(photoId: string) {
  const user = await requireAction('content:manage');

  const photo = await prisma.newsPhoto.findUnique({
    where: { id: photoId },
    include: { post: { select: { title: true } } },
  });
  if (!photo) return;

  await prisma.$transaction([
    prisma.newsPhoto.updateMany({ where: { postId: photo.postId }, data: { isCover: false } }),
    prisma.newsPhoto.update({ where: { id: photoId }, data: { isCover: true } }),
  ]);

  await audit(user, 'news.photo', `Новость «${photo.post.title}»`, 'выбрано превью');

  revalidatePath(`/crm/news/${photo.postId}`);
}

export async function moveNewsPhoto(photoId: string, step: -1 | 1) {
  const user = await requireAction('content:manage');

  const photo = await prisma.newsPhoto.findUnique({
    where: { id: photoId },
    include: { post: { select: { title: true } } },
  });
  if (!photo) return;

  const photos = await prisma.newsPhoto.findMany({
    where: { postId: photo.postId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  const from = photos.findIndex((p) => p.id === photoId);
  const to = from + step;
  if (to < 0 || to >= photos.length) return;

  [photos[from], photos[to]] = [photos[to], photos[from]];
  // Перенумеровываем все: после удалений в порядке остаются дыры.
  await prisma.$transaction(
    photos.map((p, order) => prisma.newsPhoto.update({ where: { id: p.id }, data: { order } })),
  );

  await audit(user, 'news.photo', `Новость «${photo.post.title}»`, 'переставлено фото');

  revalidatePath(`/crm/news/${photo.postId}`);
}
