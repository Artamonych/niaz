/**
 * Свой сервис отправки писем: без чужого почтового ящика.
 *
 * Письмо кладётся в очередь (таблица MailMessage), а фоновый обработчик
 * отправляет его напрямую на почтовый узел получателя — так же, как это
 * делают почтовые серверы между собой:
 *   1) по домену адреса находим MX-записи;
 *   2) соединяемся с узлом по порту 25, поднимаем TLS, если предложен;
 *   3) подписываем письмо DKIM — без подписи Яндекс и mail.ru кладут в спам.
 *
 * Временный отказ (код 4xx или обрыв связи) — не потеря: письмо остаётся в
 * очереди и уходит позже. Постоянный отказ (5xx) повторять бессмысленно,
 * письмо помечается неотправленным, и это видно в CRM.
 *
 * Чтобы письма доходили, вне кода нужны: обратная запись (PTR) на
 * MAIL_HELO, SPF, DKIM и DMARC в DNS домена отправителя.
 */
import { createTransport } from 'nodemailer';
import { resolveMx } from 'node:dns/promises';
import { readFileSync } from 'node:fs';
import { prisma } from './db';

const env = (key: string) => process.env[key]?.trim() ?? '';

/** Отправитель задан — значит, сервис включён. */
export const mailerConfigured = () => Boolean(env('MAIL_FROM'));

/** Имя, которым представляемся почтовому узлу. Должно совпадать с PTR. */
const helo = () => env('MAIL_HELO') || env('MAIL_FROM').split('@')[1] || 'localhost';

const log = (msg: string) => console.error(`[mail] ${msg}`);

let warned = false;

function offline() {
  if (mailerConfigured()) return false;
  if (!warned) {
    warned = true;
    log('не задан MAIL_FROM — письма не отправляются');
  }
  return true;
}

// ─── Подпись DKIM ───

let dkimCache: { domainName: string; keySelector: string; privateKey: string } | null | undefined;

function dkim() {
  if (dkimCache !== undefined) return dkimCache;

  const path = env('DKIM_KEY_PATH');
  const domainName = env('DKIM_DOMAIN') || env('MAIL_FROM').split('@')[1];
  const keySelector = env('DKIM_SELECTOR') || 'niaz';

  if (!path || !domainName) {
    dkimCache = null;
    log('DKIM не настроен — письма пойдут без подписи и, скорее всего, в спам');
    return dkimCache;
  }

  try {
    dkimCache = { domainName, keySelector, privateKey: readFileSync(path, 'utf8') };
  } catch (err) {
    dkimCache = null;
    log(`не прочитать ключ DKIM (${path}): ${(err as Error).message}`);
  }
  return dkimCache;
}

// ─── Отправка ───

/** Ошибка почтового узла: 4xx — можно повторить, 5xx — бессмысленно. */
function permanent(err: unknown) {
  const code = (err as { responseCode?: number }).responseCode;
  return typeof code === 'number' && code >= 500 && code < 600;
}

async function deliver(to: string, subject: string, text: string) {
  const domain = to.split('@')[1];
  if (!domain) throw Object.assign(new Error(`некорректный адрес: ${to}`), { responseCode: 550 });

  // MAIL_FORCE_MX — только для проверок: все письма уходят на указанный узел
  // вместо настоящего. На боевом сервере переменная не задаётся.
  const forced = env('MAIL_FORCE_MX');
  const mx = forced
    ? [{ exchange: forced, priority: 0 }]
    : (await resolveMx(domain)).sort((a, b) => a.priority - b.priority);
  if (!mx.length) throw Object.assign(new Error(`у домена ${domain} нет почтовых серверов`), { responseCode: 550 });

  const signature = dkim();
  let lastError: unknown;

  // Узлы перебираются по приоритету: первый может быть занят или на профилактике.
  for (const record of mx.slice(0, 3)) {
    try {
      const transport = createTransport({
        host: record.exchange,
        port: Number(env('MAIL_PORT') || '25'),
        secure: false,
        // STARTTLS поднимается, если узел его предлагает. Требовать нельзя:
        // часть серверов принимает почту без шифрования, и письмо важнее.
        ignoreTLS: false,
        requireTLS: false,
        // Сертификат чужого узла не проверяем: у почтовых серверов между
        // собой это норма, иначе половина писем не уйдёт.
        tls: { rejectUnauthorized: false },
        name: helo(),
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 60_000,
        ...(signature ? { dkim: signature } : {}),
      });

      await transport.sendMail({ from: env('MAIL_FROM'), to, subject, text });
      return record.exchange;
    } catch (err) {
      lastError = err;
      if (permanent(err)) throw err; // отказано по существу — другие узлы ответят так же
    }
  }

  throw lastError;
}

// ─── Очередь ───

/** Пауза до следующей попытки: минуты. Дальше письмо признаётся недоставленным. */
const RETRY_MINUTES = [2, 10, 30, 120, 360];

/** Поставить письмо в очередь — по записи на каждого получателя. */
export async function queueMail(to: string[], subject: string, body: string) {
  const list = [...new Set(to.filter(Boolean))];
  if (!list.length || offline()) return;

  await prisma.mailMessage.createMany({
    data: list.map((address) => ({ to: address, subject, body })),
  });
}

/** Отправить одно письмо из очереди и записать исход. */
async function processOne(message: { id: string; to: string; subject: string; body: string; attempts: number }) {
  try {
    const via = await deliver(message.to, message.subject, message.body);
    await prisma.mailMessage.update({
      where: { id: message.id },
      data: { status: 'sent', sentAt: new Date(), attempts: message.attempts + 1, lastError: null },
    });
    log(`отправлено ${message.to} через ${via}`);
  } catch (err) {
    const attempts = message.attempts + 1;
    const reason = (err as Error).message.slice(0, 500);
    const wait = RETRY_MINUTES[attempts - 1];
    const giveUp = permanent(err) || wait === undefined;

    await prisma.mailMessage.update({
      where: { id: message.id },
      data: {
        attempts,
        lastError: reason,
        status: giveUp ? 'failed' : 'pending',
        nextTryAt: giveUp ? new Date() : new Date(Date.now() + wait * 60_000),
      },
    });

    log(
      giveUp
        ? `НЕ ДОСТАВЛЕНО ${message.to}: ${reason}`
        : `${message.to}: ${reason}; повтор через ${wait} мин (попытка ${attempts})`,
    );
  }
}

/** Один проход по очереди. Возвращает число обработанных писем. */
export async function processMailQueue() {
  if (!mailerConfigured()) return 0;

  const due = await prisma.mailMessage.findMany({
    where: { status: 'pending', nextTryAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const message of due) await processOne(message);
  return due.length;
}

/** Повторить письмо вручную из CRM: сбрасывает отказ и ставит в очередь. */
export async function retryMail(id: string) {
  await prisma.mailMessage.update({
    where: { id },
    data: { status: 'pending', attempts: 0, nextTryAt: new Date(), lastError: null },
  });
}

const worker = globalThis as typeof globalThis & { __niazMailStarted?: boolean };

/** Запускается один раз при старте сервера (instrumentation.ts). */
export function startMailQueue() {
  if (worker.__niazMailStarted || !mailerConfigured()) return;
  worker.__niazMailStarted = true;

  const tick = async () => {
    try {
      await processMailQueue();
    } catch (err) {
      log(`очередь: ${(err as Error).message}`);
    }
  };

  log(`очередь запущена, отправитель ${env('MAIL_FROM')}, представляемся ${helo()}`);
  void tick();
  setInterval(tick, 60_000);
}
