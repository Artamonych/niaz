'use client';

import { useActionState } from 'react';
import { logout, setInitialPassword, type ActionState } from '../actions';
import styles from '../login/login.module.css';

const initial: ActionState = {};

export function FirstPasswordForm() {
  const [state, action, pending] = useActionState(setInitialPassword, initial);

  return (
    <>
      <form action={action} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Новый пароль</span>
          <input
            name="next"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
            minLength={8}
            className={styles.input}
          />
        </label>

        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить и войти'}
        </button>
      </form>

      {/* Выход на случай чужого компьютера: сменить пароль можно и позже. */}
      <form action={logout}>
        <button
          type="submit"
          className={styles.submit}
          style={{ background: 'none', color: 'var(--text-on-dark-dim)', marginTop: 10 }}
        >
          Выйти
        </button>
      </form>
    </>
  );
}
