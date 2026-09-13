'use client';

import { useActionState, useState, useTransition } from 'react';
import { saveNews, deleteNews, type ActionState } from '../../actions';
import { newsToday } from '@/lib/news-shared';
import styles from '../ui.module.css';

export type NewsDraft = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  videoUrl: string | null;
  status: string;
  /** YYYY-MM-DD */
  publishedAt: string;
};

const initial: ActionState = {};

export function NewsForm({ post, editable }: { post: NewsDraft | null; editable: boolean }) {
  const [state, action, pending] = useActionState(saveNews.bind(null, post?.id ?? null), initial);
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();

  const savedStatus = post?.status ?? 'DRAFT';
  const savedDate = post?.publishedAt ?? newsToday();

  /*
   * После отправки формы серверным действием React сбрасывает поля к
   * исходным значениям. Пока форма не пересоздавалась, в сброшенных полях
   * оставалось прежнее значение: опубликовал новость — в статусе всё ещё
   * «Черновик». Поэтому пересоздаём форму, когда сервер вернул другие
   * статус или дату: поля получают свежие значения. Ошибка сохранения их
   * не меняет, и набранный текст не теряется.
   */
  const formKey = `${savedStatus}|${savedDate}`;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Текст новости</h2>

      <form key={formKey} action={action} className={styles.form}>
        <fieldset
          disabled={!editable}
          style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}
        >
          <Field label="Заголовок">
            <input name="title" required defaultValue={post?.title} className={styles.input} />
          </Field>

          <Field
            label="Анонс"
            hint="Одно-два предложения. Показывается в карточке ленты на главной и в разделе новостей."
          >
            <textarea
              name="excerpt"
              rows={3}
              required
              maxLength={400}
              defaultValue={post?.excerpt}
              className={styles.textarea}
            />
          </Field>

          <Field
            label="Текст"
            hint="Пустая строка — новый абзац. Оформлять ничего не нужно: вёрстку сайт сделает сам."
          >
            <textarea
              name="body"
              rows={12}
              required
              defaultValue={post?.body}
              className={styles.textarea}
            />
          </Field>

          <Field
            label="Ссылка на видео"
            hint="YouTube, RuTube и VK Видео покажутся плеером, другие площадки — ссылкой."
          >
            <input
              name="videoUrl"
              type="url"
              defaultValue={post?.videoUrl ?? ''}
              placeholder="https://rutube.ru/video/…"
              className={styles.input}
            />
          </Field>

          <div className={styles.row}>
            <Field label="Дата публикации">
              <input
                name="publishedAt"
                type="date"
                required
                defaultValue={savedDate}
                className={styles.input}
              />
            </Field>
            <Field label="Статус">
              <select name="status" defaultValue={savedStatus} className={styles.select}>
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликована</option>
              </select>
            </Field>
          </div>

          <Field
            label="Адрес на сайте"
            hint="Пусто — соберётся из заголовка. Опубликованную новость лучше не переименовывать: старая ссылка перестанет открываться."
          >
            <input
              name="slug"
              defaultValue={post?.slug ?? ''}
              // Дефис экранирован: браузеры разбирают pattern с флагом v, где
              // голый «-» в классе символов — синтаксическая ошибка.
              pattern="[a-z0-9\-]*"
              placeholder="soberetsya-iz-zagolovka"
              className={styles.input}
            />
          </Field>

          {editable && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button type="submit" className={styles.submit} disabled={pending}>
                {pending ? 'Сохраняем…' : 'Сохранить'}
              </button>

              {post &&
                (confirming ? (
                  <>
                    <span className={styles.dim} style={{ fontSize: 12.5 }}>
                      Удалить новость вместе с фото?
                    </span>
                    <button
                      type="button"
                      className={styles.ghost}
                      disabled={removing}
                      onClick={() => startRemove(() => deleteNews(post.id))}
                    >
                      Да, удалить
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => setConfirming(false)}
                    >
                      Нет
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.ghost} onClick={() => setConfirming(true)}>
                    Удалить новость
                  </button>
                ))}
            </div>
          )}
        </fieldset>
      </form>

      {/* Сообщения — вне формы: её пересоздание их не стирает. */}
      {state.error && <p className={styles.error}>{state.error}</p>}
      {state.ok && <p className={styles.ok}>{state.ok}</p>}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && (
        <span className={styles.dim} style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          {hint}
        </span>
      )}
    </label>
  );
}
