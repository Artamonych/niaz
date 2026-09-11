/**
 * Правила новостей, общие для сервера и браузера. Модуль без node-зависимостей:
 * его импортирует и клиентский загрузчик фото в CRM.
 */
export const NEWS_MAX_PHOTOS = 12;
export const NEWS_MAX_PHOTO_MB = 15;
export const NEWS_MAX_PHOTO_BYTES = NEWS_MAX_PHOTO_MB * 1024 * 1024;

/**
 * Публичный адрес фото. Относительный намеренно: сайт и CRM могут жить на
 * разных доменах одного приложения, и ссылка встаёт на тот, где открыта страница.
 */
export const newsPhotoUrl = (file: string) => `/media/news/${file}`;

/**
 * «Сегодня» по Москве в виде YYYY-MM-DD. Дата новости — календарный день завода,
 * а не момент по UTC: иначе новость «сегодняшним числом», выпущенная ночью,
 * до 03:00 считалась бы запланированной на будущее и на сайт не выходила.
 */
export const newsToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());

/** День публикации из базы: хранится полночью UTC выбранной даты. */
export const toDay = (date: Date) => date.toISOString().slice(0, 10);

/** Видна ли новость на сайте: опубликована, и её день по Москве уже наступил. */
export const isNewsLive = (post: { status: string; publishedAt: Date }) =>
  post.status === 'PUBLISHED' && toDay(post.publishedAt) <= newsToday();

/** 2024-01-15 → 15.01.2024: так даты подписаны в прототипе. */
export const formatNewsDate = (isoDay: string) => isoDay.split('-').reverse().join('.');

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Адрес новости из заголовка — той же транслитерацией, что у адресов донора. */
export function slugify(text: string): string {
  const latin = [...text.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('');
  const slug = latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || 'novost';
}
