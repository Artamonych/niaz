'use client';

import { useActionState } from 'react';
import { saveClient, type ActionState } from '../../../actions';
import styles from '../../ui.module.css';

type Client = {
  id: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  city: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  comment: string | null;
  bankAccount: string | null;
  bankBik: string | null;
  bankName: string | null;
  bankCorr: string | null;
  address: string | null;
};

const initial: ActionState = {};

const STATUSES = ['В работе', 'Активный', 'Приостановлен', 'Архив'];

export function ClientForm({ client, editable }: { client: Client; editable: boolean }) {
  const [state, action, pending] = useActionState(saveClient.bind(null, client.id), initial);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Карточка контрагента</h2>

      <form action={action} className={styles.form}>
        <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
          <Field name="name" label="Организация" defaultValue={client.name} required />

          <div className={styles.row}>
            <Field name="inn" label="ИНН" defaultValue={client.inn} />
            <Field name="kpp" label="КПП" defaultValue={client.kpp} />
          </div>

          <div className={styles.row}>
            <Field name="city" label="Город" defaultValue={client.city} />
            <label className={styles.field}>
              <span className={styles.label}>Статус</span>
              <select name="status" defaultValue={client.status} className={styles.select}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.row}>
            <Field name="contact" label="Контактное лицо" defaultValue={client.contact} />
            <Field name="phone" label="Телефон" defaultValue={client.phone} />
          </div>

          <Field name="email" label="Почта" defaultValue={client.email} type="email" />
          <Field name="address" label="Юридический адрес" defaultValue={client.address} />

          <p className={`label`} style={{ marginTop: 6 }}>
            Банковские реквизиты
          </p>
          <div className={styles.row}>
            <Field name="bankAccount" label="Расчётный счёт" defaultValue={client.bankAccount} />
            <Field name="bankBik" label="БИК" defaultValue={client.bankBik} />
          </div>
          <div className={styles.row}>
            <Field name="bankName" label="Банк" defaultValue={client.bankName} />
            <Field name="bankCorr" label="Корр. счёт" defaultValue={client.bankCorr} />
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Комментарий</span>
            <textarea
              name="comment"
              rows={3}
              defaultValue={client.comment ?? ''}
              className={styles.textarea}
            />
          </label>

          {state.error && <p className={styles.error}>{state.error}</p>}
          {state.ok && <p className={styles.ok}>{state.ok}</p>}

          {editable && (
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? 'Сохраняем…' : 'Сохранить'}
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        className={styles.input}
      />
    </label>
  );
}
