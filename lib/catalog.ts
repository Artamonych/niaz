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
 * Виды внутри категории — срез карточек по названиям: на странице категории
 * это фильтр «Вид». Товары остаются на адресах донора. У каждого вида есть и
 * своя страница-подраздел (SUBSECTIONS ниже); старые ссылки вида
 * /<категория>?tip=<key> по-прежнему открывают категорию с выбранным видом.
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

/**
 * Подразделы со своей страницей: /<категория>/<подраздел>/.
 *
 * До 01.10.2026 пункты меню «Автолавки», «Лаборатории», «Класс B» вели на
 * страницу категории с фильтром в адресе — и показывали её заголовок и текст:
 * у «Автолавок» стоял текст про спецавтомобили. Теперь у подраздела свой
 * заголовок и описание, а карточки и снимки отобраны под него.
 *
 * Описания — по тому, что лежит в карточках подраздела; классы АСМП — по
 * определениям ГОСТ 33665-2024. Ничего сверх этого не утверждаем.
 */
export type Subsection = {
  category: CategoryKey;
  slug: string;
  title: string;
  /** Короткое имя для крошек и меню. */
  short: string;
  lead: string;
  /** Отбор: вид из KINDS или класс АСМП. */
  filter: { kind: string } | { cls: 'A' | 'B' | 'C' };
};

export const SUBSECTIONS: Subsection[] = [
  {
    category: 'asmp',
    slug: 'klass-a',
    title: 'АСМП класса A',
    short: 'Класс A',
    lead: 'Автомобили скорой медицинской помощи класса A по ГОСТ 33665-2024 — для транспортировки пациентов, которым не требуется экстренная помощь в пути.',
    filter: { cls: 'A' },
  },
  {
    category: 'asmp',
    slug: 'klass-b',
    title: 'АСМП класса B',
    short: 'Класс B',
    lead: 'Автомобили скорой медицинской помощи класса B по ГОСТ 33665-2024 — для лечебных мероприятий силами врачебной или фельдшерской бригады, транспортировки и наблюдения за пациентом в пути.',
    filter: { cls: 'B' },
  },
  {
    category: 'asmp',
    slug: 'klass-c',
    title: 'АСМП класса C',
    short: 'Класс C',
    lead: 'Реанимобили — автомобили скорой медицинской помощи класса C по ГОСТ 33665-2024: для лечебных мероприятий силами реанимационной бригады, транспортировки и мониторинга пациента.',
    filter: { cls: 'C' },
  },
  {
    category: 'spec',
    slug: 'laboratorii',
    title: 'Передвижные лаборатории',
    short: 'Лаборатории',
    lead: 'Лаборатории на базе микроавтобусов и фургонов — от дорожной лаборатории до исполнения под задачу заказчика: рабочие места, оборудование и электрика салона.',
    filter: { kind: 'laboratorii' },
  },
  {
    category: 'spec',
    slug: 'avtolavki',
    title: 'Автолавки и передвижные пункты питания',
    short: 'Автолавки',
    lead: 'Автолавки и передвижные пункты питания: торговые витрины, холодильное оборудование, мойка и раздача — для торговли и выездного питания.',
    filter: { kind: 'avtolavki' },
  },
  {
    category: 'spec',
    slug: 'mobilnye-kompleksy',
    title: 'Мобильные комплексы',
    short: 'Мобильные комплексы',
    lead: 'Передвижные комплексы под конкретную службу: служебные и штабные автомобили, машина для радиокомпании, автокемпер на полноприводном шасси.',
    filter: { kind: 'kompleksy' },
  },
  {
    category: 'spec',
    slug: 'meditsinskaya-sluzhba',
    title: 'Медицинская служба',
    short: 'Медицинская служба',
    lead: 'Медицинские автомобили и передвижные кабинеты: пункт медицинского освидетельствования, мобильный стоматологический кабинет.',
    filter: { kind: 'medsluzhba' },
  },
  {
    category: 'van',
    slug: 'izotermicheskie',
    title: 'Изотермические фургоны',
    short: 'Изотермические',
    lead: 'Изотермические фургоны для перевозки продуктов и грузов, которым нужен температурный режим: утеплённый кузов на шасси или цельнометаллической базе.',
    filter: { kind: 'izotermicheskie' },
  },
  {
    category: 'van',
    slug: 'obschego-naznacheniya',
    title: 'Фургоны общего назначения',
    short: 'Общего назначения',
    lead: 'Фургоны общего назначения: промтоварные, хлебные, мороженовозы и универсальные кузова на шасси грузовиков и микроавтобусов.',
    filter: { kind: 'obschego-naznacheniya' },
  },
];

export const subsectionsOf = (key: CategoryKey) => SUBSECTIONS.filter((s) => s.category === key);

export const getSubsection = (categorySlug: string, slug: string) => {
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  return category ? SUBSECTIONS.find((s) => s.category === category.key && s.slug === slug) : undefined;
};

/** Адрес подраздела: от канонического слага категории. */
export const subsectionHref = (s: Subsection) => `/${CATEGORY_BY_KEY[s.category].slug}/${s.slug}`;

export type MenuColumn = { title: string; items: { label: string; href: string }[] };

// Пункты подразделов ведут на их страницы (SUBSECTIONS), а не на фильтр в адресе.
const ASMP = '/avtomobili-skoroy-meditsinskoy-pomoschi';
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
        { label: 'Класс A', href: `${ASMP}/klass-a` },
        { label: 'Класс B', href: `${ASMP}/klass-b` },
        { label: 'Класс C', href: `${ASMP}/klass-c` },
        { label: 'Интерьеры', href: '/interery-asmp' },
      ],
    },
    {
      title: 'ФУРГОНЫ',
      items: [
        { label: 'Изотермические фургоны', href: `${VAN}/izotermicheskie` },
        { label: 'Фургоны общего назначения', href: `${VAN}/obschego-naznacheniya` },
      ],
    },
    {
      title: 'СПЕЦТЕХНИКА',
      items: [
        { label: 'Лаборатории', href: `${SPEC}/laboratorii` },
        { label: 'Автолавки', href: `${SPEC}/avtolavki` },
        { label: 'Мобильные комплексы', href: `${SPEC}/mobilnye-kompleksy` },
        { label: 'Ритуальные услуги', href: '/avtomobili-dlya-ritualnyy-uslug' },
        { label: 'Медицинская служба', href: `${SPEC}/meditsinskaya-sluzhba` },
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
    {
      // На уровне продукции, не в спецтехнике (правка от 01.10.2026).
      title: 'МОБИЛЬНЫЕ ОФИСЫ',
      items: [{ label: 'Мобильные офисы', href: '/mobilnye-ofisy' }],
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
        { label: 'Реквизиты', href: '/rekvizity' },
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
