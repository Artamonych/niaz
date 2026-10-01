/**
 * «Галерея» — съёмка завода, сгруппированная по разделам сайта.
 *
 * До 01.10.2026 витрина собиралась из 36 страниц старого сайта по маркам
 * шасси; фото старого сайта сняты, и страницы опустели (текста на них не
 * было). Теперь галерея — из своей съёмки: фото разделов каталога, интерьеры
 * АСМП, мобильные офисы и уникальные проекты. Пустые страницы донора ведут
 * сюда 301 (next.config.ts).
 */
import { CATEGORIES } from './catalog';
import { interiorPhotos, photosOf, type CategoryPhoto } from './content';
import { MOBILE_OFFICES, UNIQUE_PROJECTS, type Project } from './projects';

export type GalleryGroup = { title: string; href: string; photos: CategoryPhoto[] };

const shotsOf = (projects: Project[]): CategoryPhoto[] =>
  projects.flatMap((p) =>
    p.shots.map(({ src, w, h, caption }) => ({ src, w, h, caption: `${p.title}: ${caption[0].toLowerCase()}${caption.slice(1)}` })),
  );

export function factoryGallery(): GalleryGroup[] {
  const groups: GalleryGroup[] = [
    ...CATEGORIES.map((c) => ({ title: c.short, href: `/${c.slug}/`, photos: photosOf(c.key) })),
    { title: 'Интерьеры АСМП', href: '/interery-asmp/', photos: interiorPhotos() },
    { title: 'Мобильные офисы', href: '/mobilnye-ofisy/', photos: shotsOf(MOBILE_OFFICES) },
    { title: 'Уникальные проекты', href: '/unikalnye-proekty/', photos: shotsOf(UNIQUE_PROJECTS) },
  ];
  return groups.filter((g) => g.photos.length > 0);
}
