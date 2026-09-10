'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addComment, type ActionState } from '../../../actions';
import styles from './lead.module.css';

const initial: ActionState = {};

export function CommentForm({ leadId }: { leadId: number }) {
  const [state, action, pending] = useActionState(addComment.bind(null, leadId), initial);
  const form = useRef<HTMLFormElement>(null);

  // После успешной отправки поле очищается — иначе комментарий уходит дважды.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className={styles.commentForm}>
      <label>
        <span className="sr-only">Комментарий</span>
        <textarea
          name="text"
          rows={3}
          className={styles.textarea}
          placeholder="Что обсудили, о чём договорились, когда следующий контакт"
        />
      </label>

      {state.error && <p className={styles.formError}>{state.error}</p>}

      <button type="submit" className={styles.commentSubmit} disabled={pending}>
        {pending ? 'Добавляем…' : 'Добавить в ленту'}
      </button>
    </form>
  );
}
