import { CallbackLink } from './CallbackLink';
import styles from './CallButton.module.css';

/**
 * Плавающая кнопка в правом нижнем углу (пункт 12 бэклога). Два вида:
 *   — на телефоне круг со ссылкой tel: — сразу набор номера;
 *   — на компьютере «Заказать звонок»: звонить с десктопа некому, поэтому
 *     кнопка ведёт к форме заявки.
 * Какой показать, решает CSS по типу указателя (мышь или палец), а не ширина
 * экрана: планшет с пальцем — тоже телефон, узкое окно с мышью — компьютер.
 * Чат сюда не добавлен сознательно, см. BACKLOG.md.
 */
export function CallButton() {
  return (
    <>
      <a
        href="tel:88005504455"
        className={`${styles.button} ${styles.touchOnly}`}
        aria-label="Позвонить на завод: 8 800 550-44-55"
      >
        <span className={styles.pulse} aria-hidden="true" />
        <span className={`${styles.pulse} ${styles.pulseLate}`} aria-hidden="true" />
        <PhoneIcon />
      </a>

      <CallbackLink className={`${styles.button} ${styles.pill} ${styles.pointerOnly}`} hiddenClass={styles.away}>
        <span className={styles.pulse} aria-hidden="true" />
        <span className={`${styles.pulse} ${styles.pulseLate}`} aria-hidden="true" />
        <PhoneIcon />
        <span className={styles.label}>Заказать звонок</span>
      </CallbackLink>
    </>
  );
}

function PhoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
      />
    </svg>
  );
}
