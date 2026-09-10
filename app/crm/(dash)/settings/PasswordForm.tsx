'use client';

import { useActionState, useEffect, useRef } from 'react';
import { changePassword, type ActionState } from '../../actions';
import styles from '../ui.module.css';

const initial: ActionState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Смена пароля</h2>

      <form ref={form} action={action} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Текущий пароль</span>
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Новый пароль</span>
          <input
            name="next"
            type="password"
            autoComplete="new-password"
            required
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Повторите новый</span>
          <input
            name="repeat"
            type="password"
            autoComplete="new-password"
            required
            className={styles.input}
          />
        </label>

        {state.error && <p className={styles.error}>{state.error}</p>}
        {state.ok && <p className={styles.ok}>{state.ok}</p>}

        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? 'Меняем…' : 'Изменить пароль'}
        </button>
      </form>
    </section>
  );
}
