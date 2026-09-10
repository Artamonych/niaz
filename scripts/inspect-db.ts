/** Быстрый просмотр состояния базы: чем живёт CRM прямо сейчас. */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../lib/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

async function main() {
  const leads = await prisma.lead.findMany({
    include: { stage: true, _count: { select: { events: true } } },
    orderBy: { id: 'desc' },
  });

  console.log(`Заявок: ${leads.length}`);
  for (const lead of leads) {
    console.log(
      `  ${lead.num}  ${lead.stage.title.padEnd(9)}  ${lead.fio.padEnd(22)} ${lead.subject ?? '—'}  (событий: ${lead._count.events}, источник: ${lead.source})`,
    );
  }

  console.log(`\nСотрудников: ${await prisma.user.count()}`);
  console.log(`Услуг: ${await prisma.service.count()}`);
  console.log(`Контрагентов: ${await prisma.client.count()}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
