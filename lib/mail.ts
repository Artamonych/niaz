/**
 * Что и кому писать. Сама отправка — в lib/mailer.ts: письма кладутся в
 * очередь и уходят напрямую на почтовые узлы получателей.
 *
 * Кому что полагается, решают те же права, что и в Telegram-боте:
 * администратор и руководитель получают все заявки, менеджер — назначенные
 * ему. Почта — второй канал: пока она выключена или письмо не дошло, заявка
 * всё равно лежит в CRM.
 */
import { prisma } from './db';
import { can } from './roles';
import { leadUrl } from './crm-url';
import { mailerConfigured, queueMail } from './mailer';

const env = (key: string) => process.env[key]?.trim() ?? '';

export const mailConfigured = mailerConfigured;

export type LeadMail = {
  id: number;
  num: string;
  fio: string;
  phone: string;
  email: string | null;
  org: string | null;
  inn: string | null;
  comment: string | null;
  subject: string | null;
  sourceUrl: string | null;
  ownerId?: string | null;
};

/**
 * Общий ящик отдела (если задан) плюс почта тех, кому заявка полагается:
 * администраторы и руководители — всегда, ответственный менеджер — по
 * назначению. Отключённые сотрудники писем не получают.
 */
async function recipients(lead: LeadMail) {
  const shared = env('MAIL_TO')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);

  const staff = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, email: true, role: true },
  });

  return [
    ...shared,
    ...staff
      .filter((user) => can(user.role, 'notify:allLeads') || user.id === lead.ownerId)
      .map((user) => user.email),
  ];
}

function leadText(lead: LeadMail) {
  // Поля собираются списком, пустые отбрасываются. Абзацы склеиваются в
  // конце: раньше пустые строки фильтровались по номерам, и стоило одному
  // полю опустеть — из письма пропадала ссылка на CRM.
  const fields = [
    `Имя: ${lead.fio}`,
    `Телефон: ${lead.phone}`,
    lead.email && `Почта: ${lead.email}`,
    lead.org && `Организация: ${lead.org}`,
    lead.inn && `ИНН: ${lead.inn}`,
    lead.comment && `Задача: ${lead.comment}`,
    lead.sourceUrl && `Страница: ${lead.sourceUrl}`,
  ].filter(Boolean);

  const url = leadUrl(lead.id);

  return [
    `Заявка ${lead.num}${lead.subject ? ` — ${lead.subject}` : ''}`,
    fields.join('\n'),
    url && `Открыть в CRM: ${url}`,
    // Ящика отправителя не существует, и ответ ушёл бы в пустоту — говорим
    // об этом прямо, а не оставляем человека в заблуждении.
    '— Письмо отправлено автоматически с сайта НиАЗ.\nОтвечать на него не нужно: адрес не читается. Работа с заявкой — в CRM.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Новая заявка с сайта. */
export async function notifyLeadByMail(lead: LeadMail) {
  await queueMail(await recipients(lead), `Заявка ${lead.num} с сайта НиАЗ`, leadText(lead));
}

/** Заявку назначили менеджеру — письмо только ему. */
export async function notifyLeadAssignedByMail(lead: LeadMail, ownerId: string) {
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, active: true },
    select: { email: true },
  });
  if (!owner) return;

  await queueMail(
    [owner.email],
    `Заявка ${lead.num} — теперь ваша`,
    `Вас назначили ответственным по заявке.\n\n${leadText(lead)}`,
  );
}

/**
 * Письмо с личной ссылкой на бота: сотрудник переходит по ней, жмёт «Старт»,
 * и чат привязывается к его учётной записи. Ссылка личная — в письме об этом
 * сказано прямо, пересылать её нельзя.
 */
export async function sendBotInvite(to: string, fio: string, link: string) {
  if (!mailerConfigured()) throw new Error('Почта не настроена: письмо не отправлено');

  await queueMail(
    [to],
    'Заявки НиАЗ в Telegram',
    [
      `${fio}, здравствуйте!`,
      '',
      'Чтобы получать заявки с сайта в Telegram, откройте ссылку и нажмите «Старт»:',
      link,
      '',
      'Ссылка личная: она привязывает чат к вашей учётной записи в CRM.',
      'Не пересылайте её — иначе заявки будут приходить чужому человеку.',
      '',
      '— Письмо отправлено автоматически. Отвечать на него не нужно: адрес не читается.',
    ].join('\n'),
  );
}
