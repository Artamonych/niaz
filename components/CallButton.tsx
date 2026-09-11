import styles from './CallButton.module.css';

/**
 * Плавающая кнопка звонка в правом нижнем углу (пункт 12 бэклога).
 * Обычная ссылка tel: — без скриптов: на телефоне сразу набор, на десктопе
 * откроется приложение для звонков. Чат сюда не добавлен сознательно: пока
 * не решено, кто на нём отвечает, см. BACKLOG.md.
 */
export function CallButton() {
  return (
    <a
      href="tel:88005504455"
      className={styles.button}
      aria-label="Позвонить на завод: 8 800 550-44-55"
      title="8 800 550-44-55 — звонок бесплатный"
    >
      <span className={styles.pulse} aria-hidden="true" />
      <span className={`${styles.pulse} ${styles.pulseLate}`} aria-hidden="true" />
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
        />
      </svg>
    </a>
  );
}
