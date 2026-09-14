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
 * Письмо о заведении учётной записи: адрес CRM, временный пароль и личная
 * ссылка на бота. Пароль временный намеренно — письмо живёт в почтовом ящике
 * и в журналах почтовых узлов, поэтому постоянному паролю там не место:
 * при первом входе CRM потребует его сменить.
 *
 * Ссылки на бота может не быть: она появляется, когда бот включён и опрос
 * узнал его имя. Тогда сотрудник подключит Telegram сам из раздела «Профиль».
 */
export async function sendRegistrationInvite(
  to: string,
  fio: string,
  tempPassword: string,
  crmUrl: string,
  botLink: string | null,
) {
  if (!mailerConfigured()) throw new Error('Почта не настроена: письмо не отправлено');

  await queueMail(
    [to],
    'Доступ в CRM НиАЗ',
    [
      `${fio}, здравствуйте!`,
      '',
      'Для вас заведена учётная запись в CRM НиАЗ.',
      '',
      `Адрес входа: ${crmUrl || 'спросите адрес у администратора'}`,
      `Логин: ${to}`,
      `Временный пароль: ${tempPassword}`,
      '',
      'При первом входе система попросит заменить временный пароль на',
      'постоянный — до этого разделы CRM не откроются.',
      ...(botLink
        ? [
            '',
            'Чтобы получать заявки в Telegram, откройте ссылку и нажмите «Старт»:',
            botLink,
            '',
            'Ссылка личная и одноразовая: она привязывает чат к вашей учётной',
            'записи и после этого перестаёт работать. Новую можно выдать себе',
            'в CRM, в разделе «Профиль».',
          ]
        : [
            '',
            'Заявки можно получать в Telegram — ссылку на бота вы найдёте',
            'в CRM, в разделе «Профиль».',
          ]),
      '',
      '— Письмо отправлено автоматически. Отвечать на него не нужно: адрес не читается.',
    ].join('\n'),
  );
}

/**
 * Письмо о сбросе пароля: доступ утерян или мог утечь, администратор выдал
 * новый временный пароль. Про бота здесь не пишем — он уже подключён или
 * подключается из «Профиля», а письмо должно быть коротким и понятным.
 */
export async function sendPasswordReset(
  to: string,
  fio: string,
  tempPassword: string,
  crmUrl: string,
) {
  if (!mailerConfigured()) throw new Error('Почта не настроена: письмо не отправлено');

  await queueMail(
    [to],
    'Новый пароль для входа в CRM НиАЗ',
    [
      `${fio}, здравствуйте!`,
      '',
      'Администратор сбросил пароль к вашей учётной записи в CRM.',
      '',
      `Адрес входа: ${crmUrl || 'спросите адрес у администратора'}`,
      `Логин: ${to}`,
      `Временный пароль: ${tempPassword}`,
      '',
      'При входе система попросит заменить его на постоянный.',
      'Если пароль сбрасывали не вы — сообщите администратору.',
      '',
      '— Письмо отправлено автоматически. Отвечать на него не нужно: адрес не читается.',
    ].join('\n'),
  );
}

/**
 * Письмо с личной ссылкой на бота: сотрудник переходит по ней, жмёт «Старт»,
 * и чат привязывается к его учётной записи. Ссылка одноразовая — после
 * привязки токен гасится, и пересланная кому-то ссылка уже не сработает.
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
      'Ссылка личная и одноразовая: она привязывает чат к вашей учётной записи',
      'и после этого перестаёт работать. Новую можно выдать себе в «Профиле».',
      '',
      '— Письмо отправлено автоматически. Отвечать на него не нужно: адрес не читается.',
    ].join('\n'),
  );
}
