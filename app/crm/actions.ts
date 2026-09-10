'use server';

import { revalidatePath } from 'next/cache';
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
import { canEdit, canManageStaff } from '@/lib/roles';

export type ActionState = { error?: string; ok?: string };

/** Любое изменение в CRM проходит через эту проверку — наблюдатель только смотрит. */
async function requireEditor() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  if (!canEdit(user.role)) throw new Error('У роли «Наблюдатель» нет прав на изменения');
  return user;
}

async function requireStaffManager() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');
  if (!canManageStaff(user.role)) throw new Error('Недостаточно прав');
  return user;
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
  const user = await requireEditor();

  const [lead, stage] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, include: { stage: true } }),
    prisma.stage.findUnique({ where: { id: stageId } }),
  ]);
  if (!lead || !stage) throw new Error('Заявка или стадия не найдены');
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
        text: `Стадия заявки: ${lead.stage.title} → ${stage.title}`,
      },
    }),
  ]);

  revalidatePath('/crm');
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function assignLead(leadId: number, ownerId: string | null) {
  const user = await requireEditor();

  const owner = ownerId ? await prisma.user.findUnique({ where: { id: ownerId } }) : null;

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

  revalidatePath('/crm');
  revalidatePath(`/crm/leads/${leadId}`);
}

const commentSchema = z.string().trim().min(1, 'Комментарий пустой').max(4000);

export async function addComment(
  leadId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireEditor();

  const parsed = commentSchema.safeParse(formData.get('text'));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { clientId: true } });

  await prisma.event.create({
    data: {
      kind: 'comment',
      leadId,
      clientId: lead?.clientId,
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
  const user = await requireEditor();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Заявка не найдена');
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
  await requireEditor();

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.client.update({ where: { id: clientId }, data: parsed.data });

  revalidatePath(`/crm/clients/${clientId}`);
  revalidatePath('/crm/clients');
  return { ok: 'Карточка сохранена' };
}

const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Укажите название услуги').max(120),
  price: z.coerce.number().int().min(0, 'Цена не может быть отрицательной'),
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireEditor();

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

  revalidatePath('/crm/services');
  return { ok: 'Сохранено' };
}

export async function deleteService(id: string) {
  await requireEditor();
  await prisma.service.delete({ where: { id } });
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
  await requireStaffManager();

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

  revalidatePath('/crm/employees');
  return { ok: 'Сохранено' };
}

/** Сотрудников не удаляем: на них висят заявки и события. Отключаем доступ. */
export async function toggleEmployee(id: string, active: boolean) {
  await requireStaffManager();
  await prisma.user.update({ where: { id }, data: { active } });
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

  return { ok: 'Пароль изменён' };
}
