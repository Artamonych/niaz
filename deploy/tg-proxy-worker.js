/**
 * Cloudflare Worker — прокси к Telegram Bot API для бота заявок НиАЗ.
 *
 * Зачем: VPS стенда не достаёт api.telegram.org (соединение висит и
 * отваливается по таймауту), а *.workers.dev с него открывается за полсекунды.
 * Приложение шлёт запросы сюда, воркер пересылает их в Telegram как есть.
 *
 * Установка (dash.cloudflare.com → Workers & Pages → Create → Worker):
 *   1. Вставить этот файл целиком, Deploy.
 *   2. Settings → Variables and Secrets → Add → тип Secret:
 *        PROXY_SECRET — длинная случайная строка;
 *        BOT_TOKEN    — токен бота от @BotFather.
 *   3. Адрес воркера (https://<имя>.<аккаунт>.workers.dev) и PROXY_SECRET
 *      прописать в ~/apps/niaz/.env как TG_API_BASE и TG_PROXY_SECRET.
 *
 * Воркер пропускает только запросы с верным X-Proxy-Secret и только к
 * одному боту: даже зная адрес, чужой бот через него не пойдёт.
 */
export default {
  async fetch(request, env) {
    if (request.headers.get('X-Proxy-Secret') !== env.PROXY_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    // Путь вида /bot<токен>/<метод> — как у самого Bot API.
    const match = url.pathname.match(/^\/bot([^/]+)\/([A-Za-z]+)$/);
    if (!match || match[1] !== env.BOT_TOKEN) {
      return new Response('not found', { status: 404 });
    }

    const upstream = await fetch(`https://api.telegram.org${url.pathname}${url.search}`, {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('Content-Type') ?? 'application/json' },
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
