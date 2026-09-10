import type { Metadata } from 'next';
import { Manrope, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['cyrillic', 'latin'], variable: '--font-display-loaded' });
const inter = Inter({ subsets: ['cyrillic', 'latin'], variable: '--font-body-loaded' });
const mono = JetBrains_Mono({ subsets: ['cyrillic', 'latin'], variable: '--font-mono-loaded' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://com-transport.ru'),
  title: {
    default: 'Нижегородский автомобильный завод — производство спецтранспорта',
    template: '%s — Нижегородский автомобильный завод',
  },
  description:
    'Завод-изготовитель специализированного транспорта: автомобили скорой медицинской помощи, транспорт для маломобильных граждан, грузопассажирские автомобили, фургоны, спецавтомобили и лаборатории.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
