/**
 * Адрес CRM для ссылок наружу — в уведомления бота и в письма.
 * Свой домен CRM, если задан; иначе адрес сайта, где CRM живёт по /crm.
 */
export function crmBase() {
  // Читаем через переменную-ключ намеренно: прямое обращение
  // process.env.NEXT_PUBLIC_SITE_URL Next подставляет значением, известным
  // на сборке, а адрес задаётся при запуске контейнера — и в письмах
  // оказывалась пустая ссылка.
  const env = (key: string) => process.env[key]?.trim() ?? '';
  const host = env('CRM_HOST');
  return host ? `https://${host}` : env('NEXT_PUBLIC_SITE_URL');
}

/** Ссылка на заявку. Пустая строка — если адрес не настроен и ссылка бессмысленна. */
export function leadUrl(leadId: number) {
  const base = crmBase();
  return base.startsWith('https://') ? `${base}/crm/leads/${leadId}/` : '';
}
