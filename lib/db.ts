import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/prisma/client';

// В dev Next перезагружает модули — без кеша на globalThis плодятся подключения.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Настройки SQLite (п. 35 бэклога).
 *
 * По умолчанию база работает в режиме отката через отдельный файл журнала, и
 * любая запись — заявка с сайта, комментарий, тик почтовой очереди, апдейт
 * бота — блокирует читателей целиком. WAL разводит читателей и писателя,
 * а ожидание в 5 секунд даёт запросу дождаться своей очереди вместо отказа
 * «база занята». Устойчивость к падению питания при этом сохраняется:
 * NORMAL синхронизирует журнал в контрольных точках.
 */
const PRAGMAS = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA synchronous = NORMAL',
  'PRAGMA busy_timeout = 5000',
];

function createClient() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  // Настройки применяются к соединению, поэтому запускаем их сразу при создании
  // клиента. Ошибку не глотаем молча: без WAL приложение работает, но об этом
  // нужно знать по логам.
  void (async () => {
    try {
      for (const pragma of PRAGMAS) await client.$queryRawUnsafe(pragma);
    } catch (err) {
      console.error('SQLite: не удалось применить настройки соединения:', err);
    }
  })();

  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
