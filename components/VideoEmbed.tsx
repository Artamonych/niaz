import { parseVideo } from '@/lib/video';
import styles from './VideoEmbed.module.css';

/** Видео новости: плеер для YouTube, RuTube и VK Видео, ссылка — для остальных площадок. */
export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  const video = parseVideo(url);
  if (!video) return null;

  if (video.kind === 'link') {
    return (
      <p className={styles.link}>
        <a href={video.href} target="_blank" rel="noopener">
          Смотреть видео →
        </a>
      </p>
    );
  }

  return (
    <div className={styles.frame}>
      <iframe
        src={video.src}
        title={`Видео: ${title}`}
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
