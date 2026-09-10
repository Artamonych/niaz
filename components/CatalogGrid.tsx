'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './CatalogGrid.module.css';

export type CatalogItem = {
  slug: string;
  title: string;
  chassis: string;
  brand: string;
  cls: string;
  specCount: number;
  image?: string;
};

const ALL = 'Все';

/**
 * Каталог по образцу прототипа: слева — колонка фильтров и блок подбора под ТЗ,
 * справа — карточки с фотографией, ключевыми строками и переходом в карточку.
 */
export function CatalogGrid({ items, showClass }: { items: CatalogItem[]; showClass: boolean }) {
  const [brand, setBrand] = useState(ALL);
  const [cls, setCls] = useState(ALL);

  const brands = useMemo(
    () => [ALL, ...[...new Set(items.map((i) => i.brand).filter(Boolean))].sort()],
    [items],
  );
  const classes = useMemo(
    () => [ALL, ...[...new Set(items.map((i) => i.cls).filter(Boolean))].sort()],
    [items],
  );

  const filtered = items.filter(
    (i) => (brand === ALL || i.brand === brand) && (cls === ALL || i.cls === cls),
  );

  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        {showClass && classes.length > 2 && (
          <FilterRow label="Класс по ГОСТ" options={classes} value={cls} onChange={setCls} />
        )}
        {brands.length > 2 && (
          <FilterRow label="Шасси" options={brands} value={brand} onChange={setBrand} />
        )}

        <div className={styles.tzCard}>
          <p className={`label label-deep ${styles.tzTitle}`}>Подбор под ТЗ</p>
          <p className={styles.tzText}>
            Пришлите техническое задание — вернём спецификацию и расчёт в течение
            1 рабочего дня.
          </p>
          <Link href="#zapros" className={styles.tzButton}>
            Отправить ТЗ
          </Link>
        </div>
      </aside>

      <div className={styles.results}>
        <p className={`mono ${styles.count}`} role="status">
          Найдено: {filtered.length}
        </p>

        {filtered.length === 0 ? (
          <p className={styles.empty}>
            По выбранным условиям исполнений нет. Сбросьте фильтр или{' '}
            <Link href="#zapros" className={styles.emptyLink}>
              запросите подбор
            </Link>
            .
          </p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((item) => (
              <Link key={item.slug} href={`/${item.slug}`} className={`u-corner ${styles.card}`}>
                <span className={styles.photo}>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={800}
                      height={500}
                      className={styles.img}
                    />
                  ) : (
                    <span className={`mono ${styles.photoStub}`}>ФОТО ГОТОВИТСЯ</span>
                  )}
                  {(item.cls || item.brand) && (
                    <span className={`mono ${styles.badge}`}>
                      {item.cls ? `КЛАСС ${item.cls}` : item.brand}
                    </span>
                  )}
                </span>

                <span className={styles.body}>
                  <span className={styles.cardTitle}>{item.title}</span>

                  <span className={styles.rows}>
                    {item.chassis && (
                      <span className={styles.row}>
                        <span>Базовое шасси</span>
                        <span className={`mono ${styles.rowV}`}>{item.chassis}</span>
                      </span>
                    )}
                    <span className={styles.row}>
                      <span>Соответствие</span>
                      <span className={`mono ${styles.rowV}`}>ТР ТС 018/2011</span>
                    </span>
                    <span className={styles.row}>
                      <span>Комплектация</span>
                      <span className={`mono ${styles.rowV}`}>
                        {item.specCount > 0 ? `${item.specCount} позиций` : 'по запросу'}
                      </span>
                    </span>
                  </span>

                  <span className={styles.foot}>
                    <span className={`mono ${styles.footPrice}`}>Цена по запросу</span>
                    <span className={styles.footLink}>Карточка →</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.filterRow}>
      <span className={`label ${styles.filterLabel}`}>{label}</span>
      <div className={styles.chips}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.chip}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
