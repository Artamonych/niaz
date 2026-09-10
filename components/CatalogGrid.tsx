'use client';

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
};

const ALL = 'Все';

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
    <>
      <div className={styles.filters}>
        {showClass && classes.length > 2 && (
          <FilterRow label="Класс" options={classes} value={cls} onChange={setCls} />
        )}
        {brands.length > 2 && (
          <FilterRow label="Базовое шасси" options={brands} value={brand} onChange={setBrand} />
        )}
        <p className={`mono ${styles.count}`} role="status">
          Найдено: {filtered.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          По выбранным условиям исполнений нет. Сбросьте фильтр или{' '}
          <Link href="/tendery#zapros" className={styles.emptyLink}>запросите подбор</Link>.
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <Link key={item.slug} href={`/${item.slug}`} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              {item.chassis && (
                <p className={`mono ${styles.cardChassis}`}>{item.chassis}</p>
              )}
              <span className={`mono ${styles.cardMeta}`}>
                {item.specCount > 0 ? `${item.specCount} позиций комплектации` : 'Комплектация по запросу'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
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
