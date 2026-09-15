'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

/**
 * Уведомление о файлах cookie.
 *
 * Выбор посетителя хранится в localStorage, а не в самой cookie: согласие —
 * это настройка браузера конкретного человека, и класть ради неё файл, на
 * который он, возможно, как раз и не согласен, неправильно.
 *
 * Аналитика (Яндекс.Метрика) подключается только после согласия и только если
 * задан номер счётчика. Пока счётчика нет, кнопка «Принять» просто запоминает
 * выбор — грузить нечего, и это честно описано в политике.
 */
const KEY = 'niaz-cookie-consent';
type Choice = 'all' | 'necessary';

/** Номер счётчика задаётся при сборке; пустой — аналитики на сайте нет. */
const METRIKA_ID = process.env.NEXT_PUBLIC_YM_ID ?? '';

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

function loadMetrika(id: string) {
  if (!id || document.getElementById('ym-script')) return;

  const script = document.createElement('script');
  script.id = 'ym-script';
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  script.onload = () => {
    window.ym?.(Number(id), 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
    });
  };
  document.head.appendChild(script);
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // Приватный режим или запрет хранилища: спрашивать каждый раз нельзя —
      // навязчиво, поэтому просто не показываем и аналитику не включаем.
      return;
    }

    if (saved === 'all') {
      loadMetrika(METRIKA_ID);
      return;
    }
    if (saved === 'necessary') return;

    setVisible(true);
  }, []);

  const choose = (choice: Choice) => {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      // Не сохранилось — решение всё равно действует в текущем сеансе.
    }
    if (choice === 'all') loadMetrika(METRIKA_ID);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className={styles.banner} role="dialog" aria-label="Файлы cookie">
      <div className={styles.inner}>
        <p className={styles.text}>
          Сайт использует файлы cookie. Без части из них не работает вход в рабочее место
          сотрудников; аналитические файлы подключаются только с вашего согласия. Подробности —
          в{' '}
          <Link href="/politika-cookie/" className={styles.link}>
            политике в отношении файлов cookie
          </Link>
          .
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.accept} onClick={() => choose('all')}>
            Принять
          </button>
          <button type="button" className={styles.only} onClick={() => choose('necessary')}>
            Только необходимые
          </button>
        </div>
      </div>
    </aside>
  );
}
