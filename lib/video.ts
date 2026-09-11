/**
 * Разбор ссылки на видео в новости: YouTube, RuTube и VK Видео встраиваются
 * плеером, остальные площадки выводятся обычной ссылкой. Один модуль на CRM
 * и сайт — чтобы проверка при сохранении и вывод на странице не разошлись.
 */
export type Video =
  | { kind: 'youtube' | 'rutube' | 'vk'; src: string; href: string }
  | { kind: 'link'; href: string };

export function parseVideo(raw: string | null | undefined): Video | null {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^(www|m)\./, '');
  const href = url.toString();

  // YouTube: youtu.be/<id>, watch?v=<id>, /shorts/<id>, /embed/<id>, /live/<id>
  let youtube: string | null = null;
  if (host === 'youtu.be') {
    youtube = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    youtube =
      url.searchParams.get('v') ??
      url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ??
      null;
  }
  if (youtube && /^[\w-]{11}$/.test(youtube)) {
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${youtube}`, href };
  }

  // RuTube: rutube.ru/video/<32 hex>/ или rutube.ru/play/embed/<id>
  if (host === 'rutube.ru') {
    const id = url.pathname.match(/^\/(?:video|play\/embed)\/([0-9a-f]{32})/)?.[1];
    if (id) return { kind: 'rutube', src: `https://rutube.ru/play/embed/${id}`, href };
  }

  // VK Видео: vk.com/video-123_456, vkvideo.ru/video-123_456, vk.com/...?z=video-123_456
  if (host === 'vk.com' || host === 'vk.ru' || host === 'vkvideo.ru') {
    const found = `${url.pathname} ${url.searchParams.get('z') ?? ''}`.match(/video(-?\d+)_(\d+)/);
    if (found) {
      return {
        kind: 'vk',
        src: `https://vk.com/video_ext.php?oid=${found[1]}&id=${found[2]}`,
        href,
      };
    }
  }

  return { kind: 'link', href };
}
