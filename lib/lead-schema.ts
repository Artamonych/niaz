import { z } from 'zod';

/**
 * Российский номер: +7 / 8 и 10 цифр, либо сразу 10 цифр. Первая цифра
 * номера — 3…9 (коды городов и мобильных), так что «0000000000» и
 * обрывки вроде «123456» не проходят. Раньше хватало 6 любых цифр — и
 * тестовая заявка ушла в CRM с 25 нулями вместо телефона.
 */
function isRussianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  const national =
    digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits.length === 10 ? digits : '';
  return /^[3-9]\d{9}$/.test(national);
}

/** Одна схема на клиент и сервер: правила валидации не должны разъезжаться. */
export const leadSchema = z.object({
  fio: z.string().trim().min(2, 'Укажите имя').max(120),
  phone: z
    .string()
    .trim()
    .min(1, 'Укажите телефон')
    .max(32)
    .regex(/^[\d\s()+-]+$/, 'Телефон только из цифр и знаков + ( ) -')
    .refine(isRussianPhone, 'Укажите номер полностью: +7 и 10 цифр'),
  email: z.string().trim().email('Проверьте адрес почты').max(160).or(z.literal('')).optional(),
  org: z.string().trim().max(200).optional(),
  inn: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{12})?$/, 'ИНН — 10 или 12 цифр')
    .optional(),
  comment: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(200).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
  /**
   * Honeypot: люди это поле не видят и не заполняют. Схема его пропускает —
   * иначе бот получает 400 и понимает, что попался. Проверка в обработчике.
   */
  website: z.string().max(500).optional(),
  consent: z.literal(true, { message: 'Без согласия на обработку данных заявку принять нельзя' }),
});

export type LeadInput = z.infer<typeof leadSchema>;
