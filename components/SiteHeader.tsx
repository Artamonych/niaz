'use client';

import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES, MENU } from '@/lib/catalog';
import styles from './SiteHeader.module.css';

type MenuKey = keyof typeof MENU;

/**
 * Пункты шапки по порядку: у вкладки с `menu` — выпадающая панель, у `href` —
 * обычная ссылка. «О заводе» стоит перед «Контактами» — правка заказчика 21.09.2026.
 */
const NAV: ({ label: string } & ({ menu: MenuKey } | { href: string }))[] = [
  { label: 'Продукция', menu: 'tech' },
  { label: 'АСМП-сервис', menu: 'service' },
  { label: 'Инженерия', menu: 'engineering' },
  { label: 'О заводе', menu: 'about' },
  { label: 'Контакты', href: '/kontakty/' },
];

// Грузопассажирские сняты из шапки по правкам заказчика; страницы остаются.
const MOBILE_CATS = CATEGORIES.filter((c) => c.key !== 'gp');

/**
 * «Запросить КП»: если на странице своя форма заявки — прокручиваем к ней,
 * иначе ссылка ведёт к форме на главной.
 */
function toLeadForm(e: React.MouseEvent) {
  const form = document.getElementById('zapros');
  if (!form) return;
  e.preventDefault();
  form.scrollIntoView({ behavior: 'smooth' });
}

export function SiteHeader() {
  const pathname = usePathname();

  const [open, setOpen] = useState<MenuKey | null>(null);
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
      className={styles.header}
      onMouseLeave={() => setOpen(null)}
    >
      <div className={`shell ${styles.bar}`}>
        <Link href="/" className={styles.logo}>
          <BrandLogo size={20} tone="dark" />
          <span>
            <span className={`mono ${styles.markSub}`}>
              Нижегородский
              <br />
              автомобильный завод
            </span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Основная навигация">
          {NAV.map((item) =>
            'menu' in item ? (
              <button
                key={item.label}
                type="button"
                className={`u-underline ${styles.tab}`}
                aria-expanded={open === item.menu}
                onMouseEnter={() => setOpen(item.menu)}
                onFocus={() => setOpen(item.menu)}
                onClick={() => setOpen(open === item.menu ? null : item.menu)}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={`u-underline ${styles.tab}`}
                onMouseEnter={() => setOpen(null)}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className={styles.contact}>
          <a href="tel:88005504455" className={`mono ${styles.phone}`}>
            8 800 550-44-55
          </a>
          <Link href="/#zapros" className={`u-corner ${styles.cta}`} onClick={toLeadForm}>
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
              { label: 'Продукция', href: '/produktsiya/' },
              { label: 'Инженерия', href: '/inzheneriya/' },
              { label: 'Гарантии', href: '/garantii/' },
              { label: 'О заводе', href: '/o-kompanii/' },
              { label: 'Новости', href: '/novosti/' },
              { label: 'Контакты', href: '/kontakty/' },
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
              {MOBILE_CATS.map((c, i) => (
                <Link
                  key={c.key}
                  href={`/${c.slug}/`}
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
