/**
 * Структура каталога после правок заказчика от 02.09.2026 (Telegram):
 *   1. в подразделе АСМП убрать обе строки «на шасси»;
 *   2. в этот же подраздел перенести «Транспорт для МГН»;
 *   3. автобусы убрать полностью.
 *
 * «Грузопассажирские» при этом сохранены отдельной линейкой: у донора это
 * самостоятельный раздел на 18 товарных страниц, а не подраздел автобусов.
 */

export type CategoryKey = 'asmp' | 'gp' | 'mgn' | 'spec' | 'van' | 'ritual' | 'trailer';

export type Category = {
  key: CategoryKey;
  /** Номер для «инженерной» нумерации плиток на главной. */
  no: string;
  /** Канонический URL — слаг донора: менять его нельзя, на нём висит индексация. */
  slug: string;
  /** Короткий человекочитаемый адрес, отдаёт 301 на канонический. */
  alias: string;
  title: string;
  short: string;
  lead: string;
  /** Названия разделов донора, которые сюда сводятся. */
  donorSections: string[];
};

export const CATEGORIES: Category[] = [
  {
    key: 'asmp',
    no: '01',
    slug: 'avtomobili-skoroy-meditsinskoy-pomoschi',
    alias: 'asmp',
    title: 'Автомобили скорой медицинской помощи',
    short: 'АСМП',
    lead: 'Классы A, B и C по ГОСТ 33665-2024. Реанимационные и линейные исполнения, комплектация под техническое задание заказчика.',
    donorSections: ['Автомобили скорой медицинской помощи'],
  },
  {
    key: 'mgn',
    no: '02',
    slug: 'avtomobili-dlya-perevozki-lits-s-ogranichennymi-vozmozhnostyami',
    alias: 'transport-mgn',
    title: 'Транспорт для маломобильных граждан',
    short: 'Транспорт для МГН',
    lead: 'Аппарели и электрогидравлические подъёмники, крепления кресел-колясок, места для сопровождающих.',
    donorSections: ['Автомобили для перевозки лиц с ограниченными возможностями'],
  },
  {
    key: 'gp',
    no: '03',
    slug: 'gruzopassazhirskie-mikroavtobusy',
    alias: 'gruzopassazhirskie',
    title: 'Грузопассажирские автомобили',
    short: 'Грузопассажирские',
    lead: 'Комби-исполнения с разделением салона и грузового отсека. Категории B и C.',
    donorSections: ['Грузопассажирские'],
  },
  {
    key: 'spec',
    no: '04',
    slug: 'spets-avtomobili-i-laboratorii',
    alias: 'spetsavtomobili',
    title: 'Спецавтомобили и лаборатории',
    short: 'Спецавтомобили',
    lead: 'Мобильные лаборатории, передвижные комплексы, аварийные и служебные автомобили.',
    donorSections: ['Спец.автомобили и лаборатории'],
  },
  {
    key: 'van',
    no: '05',
    slug: 'furgony-izotermicheskie-i-obschego-naznacheniya',
    alias: 'furgony',
    title: 'Фургоны изотермические и общего назначения',
    short: 'Фургоны',
    lead: 'Изотермические кузова и фургоны общего назначения на шасси и цельнометаллической базе.',
    donorSections: ['Фургоны изотермические и общего назначения'],
  },
  {
    key: 'ritual',
    no: '06',
    slug: 'avtomobili-dlya-ritualnyy-uslug',
    alias: 'ritualnye',
    title: 'Автомобили для ритуальных услуг',
    short: 'Ритуальные',
    lead: 'Катафалки и автомобили сопровождения, специализированная отделка салона.',
    donorSections: ['Автомобили для ритуальных услуг'],
  },
  {
    // Собственный раздел завода, у донора его не было: слаг наш, не донорский,
    // и под ним уже стоял пункт меню. Товары — в lib/trailers.ts.
    key: 'trailer',
    no: '07',
    slug: 'pritsepy',
    alias: 'pricepy',
    title: 'Прицепы',
    short: 'Прицепы',
    lead: 'Жилые прицепы собственной разработки: кемпер и передвижной жилой комплекс.',
    donorSections: [],
  },
];

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, Category>;

/** Раздел донора, который снят с сайта: все его URL уходят в 301. */
export const REMOVED_DONOR_SECTION = 'Автобусы';

/**
 * Подразделы внутри категории: в меню это отдельные пункты, на странице
 * категории — фильтр «Вид». Ссылка вида /<категория>?tip=<key> открывает
 * категорию с уже выбранным подразделом. Своих URL у подразделов нет: товары
 * остаются на адресах донора, а раскладка — лишь срез по названиям.
 */
export type CategoryKind = {
  key: string;
  label: string;
  match: (p: { slug: string; title: string }) => boolean;
};

const bySlug =
  (...slugs: string[]) =>
  (p: { slug: string }) =>
    slugs.includes(p.slug);

export const KINDS: Partial<Record<CategoryKey, CategoryKind[]>> = {
  spec: [
    {
      key: 'laboratorii',
      label: 'Лаборатории',
      match: (p) =>
        p.slug === 'dorozhnaya-laboratoriya-volkswagen-crafter' ||
        p.slug === 'spets-avtomobil-peugeot' ||
        p.slug.startsWith('spets-avtomobili-i-laboratorii-'),
    },
    {
      key: 'avtolavki',
      label: 'Автолавки',
      match: bySlug('avtolavka', 'avtolavka-mercedes-benz-sprinter-classic-311', 'kofe-s-soboy'),
    },
    {
      key: 'kompleksy',
      label: 'Мобильные комплексы',
      match: bySlug(
        'peugeot-boxer-peredvizhnoy-kompleks-mvd',
        'avtomobil-dlya-radiokompanii',
        'sobol-4h4-avtokemper',
      ),
    },
    {
      key: 'medsluzhba',
      label: 'Медицинская служба',
      match: bySlug(
        'skoraya-meditsinskaya-pomosch-klassa-s-reanimatsiya',
        'skoraya-meditsinskaya-pomosch-klassa-v',
        'peredvizhnoy-punkt-meditsinskogo-osvidetelstvovaniya-volkswagen-crafter',
      ),
    },
  ],
  van: [
    { key: 'izotermicheskie', label: 'Изотермические', match: (p) => /изотерм/i.test(p.title) },
    {
      key: 'obschego-naznacheniya',
      label: 'Общего назначения',
      match: (p) => /общего назначения|промтоварн|хлебн|мороженовоз/i.test(p.title),
    },
  ],
};

export type MenuColumn = { title: string; items: { label: string; href: string }[] };

const SPEC = '/spets-avtomobili-i-laboratorii';
const VAN = '/furgony-izotermicheskie-i-obschego-naznacheniya';

/**
 * Мегаменю после правок заказчика от 21.09.2026: «Спецтехника» стала
 * «Продукцией», грузопассажирские из меню сняты (страницы остаются — на них
 * индексация), «Фургоны и спецтехника» разбиты надвое, «Транспорт для МГН»
 * переехал в соцтранспорт как «Социальное такси», добавлены прицепы,
 * у АСМП-сервиса и инженерии — новые подразделы.
 */
export const MENU = {
  tech: [
    {
      title: 'АСМП',
      items: [
        { label: 'Класс A', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=A' },
        { label: 'Класс B', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=B' },
        { label: 'Класс C', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=C' },
      ],
    },
    {
      title: 'ФУРГОНЫ',
      items: [
        { label: 'Изотермические фургоны', href: `${VAN}?tip=izotermicheskie` },
        { label: 'Фургоны общего назначения', href: `${VAN}?tip=obschego-naznacheniya` },
      ],
    },
    {
      title: 'СПЕЦТЕХНИКА',
      items: [
        { label: 'Лаборатории', href: `${SPEC}?tip=laboratorii` },
        { label: 'Автолавки', href: `${SPEC}?tip=avtolavki` },
        { label: 'Мобильные комплексы', href: `${SPEC}?tip=kompleksy` },
        { label: 'Ритуальные услуги', href: '/avtomobili-dlya-ritualnyy-uslug' },
        { label: 'Медицинская служба', href: `${SPEC}?tip=medsluzhba` },
      ],
    },
    {
      title: 'СОЦТРАНСПОРТ',
      items: [
        {
          label: 'Социальное такси',
          href: '/avtomobili-dlya-perevozki-lits-s-ogranichennymi-vozmozhnostyami',
        },
      ],
    },
    {
      title: 'ПРИЦЕПЫ',
      items: [{ label: 'Прицепы', href: '/pritsepy' }],
    },
  ],
  service: [
    {
      title: 'АСМП-СЕРВИС',
      items: [
        { label: 'Ремонт и восстановление', href: '/remont-i-vosstanovlenie' },
        { label: 'Обновление и модернизация', href: '/obnovlenie-i-modernizatsiya' },
      ],
    },
  ],
  about: [
    {
      title: 'О ЗАВОДЕ',
      items: [
        { label: 'О компании', href: '/o-kompanii' },
        { label: 'Достижения', href: '/dostizheniya' },
        { label: 'Сертификация', href: '/sertifikatsiya' },
        { label: 'Галерея', href: '/galereya' },
        { label: 'Уникальные проекты', href: '/unikalnye-proekty' },
      ],
    },
    {
      title: 'ИНФОРМАЦИЯ',
      items: [
        { label: 'Новости', href: '/novosti' },
        { label: 'Партнёры', href: '/partnery' },
        { label: 'Контакты', href: '/kontakty' },
      ],
    },
  ],
  engineering: [
    {
      title: 'ИНЖЕНЕРИЯ',
      items: [
        { label: 'Конструкторский центр', href: '/konstruktorskiy-tsentr' },
        { label: 'Дизайн-центр', href: '/dizayn-tsentr' },
        { label: 'Производственные мощности', href: '/inzheneriya#moshchnosti' },
        { label: 'Услуги производства', href: '/inzheneriya/uslugi' },
      ],
    },
  ],
} satisfies Record<string, MenuColumn[]>;

/**
 * Подразделы, которые заказчик завёл в меню, но материалы по ним ещё не
 * передал. Страница есть, чтобы пункт меню не вёл в 404, но в индекс она не
 * идёт и в sitemap не попадает — пока там нечего индексировать.
 */
export type PlannedPage = {
  slug: string;
  title: string;
  lead: string;
  parent: { name: string; href?: string };
};

export const PLANNED_PAGES: PlannedPage[] = [
  {
    slug: 'remont-i-vosstanovlenie',
    title: 'Ремонт и восстановление',
    lead: 'Ремонт и восстановление автомобилей скорой медицинской помощи.',
    parent: { name: 'АСМП-сервис' },
  },
  {
    slug: 'obnovlenie-i-modernizatsiya',
    title: 'Обновление и модернизация',
    lead: 'Обновление и модернизация автомобилей скорой медицинской помощи.',
    parent: { name: 'АСМП-сервис' },
  },
  {
    slug: 'konstruktorskiy-tsentr',
    title: 'Конструкторский центр',
    lead: 'Разработка исполнений под техническое задание.',
    parent: { name: 'Инженерия', href: '/inzheneriya/' },
  },
  {
    slug: 'dizayn-tsentr',
    title: 'Дизайн-центр',
    lead: 'Проработка внешнего вида и планировки салона.',
    parent: { name: 'Инженерия', href: '/inzheneriya/' },
  },
];

export const getPlannedPage = (slug: string) => PLANNED_PAGES.find((p) => p.slug === slug);

/**
 * Разделы, у которых на доноре была только архивная страница WordPress
 * (/category/<slug>/), но не было собственной. Их индексы собираем сами,
 * а архив уводим 301 на них — иначе три проиндексированных адреса упадут в 404.
 */
export const SECTION_INDEXES = [
  {
    slug: 'novosti',
    section: 'Новости',
    title: 'Новости завода',
    lead: 'Производство, поставки и события Нижегородского автомобильного завода.',
  },
  {
    slug: 'dostizheniya',
    section: 'Достижения',
    title: 'Достижения',
    lead: 'Благодарственные письма, награды и подтверждения качества.',
  },
  {
    slug: 'informatsionnyy-razdel',
    section: 'Информационный раздел',
    title: 'Информационный раздел',
    lead: 'Разборы по технике, комплектации и переоборудованию: что важно знать до закупки.',
  },
] as const;
