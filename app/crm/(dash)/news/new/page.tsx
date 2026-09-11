import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { canEdit } from '@/lib/roles';
import { NewsForm } from '../NewsForm';
import styles from '../../ui.module.css';

export default async function NewNewsPage() {
  const user = await currentUser();
  if (!user || !canEdit(user.role)) redirect('/crm/news/');

  return (
    <>
      <Link href="/crm/news/" className={`mono ${styles.back}`}>
        ← Все новости
      </Link>
      <header className={styles.head}>
        <div>
          <p className="label">Новости</p>
          <h1 className={styles.h1}>Новая новость</h1>
          <p className={styles.lead}>
            Сначала сохраните текст — после этого откроется загрузка фото.
          </p>
        </div>
      </header>

      <NewsForm post={null} editable />
    </>
  );
}
