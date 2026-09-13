/**
 * Письма о заявках — второй канал к Telegram-боту (lib/telegram.ts).
 *
 * Кому что уходит, решают те же права, что и в боте: администратор и
 * руководитель получают все заявки, менеджер — только назначенные ему.
 * Пока в окружении нет ящика и пароля, отправка выключена и заявки живут
 * только в CRM: письма — дополнение, а не единственный путь.
 *
 * Провайдер российский (mail.ru, Яндекс) — персональные данные не должны
 * уходить за границу (152-ФЗ). Исходящий SMTP с VPS открыт, прокси не нужен.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from './db';
import { can } from './roles';
import { leadUrl } from './crm-url';

const env = (key: string) => process.env[key]?.trim() ?? '';

export const mailConfigured = () => Boolean(env('MAIL_HOST') && env('MAIL_USER') && env('MAIL_PASS'));

const log = (msg: string) => console.error(`[mail] ${msg}`);

let warned = false;

/**
 * Почта выключена? Молча пропускать нельзя: при неверных настройках письма
 * просто не приходят, и понять это неоткуда. Пишем в лог один раз за запуск.
 */
function offline() {
  if (mailConfigured()) return false;
  if (!warned) {
    warned = true;
    log('не заданы MAIL_HOST / MAIL_USER / MAIL_PASS — письма не отправляются');
  }
  return true;
}

let cached: Transporter | null = null;

function transport() {
  if (!cached) {
    // 465 — сразу TLS, 587 — STARTTLS: у mail.ru и Яндекса работают оба.
    const port = Number(env('MAIL_PORT') || '465');
    cached = nodemailer.createTransport({
      host: env('MAIL_HOST'),
      port,
      secure: port === 465,
      auth: { user: env('MAIL_USER'), pass: env('MAIL_PASS') },
    });
  }
  return cached;
}

async function send(to: string[], subject: string, text: string) {
  const recipients = [...new Set(to.filter(Boolean))];
  if (!recipients.length) return;

  await transport().sendMail({
    from: env('MAIL_FROM') || env('MAIL_USER'),
    to: recipients.join(', '),
    subject,
    text,
  });
}

// ─── Заявки ───

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
    .map((a) => a.trim())
    .filter(Boolean);

  const staff = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, email: true, role: true },
  });

  return [
    ...shared,
    ...staff
      .filter((u) => can(u.role, 'notify:allLeads') || u.id === lead.ownerId)
      .map((u) => u.email),
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
    '— Автоматическое письмо с сайта НиАЗ',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Новая заявка с сайта. Ошибки только в лог: заявка уже сохранена в CRM. */
export async function notifyLeadByMail(lead: LeadMail) {
  if (offline()) return;
  try {
    await send(await recipients(lead), `Заявка ${lead.num} с сайта НиАЗ`, leadText(lead));
  } catch (err) {
    log(`заявка ${lead.num}: ${(err as Error).message}`);
  }
}

/** Заявку назначили менеджеру — письмо только ему. */
export async function notifyLeadAssignedByMail(lead: LeadMail, ownerId: string) {
  if (offline()) return;
  try {
    const owner = await prisma.user.findFirst({
      where: { id: ownerId, active: true },
      select: { email: true },
    });
    if (!owner) return;

    await send(
      [owner.email],
      `Заявка ${lead.num} — теперь ваша`,
      `Вас назначили ответственным по заявке.\n\n${leadText(lead)}`,
    );
  } catch (err) {
    log(`назначение ${lead.num}: ${(err as Error).message}`);
  }
}

// ─── Приглашение в бота ───

/**
 * Письмо с личной ссылкой на бота: сотрудник переходит по ней, жмёт «Старт»,
 * и чат привязывается к его учётной записи. Ссылка личная — в письме об этом
 * сказано прямо, пересылать её нельзя.
 */
export async function sendBotInvite(to: string, fio: string, link: string) {
  if (!mailConfigured()) throw new Error('Почта не настроена: письмо не отправлено');

  await send(
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
      '— CRM НиАЗ',
    ].join('\n'),
  );
}
