import { z } from 'zod';

/** Одна схема на клиент и сервер: правила валидации не должны разъезжаться. */
export const leadSchema = z.object({
  fio: z.string().trim().min(2, 'Укажите имя').max(120),
  phone: z
    .string()
    .trim()
    .min(6, 'Укажите телефон')
    .max(32)
    .regex(/^[\d\s()+-]+$/, 'Телефон только из цифр и знаков + ( ) -'),
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
