/**
 * Бот заявок в Telegram — по образцу бота СК «Ока» (borbeton.ru).
 *
 * VPS не достаёт api.telegram.org, а Telegram не достучится до нас вебхуком,
 * поэтому всё идёт исходящими запросами через свой Cloudflare-воркер
 * (deploy/tg-proxy-worker.js):
 *   — чаты подключаются опросом getUpdates: /start КОД в личке или в группе;
 *   — каждая заявка с сайта уходит во все подключённые чаты;
 *   — по понедельникам в 9:00 МСК бот присылает число заявок за неделю.
 *
 * Telegram — дополнительный канал: заявка уже лежит в CRM, и сбой бота
 * посетителю не виден.
 */
import { prisma } from './db';

const env = (key: string) => process.env[key]?.trim() ?? '';
const token = () => env('TG_BOT_TOKEN');
const apiBase = () => (env('TG_API_BASE') || 'https://api.telegram.org').replace(/\/+$/, '');
const joinCode = () => env('TG_JOIN_CODE');

/** Бот включается, только когда заданы и токен, и код доступа. */
export const botConfigured = () => Boolean(token() && joinCode());
export const botJoinCode = joinCode;

// ─── Bot API ───

/** Ошибка, которую вернул сам Telegram, а не сеть или прокси. */
class TelegramError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

async function tg<T>(method: string, payload: object, timeoutMs = 15_000): Promise<T> {
  const secret = env('TG_PROXY_SECRET');
  const res = await fetch(`${apiBase()}/bot${token()}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Без обычного User-Agent Cloudflare режет запросы (error 1010).
      'User-Agent': 'niaz-crm/1.0',
      ...(secret ? { 'X-Proxy-Secret': secret } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = (await res.json().catch(() => null)) as
    | { ok: boolean; result?: T; error_code?: number; description?: string }
    | null;
  // Не JSON — ответил прокси (например, 403 на неверный секрет), а не Telegram.
  if (!data) throw new Error(`${method}: прокси ответил HTTP ${res.status}`);
  if (!data.ok) throw new TelegramError(data.error_code ?? res.status, `${method}: ${data.description}`);
  return data.result as T;
}

function send(chatId: string, text: string, markup?: object) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

/** Чат, где бота заблокировали или откуда удалили, из рассылки убираем. */
const chatIsGone = (err: unknown) =>
  err instanceof TelegramError &&
  (err.code === 403 || (err.code === 400 && /chat not found/i.test(err.message)));

async function broadcast(text: string, markup?: object) {
  const chats = await prisma.telegramChat.findMany();
  for (const chat of chats) {
    try {
      await send(chat.id, text, markup);
    } catch (err) {
      if (chatIsGone(err)) await prisma.telegramChat.deleteMany({ where: { id: chat.id } });
      else log(`не отправилось в ${chat.id}: ${(err as Error).message}`);
    }
  }
}

const log = (msg: string) => console.error(`[telegram] ${msg}`);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Заявки ───

export type LeadNotice = {
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
};

/** 8 (900) 123-45-67 → 79001234567: так Telegram делает номер кликабельным. */
function phoneDigits(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (!d.startsWith('7')) d = `7${d}`;
  return d.slice(0, 11);
}

/** Где открыть заявку: свой домен CRM, если он задан, иначе адрес сайта. */
function crmBase() {
  const host = env('CRM_HOST');
  return host ? `https://${host}` : env('NEXT_PUBLIC_SITE_URL');
}

/** Разослать заявку во все подключённые чаты. Ошибки только в лог. */
export async function notifyLead(lead: LeadNotice) {
  if (!botConfigured()) return;
  try {
    const phone = phoneDigits(lead.phone);
    const rows = [
      `🚐 <b>Новая заявка ${esc(lead.num)}</b>`,
      lead.subject ? esc(lead.subject) : '',
      '',
      `👤 ${esc(lead.fio)}`,
      `📞 +${phone}`,
      lead.email ? `✉️ ${esc(lead.email)}` : '',
      lead.org || lead.inn
        ? `🏢 ${esc([lead.org, lead.inn && `ИНН ${lead.inn}`].filter(Boolean).join(' · '))}`
        : '',
      lead.comment ? `💬 ${esc(lead.comment)}` : '',
      lead.sourceUrl ? `\n<i>со страницы ${esc(lead.sourceUrl)}</i>` : '',
    ].filter((row, i) => row !== '' || i === 2);

    // tel: Telegram в кнопках не принимает — звонок идёт тапом по номеру в тексте.
    const buttons: { text: string; url: string }[][] = [];
    const base = crmBase();
    if (base.startsWith('https://')) {
      buttons.push([{ text: '📋 Открыть в CRM', url: `${base}/crm/leads/${lead.id}/` }]);
    }
    buttons.push([{ text: '✈️ Написать клиенту в Telegram', url: `tg://resolve?phone=${phone}` }]);

    await broadcast(rows.join('\n'), { inline_keyboard: buttons });
  } catch (err) {
    log(`заявка ${lead.num}: ${(err as Error).message}`);
  }
}

/** Отключить чат из CRM: убрать из рассылки и предупредить его. */
export async function disconnectChat(chatId: string) {
  await prisma.telegramChat.deleteMany({ where: { id: chatId } });
  if (botConfigured()) {
    await send(chatId, 'Этот чат отключён от заявок НиАЗ в настройках CRM.').catch(() => {});
  }
}

// ─── Служебное состояние ───

async function getState(key: string) {
  return (await prisma.botState.findUnique({ where: { key } }))?.value ?? null;
}

async function setState(key: string, value: string) {
  await prisma.botState.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export const botUsername = () => getState('username');

// ─── Подключение чатов ───

type TgChat = {
  id: number;
  type: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type Update = {
  update_id: number;
  message?: { chat: TgChat; text?: string };
  my_chat_member?: { chat: TgChat; new_chat_member: { status: string } };
};

const ABOUT =
  'Этот бот присылает сотрудникам заявки с сайта Нижегородского автомобильного завода.\n\n' +
  'Чтобы подключить чат, отправьте /start и код доступа — его выдаёт администратор CRM.';

/** Неверные коды по чатам: после пяти подряд чат игнорируется час. */
const attempts = new Map<number, { count: number; until: number }>();

function chatTitle(chat: TgChat) {
  if (chat.title) return chat.title;
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
  return chat.username ? `${name} (@${chat.username})`.trim() : name || String(chat.id);
}

async function handleUpdate(update: Update) {
  const member = update.my_chat_member;
  if (member) {
    const id = String(member.chat.id);
    const status = member.new_chat_member.status;
    if (status === 'left' || status === 'kicked') {
      await prisma.telegramChat.deleteMany({ where: { id } });
    } else if (member.chat.type !== 'private' && !(await prisma.telegramChat.findUnique({ where: { id } }))) {
      const name = await botUsername();
      await send(id, `Чтобы группа получала заявки, отправьте сюда /start${name ? `@${name}` : ''} и код доступа.`);
    }
    return;
  }

  const msg = update.message;
  const text = msg?.text?.trim();
  if (!msg || !text) return;

  const chat = msg.chat;
  const id = String(chat.id);
  // /start КОД — и в личке, и в группе (/start@имя_бота КОД). В личке можно прислать просто код.
  // Прочие сообщения в группах бота не касаются.
  const start = text.match(/^\/start(?:@\w+)?(?:\s+(\S+))?$/i);
  if (!start && chat.type !== 'private') return;
  const code = start ? (start[1] ?? '') : text;

  if (await prisma.telegramChat.findUnique({ where: { id } })) {
    if (start) await send(id, '✅ Этот чат уже получает заявки с сайта НиАЗ.');
    return;
  }

  const tries = attempts.get(chat.id);
  if (tries && tries.until > Date.now()) return;

  if (code && code === joinCode()) {
    attempts.delete(chat.id);
    await prisma.telegramChat.create({ data: { id, type: chat.type, title: chatTitle(chat) } });
    await send(id, '✅ Готово — сюда будут приходить заявки с сайта НиАЗ.');
    return;
  }

  if (!code) {
    await send(id, ABOUT);
    return;
  }

  const count = (tries?.count ?? 0) + 1;
  attempts.set(chat.id, { count, until: count >= 5 ? Date.now() + 3_600_000 : 0 });
  await send(id, count >= 5 ? 'Слишком много неверных кодов. Попробуйте через час.' : 'Код не подошёл.');
}

// ─── Недельный отчёт ───

const DAY = 86_400_000;
const MSK = 3 * 3_600_000; // Москва без перехода на летнее время

/** В понедельник после 9:00 МСК — один раз за неделю. */
async function maybeWeeklyReport() {
  const msk = new Date(Date.now() + MSK);
  if (msk.getUTCDay() !== 1 || msk.getUTCHours() < 9) return;

  const mondayMsk = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate());
  const week = new Date(mondayMsk).toISOString().slice(0, 10);
  if ((await getState('lastReport')) === week) return;
  await setState('lastReport', week);

  const thisMon = new Date(mondayMsk - MSK); // полночь понедельника по Москве в UTC
  const lastMon = new Date(thisMon.getTime() - 7 * DAY);
  const prevMon = new Date(thisMon.getTime() - 14 * DAY);
  const [last, prev] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: lastMon, lt: thisMon } } }),
    prisma.lead.count({ where: { createdAt: { gte: prevMon, lt: lastMon } } }),
  ]);

  let delta: string;
  if (prev === 0) delta = last > 0 ? '▲ на позапрошлой неделе заявок не было' : 'без изменений';
  else {
    const pct = Math.round(((last - prev) / prev) * 100);
    delta = `${pct > 0 ? '▲' : pct < 0 ? '▼' : '→'} ${pct > 0 ? '+' : ''}${pct}% к позапрошлой неделе (было ${prev})`;
  }

  const dd = (d: Date) => new Date(d.getTime() + MSK).toISOString().slice(5, 10).split('-').reverse().join('.');
  await broadcast(
    `📊 <b>Заявки с сайта НиАЗ</b>\n\nНеделя ${dd(lastMon)}–${dd(new Date(thisMon.getTime() - DAY))}: <b>${last}</b>\n${delta}`,
  );
}

// ─── Опрос ───

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bot = globalThis as typeof globalThis & { __niazBotStarted?: boolean };

/** Запускается один раз при старте сервера (instrumentation.ts). */
export function startBot() {
  if (bot.__niazBotStarted || !botConfigured()) return;
  bot.__niazBotStarted = true;
  void poll();
}

async function poll() {
  // Опрос и вебхук в Telegram взаимоисключающие: снимаем вебхук, если был.
  await tg('deleteWebhook', { drop_pending_updates: false }).catch((e) => log(e.message));
  const me = await tg<{ username: string }>('getMe', {}).catch(() => null);
  if (me) await setState('username', me.username);

  let offset = Number((await getState('offset')) ?? 0);
  let pause = 0;
  log(`опрос запущен${me ? ` (@${me.username})` : ''}`);

  for (;;) {
    try {
      // Долгий опрос: Telegram держит запрос до 25 с, пока нет новостей.
      const updates = await tg<Update[]>(
        'getUpdates',
        { offset, timeout: 25, allowed_updates: ['message', 'my_chat_member'] },
        40_000,
      );
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update).catch((e) => log(`обработка: ${e.message}`));
      }
      if (updates.length) await setState('offset', String(offset));
      await maybeWeeklyReport().catch((e) => log(`отчёт: ${e.message}`));
      pause = 0;
    } catch (err) {
      // 409 — второй опрос (старый контейнер при перезапуске); сеть, прокси — ждём и повторяем.
      pause = Math.min(pause ? pause * 2 : 5_000, 60_000);
      log(`${(err as Error).message}; повтор через ${pause / 1000} с`);
      await sleep(pause);
    }
  }
}
