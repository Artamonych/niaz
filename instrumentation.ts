/**
 * Выполняется один раз при старте сервера Next. Здесь запускается фоновый
 * опрос бота заявок: Telegram до нас вебхуком не достучится, поэтому чаты
 * бот собирает сам (lib/telegram.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // На сборке сервер тоже поднимается, но опрашивать Telegram оттуда незачем.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startBot } = await import('./lib/telegram');
  startBot();
}
