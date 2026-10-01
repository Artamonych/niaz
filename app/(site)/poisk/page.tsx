import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { plural } from '@/lib/plural';
import { queryWords, search } from '@/lib/search';
import styles from './poisk.module.css';

export const metadata: Metadata = {
  title: 'Поиск по сайту',
  // Выдача — не страница для поисковиков: бесконечное число адресов с ?q=.
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

/** Подсветка найденного: части строки, без вставки HTML. «е» в запросе ловит и «ё». */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  // Экранировать нечего: queryWords оставляет в словах только буквы и цифры.
  const pattern = words.map((w) => w.replace(/е/g, '[её]')).join('|');
  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className={styles.mark}>{part}</mark> : part))}
    </>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 100);
  const words = queryWords(q);
  const hits = q ? await search(q) : [];

  return (
    <div className="shell">
      <Breadcrumbs items={[{ name: 'Поиск' }]} />

      <header className={styles.head}>
        <h1 className={styles.h1}>Поиск по сайту</h1>
        <form action="/poisk/" method="get" role="search" className={styles.form}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Например: реанимобиль, Crafter, изотермический"
            aria-label="Что найти"
            className={styles.input}
            autoFocus={!q}
          />
          <button type="submit" className={styles.button}>
            Найти
          </button>
        </form>
        <p className={styles.hint}>
          Ищет и по целому слову, и по его части: «реаним» найдёт «реанимобиль».
        </p>
      </header>

      {q && (
        <section className={styles.results} aria-live="polite">
          <p className={`mono ${styles.count}`}>
            {hits.length
              ? `Найдено: ${hits.length} ${plural(hits.length, 'страница', 'страницы', 'страниц')}`
              : words.length
                ? 'Ничего не найдено. Попробуйте часть слова или другое написание.'
                : 'Запрос слишком короткий: нужно хотя бы два знака.'}
          </p>

          <ol className={styles.list}>
            {hits.map((hit) => (
              <li key={hit.href} className={styles.item}>
                <span className={`mono ${styles.kind}`}>{hit.kind}</span>
                <Link href={hit.href} className={styles.title}>
                  <Highlight text={hit.title} words={words} />
                </Link>
                {hit.snippet && (
                  <p className={styles.snippet}>
                    <Highlight text={hit.snippet} words={words} />
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
