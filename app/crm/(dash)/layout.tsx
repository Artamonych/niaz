import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { currentUser } from '@/lib/auth';
import { roleTitle, canManageStaff } from '@/lib/roles';
import { logout } from '../actions';
import styles from './dash.module.css';

export const metadata: Metadata = {
  title: 'CRM',
  robots: { index: false, follow: false },
};

/** CRM всегда работает по живым данным — кеш страниц здесь вреден. */
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/crm', label: 'Заявки' },
  { href: '/crm/clients', label: 'Контрагенты' },
  { href: '/crm/services', label: 'Услуги' },
  { href: '/crm/news', label: 'Новости' },
  { href: '/crm/employees', label: 'Сотрудники', staffOnly: true },
  { href: '/crm/settings', label: 'Настройки' },
];

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const items = NAV.filter((item) => !item.staffOnly || canManageStaff(user.role));

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link href="/crm" className={styles.brand}>
          <span className={styles.mark}>НиАЗ</span>
          <span className={`mono ${styles.markSub}`}>CRM</span>
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
