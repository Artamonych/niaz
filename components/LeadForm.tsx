'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './LeadForm.module.css';

type Props = {
  /** Что запрашивают: категория или конкретное исполнение. */
  subject?: string;
};

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; num?: string }
  | { kind: 'error'; message: string; issues?: Record<string, string[] | undefined> };

export function LeadForm({ subject }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: 'sending' });

    const form = new FormData(event.currentTarget);
    const payload = {
      fio: String(form.get('fio') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? ''),
      org: String(form.get('org') ?? ''),
      inn: String(form.get('inn') ?? ''),
      comment: String(form.get('comment') ?? ''),
      website: String(form.get('website') ?? ''),
      consent: form.get('consent') === 'on',
      subject,
      sourceUrl: typeof window === 'undefined' ? undefined : window.location.pathname,
    };

    try {
      // Слэш на конце обязателен: при trailingSlash адрес без него
      // отвечает редиректом 308, а не обработчиком.
      const res = await fetch('/api/lead/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setState({ kind: 'error', message: body.error ?? 'Не удалось отправить', issues: body.issues });
        return;
      }
      setState({ kind: 'sent', num: body.num });
    } catch {
      setState({ kind: 'error', message: 'Сеть недоступна. Попробуйте ещё раз или позвоните нам.' });
    }
  }

  if (state.kind === 'sent') {
    return (
      <div className={styles.done} role="status">
        <p className="label">Заявка принята</p>
        <p className={styles.doneTitle}>
          {state.num ? `Номер заявки ${state.num}` : 'Заявка отправлена'}
        </p>
        <p className={styles.doneText}>
          Менеджер отдела продаж свяжется с вами в рабочее время. Если вопрос срочный —
          звоните <a href="tel:88005504455" className="mono">8 800 550-44-55</a>.
        </p>
      </div>
    );
  }

  const issues = state.kind === 'error' ? state.issues : undefined;
  const err = (field: string) => issues?.[field]?.[0];

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.row}>
        <Field name="fio" label="Как к вам обращаться" required error={err('fio')} />
        <Field name="phone" label="Телефон" type="tel" required error={err('phone')} placeholder="+7 ___ ___-__-__" />
      </div>
      <div className={styles.row}>
        <Field name="email" label="Электронная почта" type="email" error={err('email')} />
        <Field name="org" label="Организация" error={err('org')} />
      </div>
      <Field name="inn" label="ИНН" error={err('inn')} hint="10 или 12 цифр — ускорит подготовку КП" />

      <label className={styles.field}>
        <span className={styles.labelText}>Задача</span>
        <textarea
          name="comment"
          rows={4}
          className={styles.textarea}
          placeholder="Что нужно: тип техники, количество, сроки, особые требования"
        />
      </label>

      {/* Honeypot: скрыт от людей, заполняется только ботами. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Не заполняйте это поле
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className={styles.consent}>
        <input type="checkbox" name="consent" required />
        <span>
          Согласен на обработку персональных данных в соответствии с{' '}
          <Link href="/politika-konfidentsialnosti" className={styles.consentLink}>
            политикой конфиденциальности
          </Link>
        </span>
      </label>
      {err('consent') && <p className={styles.error}>{err('consent')}</p>}

      {state.kind === 'error' && <p className={styles.error}>{state.message}</p>}

      <button type="submit" className={styles.submit} disabled={state.kind === 'sending'}>
        {state.kind === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  error,
  hint,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.labelText}>
        {label}
        {required && <span className={styles.req}>*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={styles.input}
      />
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
}
