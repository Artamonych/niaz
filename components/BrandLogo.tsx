import Image from 'next/image';
import styles from './BrandLogo.module.css';

/**
 * Знак завода: слово в квадратных скобках.
 *
 * Два файла на две подложки — в знаке само слово меняет цвет, а не фон:
 * на тёмной оно белое, на светлой почти чёрное. Поле у обоих прозрачное.
 * Исходники — data/brand/*-source.png, здесь их ужатые копии (по 6–8 КБ
 * вместо 471 и 961).
 */
const FILES = {
  dark: { src: '/brand/niaz-logo-dark.webp', width: 263, height: 120 },
  light: { src: '/brand/niaz-logo-light.webp', width: 254, height: 120 },
} as const;

export function BrandLogo({
  sub,
  size = 22,
  tone = 'dark',
}: {
  sub?: string;
  size?: number;
  /** Какая под знаком подложка: тёмная панель или светлая шапка. */
  tone?: 'dark' | 'light';
}) {
  const file = FILES[tone];

  return (
    <span className={styles.logo} style={{ '--logo-size': `${size}px` } as React.CSSProperties}>
      <Image
        src={file.src}
        alt="НиАЗ"
        width={file.width}
        height={file.height}
        priority
        /*
         * Без оптимизатора намеренно: файл и так 8 КБ, а браузеру без
         * поддержки webp оптимизатор отдаёт JPEG — формат без прозрачности,
         * и вместо знака на светлой шапке появлялась чёрная плашка.
         */
        unoptimized
        className={styles.mark}
      />
      {sub && <span className={`mono ${styles.sub}`}>{sub}</span>}
    </span>
  );
}
