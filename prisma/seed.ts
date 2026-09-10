/**
 * Наполнение CRM: стадии канбана, услуги и учётные записи отдела продаж.
 * Демо-заявки и контрагенты повторяют прототип — чтобы заказчику было что смотреть.
 *
 * Запуск: npx prisma db seed
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

const STAFF = [
  { email: 'admin@niaz.ru', fio: 'Администратор', role: 'ADMIN', phone: '+7 831 220-14-00' },
  { email: 'a.kruglova@niaz.ru', fio: 'Анна Круглова', role: 'HEAD', phone: '+7 831 220-14-01' },
  { email: 'p.ershov@niaz.ru', fio: 'Павел Ершов', role: 'MANAGER', phone: '+7 831 220-14-06' },
  { email: 'm.zotova@niaz.ru', fio: 'Мария Зотова', role: 'VIEWER', phone: '+7 831 220-14-09' },
];

const DEMO_LEADS = [
  {
    fio: 'Игорь Мельников', phone: '+7 831 220-14-08', email: 'melnikov@volgatrans.ru',
    org: 'ООО «Волга-Транс»', inn: '5250012345', stage: 'new',
    subject: 'АСМП класса B', comment: 'Нужен расчёт на 4 единицы, срок — до конца квартала.',
  },
  {
    fio: 'Светлана Гурьева', phone: '+7 831 415-77-20', email: 's.gurieva@kstovo-ptk.ru',
    org: 'МУП «Кстово-ПТК»', inn: '5250098877', stage: 'new',
    subject: 'Транспорт для МГН', comment: 'Закупка по 223-ФЗ, требуется КП с реквизитами.',
  },
  {
    fio: 'Артём Балашов', phone: '+7 910 302-55-19', email: 'balashov@nnagro.ru',
    org: 'АО «НН-Агро»', inn: '5259004411', stage: 'work',
    subject: 'Грузопассажирский автомобиль', comment: 'Уточняет сроки, ждёт звонка после 15:00.',
  },
  {
    fio: 'Ольга Пирогова', phone: '+7 920 044-12-06', email: 'pirogova@gbuz-ok.ru',
    org: 'ГБУЗ «Областная клиническая»', inn: '5253000901', stage: 'deal',
    subject: 'АСМП класса C', comment: 'Договор подписан, ждём отгрузку.',
  },
];

async function main() {
  for (const stage of STAGES) {
    await prisma.stage.upsert({ where: { key: stage.key }, update: stage, create: stage });
  }

  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    });
  }

  // Единый стартовый пароль: заказчик меняет его при первом входе.
  const passwordHash = await bcrypt.hash('niaz2026', 10);
  for (const person of STAFF) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { fio: person.fio, role: person.role, phone: person.phone },
      create: { ...person, passwordHash },
    });
  }

  if ((await prisma.lead.count()) === 0) {
    const stages = Object.fromEntries((await prisma.stage.findMany()).map((s) => [s.key, s.id]));
    const head = await prisma.user.findUnique({ where: { email: 'a.kruglova@niaz.ru' } });

    for (const [index, lead] of DEMO_LEADS.entries()) {
      const { stage, ...rest } = lead;
      await prisma.lead.create({
        data: {
          ...rest,
          num: `#${1001 + index}`,
          stageId: stages[stage],
          ownerId: head?.id,
          source: 'Демо-данные',
          events: {
            create: { kind: 'system', authorName: 'Система', text: 'Заявка заведена при наполнении базы' },
          },
        },
      });
    }
  }

  const counts = {
    стадии: await prisma.stage.count(),
    услуги: await prisma.service.count(),
    сотрудники: await prisma.user.count(),
    заявки: await prisma.lead.count(),
  };
  console.log('База наполнена:', counts);
  console.log('Вход: admin@niaz.ru / niaz2026');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
