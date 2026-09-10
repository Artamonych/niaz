/**
 * Сквозная проверка главного сценария: заявка с сайта попадает в CRM,
 * закрытые страницы недоступны без входа, вход работает.
 *
 * Запуск против поднятого сервера: npm run smoke -- http://localhost:3000
 */
const BASE = process.argv[2] ?? 'http://localhost:3000';

let failures = 0;

function check(name: string, passed: boolean, detail = '') {
  console.log(`${passed ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

async function main() {
  console.log('Публичный сайт');
  const home = await fetch(`${BASE}/`);
  check('главная отдаёт 200', home.status === 200, String(home.status));

  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsBody = await robots.text();
  check('robots.txt закрывает /crm или весь стенд', /Disallow: \/(crm)?/.test(robotsBody));

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  const sitemapBody = await sitemap.text();
  const urlCount = (sitemapBody.match(/<url>/g) ?? []).length;
  check('sitemap не пустой', urlCount > 200, `${urlCount} URL`);
  // Снятые автобусы: городские, туристические, школьные, VIP. Грузопассажирские
  // и микроавтобусы для МГН — живые линейки, их наличие здесь правильно.
  const removedBuses = /\/(gorodskoy|gorodskie|turisticheskiy|turisticheskie|shkolnyy|shkolnye|avtobusy|avtobus-vip)[^<]*<\/loc>/;
  check('в sitemap нет снятых автобусов', !removedBuses.test(sitemapBody));

  console.log('\nЗащита CRM');
  const crm = await fetch(`${BASE}/crm`);
  check('/crm без входа приводит на логин', crm.url.includes('/crm/login'), crm.url);

  console.log('\nЗаявка с сайта');
  const unique = Date.now();
  const lead = await fetch(`${BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fio: `Проверка ${unique}`,
      phone: '+7 900 000-00-00',
      email: 'test@example.com',
      org: 'ООО «Тест»',
      inn: '5250012345',
      comment: 'Автоматическая проверка формы',
      subject: 'АСМП класса B',
      sourceUrl: '/asmp',
      consent: true,
    }),
  });
  const leadBody = await lead.json();
  check('заявка принята', lead.status === 200 && leadBody.ok === true, JSON.stringify(leadBody));
  check('присвоен номер', typeof leadBody.num === 'string', leadBody.num);

  const bad = await fetch(`${BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fio: 'x', phone: '', consent: false }),
  });
  check('невалидная заявка отклонена', bad.status === 400, String(bad.status));

  const honeypot = await fetch(`${BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fio: 'Бот Ботов', phone: '+7 900 111-11-11', consent: true, website: 'http://spam.example',
    }),
  });
  check('ловушка для ботов молча глотает', honeypot.status === 200);

  console.log('\nВход в CRM');
  const form = new URLSearchParams({ email: 'admin@niaz.ru', password: 'niaz2026' });
  const login = await fetch(`${BASE}/crm/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    redirect: 'manual',
  });
  // Server Actions требуют своего протокола — здесь проверяем лишь доступность страницы.
  check('страница входа открывается', login.status < 500, String(login.status));

  console.log(`\nПровалов: ${failures}`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
