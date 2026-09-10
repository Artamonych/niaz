/**
 * Структура каталога после правок заказчика от 02.09.2026 (Telegram):
 *   1. в подразделе АСМП убрать обе строки «на шасси»;
 *   2. в этот же подраздел перенести «Транспорт для МГН»;
 *   3. автобусы убрать полностью.
 *
 * «Грузопассажирские» при этом сохранены отдельной линейкой: у донора это
 * самостоятельный раздел на 18 товарных страниц, а не подраздел автобусов.
 */

export type CategoryKey = 'asmp' | 'gp' | 'mgn' | 'spec' | 'van' | 'ritual';

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
];

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, Category>;

/** Раздел донора, который снят с сайта: все его URL уходят в 301. */
export const REMOVED_DONOR_SECTION = 'Автобусы';

export type MenuColumn = { title: string; items: { label: string; href: string }[] };

/**
 * Мегаменю. Колонка «АВТОБУСЫ» удалена целиком, «Транспорт для МГН» переехал
 * под АСМП, строки «На шасси ГАЗ» и «На шасси DONGFENG» убраны.
 */
export const MENU: Record<string, MenuColumn[]> = {
  tech: [
    {
      title: 'АСМП',
      items: [
        { label: 'Класс A', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=A' },
        { label: 'Класс B', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=B' },
        { label: 'Класс C', href: '/avtomobili-skoroy-meditsinskoy-pomoschi?cls=C' },
        { label: 'Транспорт для МГН', href: '/avtomobili-dlya-perevozki-lits-s-ogranichennymi-vozmozhnostyami' },
      ],
    },
    {
      title: 'ГРУЗОПАССАЖИРСКИЕ',
      items: [
        { label: 'Все исполнения', href: '/gruzopassazhirskie-mikroavtobusy' },
        { label: 'Комби с остеклением', href: '/gruzopassazhirskie-mikroavtobusy?ispolnenie=kombi' },
      ],
    },
    {
      title: 'ФУРГОНЫ И СПЕЦТЕХНИКА',
      items: [
        { label: 'Изотермические фургоны', href: '/furgony-izotermicheskie-i-obschego-naznacheniya?tip=izotermicheskiy' },
        { label: 'Фургоны общего назначения', href: '/furgony-izotermicheskie-i-obschego-naznacheniya' },
        { label: 'Спецавтомобили и лаборатории', href: '/spets-avtomobili-i-laboratorii' },
        { label: 'Автомобили для ритуальных услуг', href: '/avtomobili-dlya-ritualnyy-uslug' },
      ],
    },
    {
      title: 'СОЦИАЛЬНЫЙ ТРАНСПОРТ',
      items: [
        { label: 'Автолавки', href: '/spets-avtomobili-i-laboratorii?tip=avtolavka' },
        { label: 'Мобильные комплексы', href: '/spets-avtomobili-i-laboratorii?tip=kompleks' },
      ],
    },
  ],
  service: [
    {
      title: 'АСМП-СЕРВИС',
      items: [
        { label: 'Гарантии', href: '/garantii' },
        { label: 'Положение о гарантийных обязательствах', href: '/polozhenie-o-garantiynyh-obyazatelstvah' },
        { label: 'Порядок обращения при гарантийном случае', href: '/poryadok-obrascheniya-pri-garantiynom-sluchae' },
        { label: 'Электрические схемы', href: '/elektricheskie-shemy' },
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
};

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
