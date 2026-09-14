import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can, roleTitle, type Action } from '@/lib/roles';
import { BrandLogo } from '@/components/BrandLogo';
import { logout } from '../actions';
import styles from './dash.module.css';

export const metadata: Metadata = {
  title: 'CRM',
  robots: { index: false, follow: false },
};

/** CRM всегда работает по живым данным — кеш страниц здесь вреден. */
export const dynamic = 'force-dynamic';

/** Разделы и право, которое их открывает. Без права пункт не показывается. */
const NAV: { href: string; label: string; needs?: Action }[] = [
  { href: '/crm/', label: 'Заявки' },
  { href: '/crm/clients/', label: 'Контрагенты' },
  { href: '/crm/services/', label: 'Услуги', needs: 'content:manage' },
  { href: '/crm/news/', label: 'Новости', needs: 'content:manage' },
  { href: '/crm/employees/', label: 'Сотрудники', needs: 'staff:manage' },
  { href: '/crm/leads/trash/', label: 'Корзина', needs: 'leads:delete' },
  { href: '/crm/audit/', label: 'Журнал', needs: 'audit:view' },
  { href: '/crm/mail/', label: 'Почта', needs: 'settings:system' },
];

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  // Временный пароль из письма меняется до того, как откроются разделы CRM.
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (me?.mustChangePassword) redirect('/crm/first-password');

  // Последним пунктом — настройки. У администратора там стадии, база и общий
  // чат бота; у остальных только свой профиль, пароль и ссылка на бота.
  const items = [
    ...NAV.filter((item) => !item.needs || can(user.role, item.needs)),
    {
      href: '/crm/settings/',
      label: can(user.role, 'settings:system') ? 'Настройки' : 'Профиль',
    },
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link href="/crm/" className={styles.brand}>
          <BrandLogo sub="CRM" size={20} />
        </Link>

        <nav className={styles.nav}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.user}>
          <p className={styles.userName}>{user.fio}</p>
          <p className={`mono ${styles.userRole}`}>{roleTitle(user.role)}</p>
          <form action={logout}>
            <button type="submit" className={styles.logout}>
              Выйти
            </button>
          </form>
          {/* Абсолютный адрес: у CRM может быть свой домен, и «/» вёл бы в её же корень. */}
          <a href={process.env.NEXT_PUBLIC_SITE_URL ?? '/'} className={styles.toSite}>
            ← На сайт
          </a>
        </div>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
