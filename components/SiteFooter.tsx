import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalog';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={`grid-bg ${styles.footer}`}>
      <div className={`shell ${styles.grid}`}>
        <div>
          <p className={styles.mark}>НиАЗ</p>
          <p className={styles.about}>
            ООО «Нижегородский автомобильный завод» — производство специализированного
            транспорта и переоборудование на базе шасси ведущих марок.
          </p>
        </div>

        <div>
          <p className="label">Продукция</p>
          <ul className={styles.list}>
            {CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link href={`/${c.slug}`} className={styles.link}>
                  {c.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="label">Заводу</p>
          <ul className={styles.list}>
            <li><Link href="/o-kompanii" className={styles.link}>О компании</Link></li>
            <li><Link href="/sertifikatsiya" className={styles.link}>Сертификация</Link></li>
            <li><Link href="/garantii" className={styles.link}>Гарантии</Link></li>
            <li><Link href="/partnery" className={styles.link}>Партнёры</Link></li>
            <li><Link href="/novosti" className={styles.link}>Новости</Link></li>
          </ul>
        </div>

        <div>
          <p className="label">Контакты</p>
          <ul className={styles.list}>
            <li><a href="tel:88005504455" className={`mono ${styles.link}`}>8 800 550-44-55</a></li>
            <li><a href="mailto:niaz@com-transport.ru" className={`mono ${styles.link}`}>niaz@com-transport.ru</a></li>
            <li><Link href="/kontakty" className={styles.link}>Адрес и реквизиты</Link></li>
            <li><Link href="/tendery" className={styles.link}>Тендерам и госзаказчикам</Link></li>
          </ul>
        </div>
      </div>

      <div className={`shell ${styles.legal}`}>
        <span className="mono">© {new Date().getFullYear()} ООО «Нижегородский автомобильный завод»</span>
        <Link href="/politika-konfidentsialnosti" className={styles.legalLink}>
          Политика конфиденциальности
        </Link>
      </div>
    </footer>
  );
}
