'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MENU } from '@/lib/catalog';
import styles from './SiteHeader.module.css';

const TABS: { key: keyof typeof MENU; label: string }[] = [
  { key: 'tech', label: 'Продукция' },
  { key: 'service', label: 'Сервис' },
  { key: 'about', label: 'О заводе' },
];

export function SiteHeader() {
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

  return (
    <header className={styles.header} onMouseLeave={() => setOpen(null)}>
      <div className={`shell ${styles.bar}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark}>НиАЗ</span>
          <span className={styles.markSub}>Нижегородский автомобильный завод</span>
        </Link>

        <nav className={styles.nav} aria-label="Основная навигация">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={styles.tab}
              aria-expanded={open === tab.key}
              onMouseEnter={() => setOpen(tab.key)}
              onFocus={() => setOpen(tab.key)}
              onClick={() => setOpen(open === tab.key ? null : tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <Link href="/tendery" className={styles.tab}>
            Тендерам
          </Link>
          <Link href="/kontakty" className={styles.tab}>
            Контакты
          </Link>
        </nav>

        <div className={styles.contact}>
          <a href="tel:88005504455" className={`mono ${styles.phone}`}>
            8 800 550-44-55
          </a>
          <Link href="/tendery#zapros" className={styles.cta}>
            Запросить КП
          </Link>
        </div>

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

      {open && (
        <div className={styles.mega}>
          <div className={`shell ${styles.megaGrid}`}>
            {MENU[open].map((col) => (
              <div key={col.title}>
                <p className={`label ${styles.colTitle}`}>{col.title}</p>
                <ul className={styles.colList}>
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={styles.colLink} onClick={() => setOpen(null)}>
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
        <div className={styles.mobile}>
          <div className="shell">
            {Object.values(MENU).flat().map((col) => (
              <div key={col.title} className={styles.mobileCol}>
                <p className={`label ${styles.colTitle}`}>{col.title}</p>
                <ul className={styles.colList}>
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={styles.colLink} onClick={() => setMobile(false)}>
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
    </header>
  );
}
