import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalog';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.grid}`}>
        <div>
          <p className={styles.mark}>НиАЗ</p>
          <p className={styles.about}>
            ООО «Нижегородский автомобильный завод». Производство и переоборудование
            специализированного транспорта.
          </p>
        </div>

        <div>
          <p className={styles.colTitle}>Каталог</p>
          <ul className={styles.list}>
            {CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link href={`/${c.slug}`} className={`u-underline ${styles.link}`}>
                  {c.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={styles.colTitle}>Заказчикам</p>
          <ul className={styles.list}>
            <li>
              <Link href="/tendery" className={`u-underline ${styles.link}`}>
                Тендерам
              </Link>
            </li>
            <li>
              <Link href="/inzheneriya" className={`u-underline ${styles.link}`}>
                Инженерия и производство
              </Link>
            </li>
            <li>
              <Link href="/sertifikatsiya" className={`u-underline ${styles.link}`}>
                Сертификация
              </Link>
            </li>
            <li>
              <Link href="/garantii" className={`u-underline ${styles.link}`}>
                Гарантии
              </Link>
            </li>
            <li>
              <Link href="/partnery" className={`u-underline ${styles.link}`}>
                Партнёры
              </Link>
            </li>
            <li>
              <Link href="/o-kompanii" className={`u-underline ${styles.link}`}>
                О заводе
              </Link>
            </li>
            <li>
              <Link href="/novosti" className={`u-underline ${styles.link}`}>
                Новости
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className={styles.colTitle}>Реквизиты</p>
          <p className={styles.reqs}>
            607655, Нижегородская обл.,
            <br />
            г. Кстово, ул. 1 Мая, стр. 1
            <br />
            <a href="tel:88005504455">8 800 550-44-55</a>
            <br />
            <a href="mailto:niaz@com-transport.ru">niaz@com-transport.ru</a>
          </p>
          <ul className={styles.list}>
            <li>
              <Link href="/kontakty" className={`u-underline ${styles.link}`}>
                Адрес и реквизиты
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={`shell ${styles.legal}`}>
        <span>© {new Date().getFullYear()} ООО «Нижегородский автомобильный завод»</span>
        <Link href="/politika-konfidentsialnosti" className={styles.legalLink}>
          Политика конфиденциальности
        </Link>
      </div>
    </footer>
  );
}
