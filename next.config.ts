import type { NextConfig } from 'next';
import { CATEGORIES } from './lib/catalog';
import busRedirects from './data/content/redirects.json';

/**
 * Редиректы — несущее требование §6.1 ТЗ, а не удобство:
 *   1) снятый раздел «Автобусы» уводится 301 на ближайшую живую линейку;
 *   2) короткие алиасы разделов ведут на канонические URL донора.
 * Цепочек A→B→C быть не должно: алиасы указывают сразу на конечный адрес.
 */
const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: на VPS едет только .next/standalone,
  // без node_modules целиком.
  output: 'standalone',

  // Действующие URL донора оканчиваются слэшем — §6.1 требует сохранить и его,
  // иначе каждая живая страница получает лишний 301.
  trailingSlash: true,

  experimental: {
    // С proxy.ts Next копирует тело запроса в память для прокси и по умолчанию
    // обрезает его на 10 МБ: фото до 15 МБ приходили в маршрут загрузки
    // неполными, и форма не разбиралась. 16 МБ — лимит файла плюс обвязка формы.
    proxyClientMaxBodySize: '16mb',
  },

  // Внешних картинок нет: фото донора перенесены в public/ (scripts/localize-media.ts).
  // remotePatterns намеренно пуст — забытый адрес донора уронит сборку, а не
  // всплывёт битой картинкой после деплоя.

  async redirects() {
    const aliases = CATEGORIES.map((c) => ({
      source: `/${c.alias}`,
      destination: `/${c.slug}/`,
      permanent: true,
    }));

    return [...busRedirects, ...aliases];
  },
};

export default nextConfig;
