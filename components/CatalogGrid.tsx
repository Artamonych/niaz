'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CategoryPhoto } from '@/lib/content';
import { plural } from '@/lib/plural';
import { PhotoGrid } from './PhotoGrid';
import styles from './CatalogGrid.module.css';

export type CatalogItem = {
  slug: string;
  title: string;
  chassis: string;
  brand: string;
  cls: string;
  /** Подразделы категории (KINDS), в которые попадает исполнение. */
  kinds: string[];
  specCount: number;
  image?: string;
};

const ALL = 'Все';

type GridProps = {
  items: CatalogItem[];
  showClass: boolean;
  kinds: { key: string; label: string }[];
  /**
   * Снимки раздела. Фильтр отбирает их вместе с карточками (правка от
   * 01.10.2026: «фильтр отрабатывает на все плитки на странице»): снимок
   * проходит, только если у него есть метка выбранного класса, вида или марки.
   */
  photos: CategoryPhoto[];
  photosLead?: string;
};

/**
 * Каталог с фильтрами из адреса: пункты меню ведут на /<категория>?tip=… и
 * ?cls=…, и страница открывается с уже выбранным подразделом или классом.
 * Адрес читается только в браузере — на сервере рендерится полный список
 * (см. Suspense в CategoryPage), чтобы все карточки были в HTML для поиска.
 */
export function CatalogGridFromUrl(props: GridProps) {
  const params = useSearchParams();
  const tip = params.get('tip') ?? '';
  const cls = params.get('cls') ?? '';
  // key пересоздаёт сетку при переходе по меню внутри той же категории.
  return <CatalogGrid key={`${tip}|${cls}`} {...props} initialKind={tip} initialCls={cls} />;
}

/**
 * Каталог по образцу прототипа: слева — колонка фильтров и блок подбора под ТЗ,
 * справа — карточки с фотографией, ключевыми строками и переходом в карточку.
 */
export function CatalogGrid({
  items,
  showClass,
  kinds,
  photos,
  photosLead,
  initialKind = '',
  initialCls = '',
}: GridProps & { initialKind?: string; initialCls?: string }) {
  const kindLabels = [ALL, ...kinds.map((k) => k.label)];
  const labelOf = (key: string) => kinds.find((k) => k.key === key)?.label;

  const [brand, setBrand] = useState(ALL);
  const [cls, setCls] = useState(showClass && /^[ABC]$/.test(initialCls) ? initialCls : ALL);
  const [kind, setKind] = useState(labelOf(initialKind) ?? ALL);
  const kindKey = kinds.find((k) => k.label === kind)?.key;

  const brands = useMemo(
    () => [ALL, ...[...new Set(items.map((i) => i.brand).filter(Boolean))].sort()],
    [items],
  );
  const classes = useMemo(
    () => [ALL, ...[...new Set(items.map((i) => i.cls).filter(Boolean))].sort()],
    [items],
  );

  const filtered = items.filter(
    (i) =>
      (brand === ALL || i.brand === brand) &&
      (cls === ALL || i.cls === cls) &&
      (!kindKey || i.kinds.includes(kindKey)),
  );

  // Снимок без метки под выбранный фильтр не проходит: приписать кадру класс
  // или марку, которых нет в папке заказчика, нельзя.
  const shownPhotos = photos.filter(
    (p) =>
      (brand === ALL || p.brand === brand) &&
      (cls === ALL || p.cls === cls) &&
      (!kindKey || p.kind === kindKey),
  );

  return (
    <>
      <div className={styles.layout}>
        <aside className={styles.aside}>
          {kinds.length > 0 && (
            <FilterRow label="Вид" options={kindLabels} value={kind} onChange={setKind} />
          )}
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
                <Link key={item.slug} href={`/${item.slug}/`} className={`u-corner ${styles.card}`}>
                  <span className={styles.photo}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={800}
                        height={500}
                        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 350px"
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
                          {item.specCount > 0
                            ? `${item.specCount} ${plural(item.specCount, 'позиция', 'позиции', 'позиций')}`
                            : 'по запросу'}
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

      <PhotoGrid
        title="Фотографии раздела"
        lead={photosLead}
        photos={shownPhotos}
        empty={photos.length ? 'Под выбранный фильтр снимков нет: класс, вид или марка отмечены у снимка, только когда это известно точно.' : undefined}
      />
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
