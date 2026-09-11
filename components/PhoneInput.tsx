'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Поле телефона с маской +7 (900) 123-45-67.
 *
 * Своя маска, без библиотеки: правила простые, а готовые маски тянут
 * десятки килобайт в каждую страницу с формой. Что учтено:
 *   — первая 7 или 8 — код страны, номер можно набирать как привык;
 *   — вставка и автозаполнение браузера («89001234567», «+7 900 …») форматируются;
 *   — Backspace стирает цифру, а не скобку или дефис — иначе курсор
 *     застревает на разделителе;
 *   — курсор остаётся на месте при правке в середине номера.
 * Проверку «номер полный» делает общая схема заявки (lib/lead-schema.ts).
 */

const PREFIX = '+7 (';

/** Цифры после «+7» — самой маски или вставленного номера. */
function digitsAfterCode(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return raw.trimStart().startsWith('+7') ? digits.slice(1) : digits;
}

/**
 * Сколько первых цифр — лишний код страны. Первая 8 или 7 бывает и частью
 * номера (831 — Нижний Новгород, 800 — бесплатные), поэтому кодом страны она
 * считается, только когда цифр больше десяти: «8 900 …» набрали по привычке.
 */
const codeShift = (digits: string) => (digits.length > 10 && /^[78]/.test(digits) ? 1 : 0);

/** Номер без кода страны — не больше 10 цифр. */
function national(raw: string): string {
  const digits = digitsAfterCode(raw);
  return digits.slice(codeShift(digits)).slice(0, 10);
}

function format(n: string): string {
  if (!n) return PREFIX;
  let out = PREFIX + n.slice(0, 3);
  if (n.length > 3) out += `) ${n.slice(3, 6)}`;
  if (n.length > 6) out += `-${n.slice(6, 8)}`;
  if (n.length > 8) out += `-${n.slice(8, 10)}`;
  return out;
}

/** Позиция курсора сразу после count-й цифры номера (код страны не считается). */
function caretAfter(formatted: string, count: number): number {
  if (count === 0) return Math.min(PREFIX.length, formatted.length);
  let seen = 0;
  for (let i = PREFIX.length; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === count) return i + 1;
  }
  return formatted.length;
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export function PhoneInput({ onFocus, onBlur, ...props }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Курсор ставится после того, как React записал новое значение в поле.
  useLayoutEffect(() => {
    if (caret.current !== null && ref.current === document.activeElement) {
      ref.current?.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  });

  /** Записать номер и поставить курсор после digitsBefore-й цифры. */
  function apply(n: string, digitsBefore: number) {
    const next = format(n);
    caret.current = caretAfter(next, Math.min(digitsBefore, n.length));
    setValue(next);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const pos = e.target.selectionStart ?? raw.length;
    const digits = digitsAfterCode(raw);
    // «8 900 123 45 67» набирают по цифре: после десятой номер выглядит как
    // «+7 (890) 012-34-56», одиннадцатая превращает 8 в код страны. Поэтому
    // одиннадцатую цифру не отбрасываем, даже когда номер уже «полный». Цена
    // — лишняя цифра к полному номеру на 7/8 его сдвинет; это видно сразу.
    const shift = codeShift(digits);
    apply(digits.slice(shift).slice(0, 10), Math.max(0, digitsAfterCode(raw.slice(0, pos)).length - shift));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Backspace') return;
    const input = e.currentTarget;
    const pos = input.selectionStart ?? 0;
    if (pos !== input.selectionEnd || pos <= PREFIX.length) return;
    // Перед курсором разделитель — стираем ближайшую цифру слева от него.
    if (/\d/.test(value[pos - 1])) return;
    e.preventDefault();
    const n = national(value);
    const before = national(value.slice(0, pos)).length;
    if (before === 0) return;
    apply(n.slice(0, before - 1) + n.slice(before), before - 1);
  }

  return (
    <input
      {...props}
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        if (!value) {
          caret.current = PREFIX.length;
          setValue(PREFIX);
        }
        onFocus?.(e);
      }}
      onBlur={(e) => {
        // Пустая маска не должна уйти в заявку как «+7 (».
        if (!national(value)) setValue('');
        onBlur?.(e);
      }}
    />
  );
}
