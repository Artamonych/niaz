'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
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

const loginSchema = z.object({
  email: z.string().trim().email('Проверьте адрес почты'),
  password: z.string().min(1, 'Введите пароль'),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Одна формулировка на «нет пользователя» и «неверный пароль»: не подсказываем перебором.
  if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Неверная почта или пароль' };
  }

  await createSession({ userId: user.id, role: user.role, fio: user.fio });
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
  }

  await audit(user, 'lead.assign', `Заявка ${lead.num}`, owner ? owner.fio : 'ответственный снят');

  revalidatePath('/crm');
  revalidatePath(`/crm/leads/${leadId}`);
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

const clientSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название организации').max(200),
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
    select: { managerId: true },
  });
  if (!client) return { error: 'Контрагент не найден' };
  if (!canEditClient(user, client)) {
    return { error: 'Этот контрагент закреплён за другим менеджером' };
  }

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.client.update({ where: { id: clientId }, data: parsed.data });
  await audit(user, 'client.update', `Контрагент ${parsed.data.name}`);

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
  password: z.string().min(8, 'Пароль от 8 символов').optional().or(z.literal('')),
});

export async function saveEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAction('staff:manage');

  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { password, ...rest } = parsed.data;
  const id = String(formData.get('id') ?? '');

  if (id) {
    await prisma.user.update({
      where: { id },
      data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    });
  } else {
    if (!password) return { error: 'Задайте пароль для нового сотрудника' };
    const exists = await prisma.user.findUnique({ where: { email: rest.email } });
    if (exists) return { error: 'Сотрудник с такой почтой уже заведён' };
    await prisma.user.create({ data: { ...rest, passwordHash: await hashPassword(password) } });
  }

  await audit(
    actor,
    'employee.save',
    `Сотрудник ${rest.fio}`,
    `${id ? 'изменён' : 'заведён'}, роль ${rest.role}${password ? ', задан пароль' : ''}`,
  );

  revalidatePath('/crm/employees');
  return { ok: 'Сохранено' };
}

/** Сотрудников не удаляем: на них висят заявки и события. Отключаем доступ. */
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

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
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
  await requireAction('content:manage');

  const photo = await prisma.newsPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return;

  await prisma.$transaction([
    prisma.newsPhoto.updateMany({ where: { postId: photo.postId }, data: { isCover: false } }),
    prisma.newsPhoto.update({ where: { id: photoId }, data: { isCover: true } }),
  ]);

  revalidatePath(`/crm/news/${photo.postId}`);
}

export async function moveNewsPhoto(photoId: string, step: -1 | 1) {
  await requireAction('content:manage');

  const photo = await prisma.newsPhoto.findUnique({ where: { id: photoId } });
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

  revalidatePath(`/crm/news/${photo.postId}`);
}
