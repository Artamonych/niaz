/**
 * Первичное наполнение боевой базы: стадии воронки, услуги и учётная запись
 * администратора. Запускается при каждом деплое, данные не перетирает —
 * только досоздаёт недостающее.
 *
 * В отличие от seed.ts здесь нет демо-заявок и захардкоженного пароля:
 * учётка заводится из переменных окружения.
 */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../lib/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

const STAGES = [
  { key: 'new', title: 'Новая', accent: '#3FA9C9', order: 0 },
  { key: 'work', title: 'В работе', accent: '#E0A33E', order: 1 },
  { key: 'deal', title: 'Сделка', accent: '#5FBF8A', order: 2 },
];

const SERVICES = [
  { name: 'Поставка техники', price: 0 },
  { name: 'Переоборудование под ТЗ', price: 240000 },
  { name: 'Сервисное обслуживание', price: 95000 },
  { name: 'Поставка запчастей', price: 180000 },
  { name: 'Шеф-монтаж', price: 240000 },
];

async function main() {
  for (const stage of STAGES) {
    await prisma.stage.upsert({ where: { key: stage.key }, update: stage, create: stage });
  }

  for (const service of SERVICES) {
    await prisma.service.upsert({ where: { name: service.name }, update: {}, create: service });
  }

  if ((await prisma.user.count()) === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('База пуста, а ADMIN_EMAIL/ADMIN_PASSWORD не заданы — войти в CRM будет нечем');
    }

    await prisma.user.create({
      data: {
        email,
        fio: process.env.ADMIN_FIO ?? 'Администратор',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    console.log(`Создана учётная запись администратора: ${email}`);
  }

  console.log(
    `База готова: стадий ${await prisma.stage.count()}, услуг ${await prisma.service.count()}, сотрудников ${await prisma.user.count()}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
