/**
 * Чистка HTML из выгрузки WordPress до безопасного подмножества.
 *
 * Тела статей донора — это не только абзацы: 919 ячеек таблиц (списки дилеров
 * у партнёров), 579 пунктов списков, 476 ссылок, 110 заголовков. Разбивать их
 * на абзацы нельзя — развалится смысл. Поэтому разметка сохраняется, но
 * пропускается только та, которую мы умеем отрисовать и которая не может
 * навредить: ни скриптов, ни стилей, ни чужих адресов.
 *
 * Всё остальное — атрибуты оформления WordPress, пустые обёртки, служебные
 * теги — выбрасывается.
 */

/** Теги, которые доходят до страницы. Остальные разворачиваются в текст. */
const KEEP = new Set([
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'a',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

/** Теги без закрывающей части. */
const VOID = new Set(['br']);

/** Внутренние ссылки донора приводим к своему адресу, как в build-content. */
function cleanHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || href.startsWith('#')) return null;
  if (/^(mailto|tel):/i.test(href)) return href;
  if (/^https?:\/\/(www\.)?com-transport\.ru\//i.test(href)) {
    return '/' + href.replace(/^https?:\/\/[^/]+\//i, '');
  }
  if (href.startsWith('/')) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return null;
}

/**
 * Оставляет только разрешённые теги и единственный полезный атрибут — адрес
 * ссылки. Текст между тегами сохраняется как есть, поэтому содержимое статьи
 * не теряется, даже если тег выброшен.
 */
export function cleanHtml(raw: string): string {
  const open: string[] = [];

  let html = raw
    // Скрипты и стили выбрасываются вместе с содержимым: это не текст статьи.
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (_full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    const closing = _full.startsWith('</');

    if (!KEEP.has(tag)) return ' ';

    if (VOID.has(tag)) return '<br>';

    if (closing) {
      // Закрываем только то, что открывали: битая разметка донора иначе
      // оставит висящие теги.
      const last = open.lastIndexOf(tag);
      if (last === -1) return '';
      open.splice(last, 1);
      return `</${tag}>`;
    }

    open.push(tag);

    if (tag === 'a') {
      const href = cleanHref((attrs.match(/href\s*=\s*["']([^"']*)["']/i) ?? [])[1] ?? '');
      if (!href) return '<a>';
      const external = /^https?:\/\//i.test(href);
      return external
        ? `<a href="${href}" target="_blank" rel="noopener nofollow">`
        : `<a href="${href}">`;
    }

    return `<${tag}>`;
  });

  // Незакрытые теги закрываем сами — иначе вёрстка страницы «поедет».
  for (const tag of [...open].reverse()) html += `</${tag}>`;

  return tidy(html);
}

/** Убирает пустые обёртки, повторы переносов и лишние пробелы. */
function tidy(html: string): string {
  let out = html
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n');

  // Пустые теги остаются от вырезанных картинок и оформления WordPress.
  let before = '';
  while (before !== out) {
    before = out;
    out = out
      .replace(/<(p|li|td|th|strong|em|h2|h3|h4|a)>\s*(<br>\s*)*<\/\1>/gi, '')
      .replace(/<(tr|ul|ol|tbody|thead|table)>\s*<\/\1>/gi, '');
  }

  return out
    .replace(/(<br>\s*){3,}/gi, '<br><br>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Убирает из начала тела первый абзац, если он повторяет вводку страницы.
 *
 * У донора вводка — это и есть первый абзац статьи, поэтому без такой чистки
 * он выводится дважды: сперва крупным шрифтом как вводка, затем ещё раз в
 * тексте.
 */
export function dropLeadingDuplicate(body: string, lead: string): string {
  const plain = (s: string) =>
    s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const needle = plain(lead);
  if (!needle || needle.length < 40) return body;

  // Отрезаем только целый первый абзац: вырывать кусок текста нельзя.
  const first = body.match(/^\s*<p>[\s\S]*?<\/p>/i);
  if (!first) return body;

  const head = plain(first[0]);
  if (head !== needle && !head.startsWith(needle)) return body;

  return body.slice(first[0].length).trim();
}

/** Сколько в статье живого текста — по нему решают, выводить ли её. */
export const textLength = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
