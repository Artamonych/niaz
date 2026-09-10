'use client';

import { useActionState } from 'react';
import { login, type ActionState } from '../actions';
import styles from './login.module.css';

const initial: ActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Рабочая почта</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className={styles.input}
          placeholder="ivanov@niaz.ru"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
      </label>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
    </form>
  );
}
