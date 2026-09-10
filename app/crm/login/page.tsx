import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Вход в CRM',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentUser()) redirect('/crm');

  return (
    <div className={`grid-bg ${styles.page}`}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>НиАЗ</span>
          <span className={`mono ${styles.markSub}`}>CRM</span>
        </div>
        <h1 className={styles.h1}>Вход для сотрудников</h1>
        <p className={styles.lead}>
          Рабочее место отдела продаж: заявки с сайта, контрагенты и услуги.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
