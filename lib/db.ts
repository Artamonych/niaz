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

/** Попыток с паузой 1, 2, 4, 8 с: гонка при старте длится доли секунды. */
const PRAGMA_ATTEMPTS = 5;

function createClient() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  // Настройки применяются к соединению, поэтому запускаем их сразу при создании
  // клиента. Ошибку не глотаем молча: без WAL приложение работает, но об этом
  // нужно знать по логам.
  //
  // С повтором: сразу после выкладки база бывает недоступна долю секунды —
  // контейнер миграций только что её закрыл (25.09.2026: SQLITE_IOERR_SHMSIZE
  // на первой же команде). Без повтора остальные настройки не выполнялись, и
  // процесс жил до следующей выкладки без busy_timeout: одновременная запись
  // заявки, бота и почтовой очереди получала бы «database is locked».
  void (async () => {
    for (let attempt = 1, pause = 1_000; ; attempt++, pause *= 2) {
      try {
        for (const pragma of PRAGMAS) await client.$queryRawUnsafe(pragma);
        if (attempt > 1) console.error(`SQLite: настройки соединения применены с ${attempt}-й попытки`);
        return;
      } catch (err) {
        if (attempt >= PRAGMA_ATTEMPTS) {
          console.error('SQLite: не удалось применить настройки соединения:', err);
          return;
        }
        await new Promise((r) => setTimeout(r, pause));
      }
    }
  })();

  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
