/**
 * Счёт неудачных попыток входа (п. 34 бэклога).
 *
 * Держим в памяти процесса: приложение одно, отдельная таблица ради этого не
 * нужна, а запись в базу на каждую попытку сама стала бы рычагом нагрузки.
 * После перезапуска счёт обнуляется — для CRM отдела продаж это приемлемо.
 *
 * Ключей на попытку два: учётная запись (подбор пароля к конкретному человеку)
 * и адрес в сети (перебор учёток подряд). Достаточно исчерпать любой из них.
 */
export const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 10 };

/**
 * Карта живёт на globalThis: в разработке Next перезагружает модули между
 * запросами, и обычная переменная модуля обнулялась бы вместе со счётом —
 * ограничение существовало бы только на бумаге.
 */
const store = globalThis as typeof globalThis & { __niazLoginFails?: Map<string, number[]> };
const fails = (store.__niazLoginFails ??= new Map<string, number[]>());

const fresh = (key: string, now: number) =>
  (fails.get(key) ?? []).filter((t) => now - t < LOGIN_LIMIT.windowMs);

/** Исчерпан ли лимит хотя бы по одному ключу. */
export function loginBlocked(keys: string[], now = Date.now()): boolean {
  return keys.some((key) => fresh(key, now).length >= LOGIN_LIMIT.max);
}

/** Отметить неудачную попытку по всем ключам. */
export function loginFailed(keys: string[], now = Date.now()) {
  for (const key of keys) fails.set(key, [...fresh(key, now), now]);
}

/** Удачный вход обнуляет счёт: человек вспомнил пароль, а не подбирал. */
export function loginSucceeded(keys: string[]) {
  for (const key of keys) fails.delete(key);
}

/** Только для тестов: забыть накопленное. */
export const resetLoginLimit = () => fails.clear();
