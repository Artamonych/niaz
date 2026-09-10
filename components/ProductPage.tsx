import Image from 'next/image';
import Link from 'next/link';
import { CATEGORY_BY_KEY } from '@/lib/catalog';
import { asmpClass, chassisBrand, type Product, type SpecRow } from '@/lib/content';
import { Breadcrumbs } from './Breadcrumbs';
import { LeadForm } from './LeadForm';
import styles from './ProductPage.module.css';

type Group = { title: string; rows: SpecRow[] };

/**
 * Комплектация донора — плоская таблица, где разделы отмечены строкой без номера
 * («2. Кузов, медицинский салон.»). Собираем её обратно в группы.
 */
function groupSpec(spec: SpecRow[]): Group[] {
  const groups: Group[] = [];

  for (const row of spec) {
    const isHeader = !row.no && /^\d+\./.test(row.text);
    if (isHeader) {
      groups.push({ title: row.text.replace(/^\d+\.\s*/, '').replace(/\.$/, ''), rows: [] });
      continue;
    }
    if (groups.length === 0) groups.push({ title: 'Комплектация', rows: [] });
    groups[groups.length - 1].rows.push(row);
  }

  return groups.filter((g) => g.rows.length > 0);
}

/** Документы, которые уже опубликованы на сайте — их и показываем в блоке закупки. */
const PURCHASE_DOCS = [
  { fmt: 'СТР', t: 'Положение о гарантийных обязательствах', href: '/polozhenie-o-garantiynyh-obyazatelstvah' },
  { fmt: 'СТР', t: 'Порядок обращения при гарантийном случае', href: '/poryadok-obrascheniya-pri-garantiynom-sluchae' },
  { fmt: 'СТР', t: 'Сертификация', href: '/sertifikatsiya' },
  { fmt: 'СТР', t: 'Пакет документов для тендера', href: '/tendery' },
];

export function ProductPage({ product }: { product: Product }) {
  const category = CATEGORY_BY_KEY[product.category];
  const groups = groupSpec(product.spec);
  const brand = chassisBrand(product.chassis);
  const cls = asmpClass(product.title);
  const photo = product.images[0];
  const thumbs = product.images.slice(1, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    category: category.title,
    ...(photo ? { image: photo } : {}),
    ...(product.chassis ? { model: product.chassis } : {}),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    manufacturer: {
      '@type': 'Organization',
      name: 'ООО «Нижегородский автомобильный завод»',
      url: 'https://com-transport.ru',
    },
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'RUB',
      url: `/${product.slug}`,
      seller: { '@type': 'Organization', name: 'ООО «Нижегородский автомобильный завод»' },
    },
  };

  const alt = `${product.title} — ${category.short}, производство ООО «Нижегородский автомобильный завод»`;

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { name: 'Продукция', href: '/produktsiya' },
          { name: category.short, href: `/${category.slug}` },
          { name: product.title },
        ]}
      />

      <header className={styles.head}>
        <p className={styles.badges}>
          <span className={`mono ${styles.badgeSolid}`}>
            {cls ? `КЛАСС ${cls} · ГОСТ 33665-2024` : category.short}
          </span>
          <span className={`mono ${styles.badgeGhost}`}>ТР ТС 018/2011</span>
        </p>
        <h1 className={styles.h1}>{product.title}</h1>
        {product.chassis && <p className={`mono ${styles.sub}`}>{product.chassis}</p>}
      </header>

      <div className={styles.top}>
        <div className={styles.main}>
          <div className={styles.gallery}>
            {photo ? (
              <Image src={photo} alt={alt} width={800} height={510} className={styles.photo} priority />
            ) : (
              <div className={styles.noPhoto}>
                <span className="mono">ФОТО ГОТОВИТСЯ</span>
              </div>
            )}
          </div>

          {thumbs.length > 0 && (
            <div className={styles.thumbs}>
              {thumbs.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt={`${product.title} — ракурс ${i + 2}`}
                  width={300}
                  height={225}
                  className={styles.thumb}
                />
              ))}
            </div>
          )}

          {product.lead && <p className={styles.lead}>{product.lead}</p>}

          {groups.length > 0 && (
            <section className={styles.specSection}>
              <h2 className={styles.h2}>Комплектация исполнения</h2>
              <div className={`rule ${styles.rule}`} data-line="1" aria-hidden="true" />

              <div className={styles.groups}>
                {groups.map((group) => (
                  <section key={group.title} className={styles.group}>
                    <h3 className={styles.groupTitle}>{group.title}</h3>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <tbody>
                          {group.rows.map((row, i) => (
                            <tr key={`${row.no}-${i}`}>
                              <td className={`mono ${styles.no}`}>{row.no}</td>
                              <td className={styles.text}>{row.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={styles.aside}>
          <div className={styles.priceCard}>
            <p className={`mono ${styles.priceLabel}`}>Стоимость</p>
            <p className={`mono ${styles.price}`}>По запросу</p>
            <p className={styles.priceNote}>
              Итоговая цена — по опросному листу: комплектация, количество и сроки поставки.
            </p>
            <a href="#zapros" className={styles.cta}>
              Получить КП
            </a>
            <Link href="/tendery#zapros" className={`u-corner ${styles.ctaGhost}`}>
              Подобрать под ТЗ
            </Link>
            <p className={`mono ${styles.contacts}`}>
              <a href="tel:88005504455">8 800 550-44-55</a>
              <br />
              <a href="mailto:niaz@com-transport.ru">niaz@com-transport.ru</a>
              <br />
              Ответ в течение 1 раб. дня
            </p>
          </div>

          <div className={styles.docsCard}>
            <p className={`mono ${styles.docsTitle}`}>Для госзакупки</p>
            <ul className={styles.docs}>
              {PURCHASE_DOCS.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className={styles.doc}>
                    <span className={`mono ${styles.docFmt}`}>{d.fmt}</span>
                    <span className={styles.docTitle}>{d.t}</span>
                    <span className={`mono ${styles.docArrow}`}>↓</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={`mono ${styles.docsNote}`}>
              Реквизиты и ОТТС высылаем в день обращения
            </p>
          </div>
        </aside>
      </div>

      <section className={styles.formSection} id="zapros">
        <div>
          <p className="label label-deep">Заявка</p>
          <h2 className={styles.h2}>Запросить коммерческое предложение</h2>
          <p className={styles.formLead}>
            Укажите количество и особые требования — подготовим расчёт с комплектом
            документов для обоснования закупки.
          </p>
        </div>
        <LeadForm subject={product.title} />
      </section>
    </div>
  );
}
