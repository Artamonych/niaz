import Image from 'next/image';
import { CATEGORY_BY_KEY } from '@/lib/catalog';
import { chassisBrand, type Product, type SpecRow } from '@/lib/content';
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

export function ProductPage({ product }: { product: Product }) {
  const category = CATEGORY_BY_KEY[product.category];
  const groups = groupSpec(product.spec);
  const brand = chassisBrand(product.chassis);
  const photo = product.images[0];

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

      <div className={styles.top}>
        <div className={styles.gallery}>
          {photo ? (
            <Image
              src={photo}
              alt={alt}
              width={800}
              height={510}
              className={styles.photo}
              priority
            />
          ) : (
            <div className={styles.noPhoto}>
              <span className="mono">ФОТО ГОТОВИТСЯ</span>
            </div>
          )}
        </div>

        <div>
          <span className={`mono ${styles.badge}`}>{category.short}</span>
          <h1 className={styles.h1}>{product.title}</h1>
          {product.lead && <p className={styles.lead}>{product.lead}</p>}

          <dl className={styles.facts}>
            {product.chassis && (
              <div className={styles.fact}>
                <dt className={styles.factK}>Базовое шасси</dt>
                <dd className={`mono ${styles.factV}`}>{product.chassis}</dd>
              </div>
            )}
            <div className={styles.fact}>
              <dt className={styles.factK}>Позиций комплектации</dt>
              <dd className={`mono ${styles.factV}`}>{product.spec.length || '—'}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factK}>Соответствие</dt>
              <dd className={`mono ${styles.factV}`}>ТР ТС 018/2011</dd>
            </div>
          </dl>

          <a href="#zapros" className={styles.cta}>
            Запросить КП по этому исполнению
          </a>
        </div>
      </div>

      {groups.length > 0 && (
        <section className={styles.specSection}>
          <p className="label">Комплектация</p>
          <h2 className={styles.h2}>Состав исполнения</h2>

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

      <section className={styles.formSection} id="zapros">
        <div>
          <p className="label">Заявка</p>
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
