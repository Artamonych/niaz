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

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'com-transport.ru',
        pathname: '/wp-content/**',
      },
    ],
  },

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
