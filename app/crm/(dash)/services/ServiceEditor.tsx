'use client';

import { useActionState, useState, useTransition } from 'react';
import { saveService, deleteService, type ActionState } from '../../actions';
import styles from '../ui.module.css';

type Service = { id: string; name: string; price: number };

const initial: ActionState = {};

const money = (v: number) => (v > 0 ? `${v.toLocaleString('ru-RU')} ₽` : 'по запросу');

export function ServiceEditor({ services, editable }: { services: Service[]; editable: boolean }) {
  const [state, action, pending] = useActionState(saveService, initial);
  const [editing, setEditing] = useState<Service | null>(null);
  const [removing, startRemove] = useTransition();

  return (
    <div className={styles.grid}>
      <div className={styles.tableWrap}>
        <table className={styles.table} style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>Услуга</th>
              <th>Стоимость от</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td className={styles.rowLink}>{service.name}</td>
                <td className="mono">{money(service.price)}</td>
                {editable && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => setEditing(service)}
                      style={{ marginInlineEnd: 8 }}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      disabled={removing}
                      onClick={() => startRemove(() => deleteService(service.id))}
                    >
                      Удалить
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {editing ? 'Изменить услугу' : 'Добавить услугу'}
          </h2>

          <form action={action} className={styles.form} key={editing?.id ?? 'new'}>
            <input type="hidden" name="id" value={editing?.id ?? ''} />

            <label className={styles.field}>
              <span className={styles.label}>Название</span>
              <input
                name="name"
                required
                defaultValue={editing?.name ?? ''}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Стоимость от, ₽</span>
              <input
                name="price"
                type="number"
                min={0}
                step={1000}
                defaultValue={editing?.price ?? 0}
                className={styles.input}
              />
              <span className={styles.dim} style={{ fontSize: 11.5 }}>
                0 — показывать «по запросу»
              </span>
            </label>

            {state.error && <p className={styles.error}>{state.error}</p>}
            {state.ok && <p className={styles.ok}>{state.ok}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className={styles.submit} disabled={pending}>
                {pending ? 'Сохраняем…' : 'Сохранить'}
              </button>
              {editing && (
                <button type="button" className={styles.ghost} onClick={() => setEditing(null)}>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
