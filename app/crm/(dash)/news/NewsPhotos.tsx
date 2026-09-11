'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteNewsPhoto, moveNewsPhoto, setNewsCover } from '../../actions';
import { NEWS_MAX_PHOTOS, NEWS_MAX_PHOTO_BYTES, NEWS_MAX_PHOTO_MB } from '@/lib/news-shared';
import ui from '../ui.module.css';
import styles from './news.module.css';

export type NewsPhotoView = { id: string; url: string; isCover: boolean };

export function NewsPhotos({
  postId,
  photos,
  editable,
}: {
  postId: string;
  photos: NewsPhotoView[];
  editable: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const free = NEWS_MAX_PHOTOS - photos.length;
  const busy = pending || progress !== null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;

    const found: string[] = [];
    const queue = Array.from(files).filter((file) => {
      if (file.size <= NEWS_MAX_PHOTO_BYTES) return true;
      found.push(`${file.name}: больше ${NEWS_MAX_PHOTO_MB} МБ`);
      return false;
    });
    if (queue.length > free) {
      found.push(`Лимит — ${NEWS_MAX_PHOTOS} фото на новость, загружены первые ${free}`);
      queue.length = Math.max(free, 0);
    }

    // Строго по одному: сервер держит в памяти один снимок, а не все сразу.
    for (const [i, file] of queue.entries()) {
      setProgress(`Загружается ${i + 1} из ${queue.length}…`);
      const body = new FormData();
      body.append('file', file);
      try {
        const res = await fetch(`/api/crm/news/${postId}/photos/`, { method: 'POST', body });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          found.push(`${file.name}: ${data.error ?? 'не загрузился'}`);
        }
      } catch {
        found.push(`${file.name}: нет связи с сервером`);
      }
    }

    setProgress(null);
    setProblems(found);
    if (input.current) input.current.value = '';
    router.refresh();
  }

  return (
    <section className={ui.panel}>
      <h2 className={ui.panelTitle}>
        Фото — {photos.length} из {NEWS_MAX_PHOTOS}
      </h2>

      {editable && (
        <div className={styles.upload}>
          <input
            ref={input}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || free <= 0}
            onChange={(e) => upload(e.target.files)}
            className={ui.input}
          />
          <span className={ui.dim} style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            JPEG, PNG или WebP до {NEWS_MAX_PHOTO_MB} МБ, можно несколько сразу. Снимки
            ужимаются до 1600 px — исходники с камеры подойдут. Первое фото становится превью.
          </span>
          {progress && <p className={`mono ${styles.progress}`}>{progress}</p>}
          {problems.map((p) => (
            <p key={p} className={ui.error}>
              {p}
            </p>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <p className={ui.dim} style={{ fontSize: 13 }}>
          Фото пока нет. Новость можно опубликовать и без них.
        </p>
      ) : (
        <ul className={styles.photos}>
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              className={`${styles.photo} ${photo.isCover ? styles.photoCover : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className={styles.thumb} />
              {photo.isCover && <span className={`mono ${styles.coverBadge}`}>Превью</span>}

              {editable && (
                <div className={styles.tools}>
                  <button
                    type="button"
                    className={styles.tool}
                    disabled={busy || i === 0}
                    aria-label="Сдвинуть левее"
                    onClick={() => startTransition(() => moveNewsPhoto(photo.id, -1))}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.tool}
                    disabled={busy || i === photos.length - 1}
                    aria-label="Сдвинуть правее"
                    onClick={() => startTransition(() => moveNewsPhoto(photo.id, 1))}
                  >
                    →
                  </button>
                  {!photo.isCover && (
                    <button
                      type="button"
                      className={styles.tool}
                      disabled={busy}
                      onClick={() => startTransition(() => setNewsCover(photo.id))}
                    >
                      В превью
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${styles.tool} ${styles.danger}`}
                    disabled={busy}
                    onClick={() => startTransition(() => deleteNewsPhoto(photo.id))}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
