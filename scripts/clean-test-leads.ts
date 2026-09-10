/** Убирает заявки, созданные автоматической проверкой (npm run smoke). */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../lib/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

async function main() {
  const removed = await prisma.lead.deleteMany({ where: { fio: { startsWith: 'Проверка ' } } });
  console.log(`Удалено тестовых заявок: ${removed.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
