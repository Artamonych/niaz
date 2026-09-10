'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES, MENU } from '@/lib/catalog';
import styles from './SiteHeader.module.css';

const TABS: { key: keyof typeof MENU; label: string }[] = [
  { key: 'tech', label: 'Спецтехника' },
  { key: 'service', label: 'АСМП-сервис' },
  { key: 'about', label: 'О заводе' },
];

export function SiteHeader() {
  const pathname = usePathname();
  // Главная — тёмная зона прототипа, остальные страницы — светлая.
  const dark = pathname === '/';

  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  // Меню закрывается по Escape — иначе с клавиатуры из него не выйти.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // При переходе на другую страницу панели схлопываются.
  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  return (
    <header
      className={`${styles.header} ${dark ? styles.dark : styles.light}`}
      onMouseLeave={() => setOpen(null)}
    >
      <div className={`shell ${styles.bar}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.markBox} aria-hidden="true">
            Н
          </span>
          <span>
            <span className={styles.mark}>НиАЗ</span>
            <span className={`mono ${styles.markSub}`}>КСТОВО · ЗАВОД</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Основная навигация">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`u-underline ${styles.tab}`}
              aria-expanded={open === tab.key}
              onMouseEnter={() => setOpen(tab.key)}
              onFocus={() => setOpen(tab.key)}
              onClick={() => setOpen(open === tab.key ? null : tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <Link
            href="/inzheneriya"
            className={`u-underline ${styles.tab}`}
            onMouseEnter={() => setOpen(null)}
          >
            Инженерия
          </Link>
          <Link
            href="/tendery"
            className={`u-underline ${styles.tab}`}
            onMouseEnter={() => setOpen(null)}
          >
            Тендерам
          </Link>
          <Link
            href="/kontakty"
            className={`u-underline ${styles.tab}`}
            onMouseEnter={() => setOpen(null)}
          >
            Контакты
          </Link>
        </nav>

        <div className={styles.contact}>
          <a href="tel:88005504455" className={`mono ${styles.phone}`}>
            8 800 550-44-55
          </a>
          <Link href="/tendery#zapros" className={`u-corner ${styles.cta}`}>
            Запросить КП
          </Link>
        </div>

        <div className={styles.mobileBar}>
          <a href="tel:88005504455" className={`mono ${styles.phoneSm}`}>
            8 800 550-44-55
          </a>
          <button
            type="button"
            className={styles.burger}
            aria-label="Меню"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelRule} aria-hidden="true" />
          <div className={`shell ${styles.megaGrid}`}>
            {MENU[open].map((col, i) => (
              <div
                key={col.title}
                className={styles.megaCol}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <p className={`label ${styles.colTitle}`}>{col.title}</p>
                <ul className={styles.colList}>
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`u-underline ${styles.colLink}`}
                        onClick={() => setOpen(null)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {mobile && (
        <div className={styles.mobilePanel}>
          <div className={styles.panelRule} aria-hidden="true" />
          <div className={`shell ${styles.mobileInner}`}>
            {[
              { label: 'Спецтехника', href: '/produktsiya' },
              { label: 'Инженерия', href: '/inzheneriya' },
              { label: 'Тендерам', href: '/tendery' },
              { label: 'Гарантии', href: '/garantii' },
              { label: 'О заводе', href: '/o-kompanii' },
              { label: 'Новости', href: '/novosti' },
              { label: 'Контакты', href: '/kontakty' },
            ].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.mobileItem}
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setMobile(false)}
              >
                {item.label}
              </Link>
            ))}

            <p className={`label ${styles.mobileCatsTitle}`}>Категории</p>
            <div className={styles.mobileCats}>
              {CATEGORIES.map((c, i) => (
                <Link
                  key={c.key}
                  href={`/${c.slug}`}
                  className={styles.mobileCat}
                  style={{ animationDelay: `${0.24 + i * 0.04}s` }}
                  onClick={() => setMobile(false)}
                >
                  {c.short}
                </Link>
              ))}
            </div>

            <a href="tel:88005504455" className={styles.mobileCall}>
              Позвонить 8 800 550-44-55
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
