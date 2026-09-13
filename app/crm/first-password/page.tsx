import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { FirstPasswordForm } from './FirstPasswordForm';
import styles from '../login/login.module.css';

export const metadata: Metadata = {
  title: 'Смена временного пароля',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Первый вход по временному паролю из письма. Пока постоянный пароль не задан,
 * разделы CRM не открываются (проверка в layout): пароль из письма знает не
 * только сотрудник — письмо лежит в ящике и в журналах почтовых узлов.
 */
export default async function FirstPasswordPage() {
  const user = await currentUser();
  if (!user) redirect('/crm/login');

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });
  if (!me?.mustChangePassword) redirect('/crm');

  return (
    <div className={`grid-bg ${styles.page}`}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>НиАЗ</span>
          <span className={`mono ${styles.markSub}`}>CRM</span>
        </div>
        <h1 className={styles.h1}>Задайте постоянный пароль</h1>
        <p className={styles.lead}>
          {user.fio}, вы вошли по временному паролю из письма. Придумайте свой — его не будет
          знать никто, включая администратора.
        </p>
        <FirstPasswordForm />
      </div>
    </div>
  );
}
