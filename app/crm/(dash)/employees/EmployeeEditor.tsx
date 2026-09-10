'use client';

import { useActionState, useState, useTransition } from 'react';
import { saveEmployee, toggleEmployee, type ActionState } from '../../actions';
import { ROLES, ROLE_KEYS, roleTitle } from '@/lib/roles';
import styles from '../ui.module.css';

type Employee = {
  id: string;
  fio: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
};

const initial: ActionState = {};

export function EmployeeEditor({
  employees,
  currentUserId,
}: {
  employees: Employee[];
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState(saveEmployee, initial);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [toggling, startToggle] = useTransition();

  return (
    <div className={styles.grid}>
      <div className={styles.tableWrap}>
        <table className={styles.table} style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Роль</th>
              <th>Доступ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <span className={styles.rowLink}>{employee.fio}</span>
                  <div className={`mono ${styles.dim}`} style={{ fontSize: 11.5 }}>
                    {employee.email}
                  </div>
                  {employee.phone && (
                    <div className={`mono ${styles.dim}`} style={{ fontSize: 11.5 }}>
                      {employee.phone}
                    </div>
                  )}
                </td>
                <td className={styles.dim}>{roleTitle(employee.role)}</td>
                <td>
                  <span className={`mono ${styles.badge}`}>
                    {employee.active ? 'активен' : 'отключён'}
                  </span>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() => setEditing(employee)}
                    style={{ marginInlineEnd: 8 }}
                  >
                    Изменить
                  </button>
                  {/* Себя отключить нельзя — иначе можно потерять доступ к CRM. */}
                  {employee.id !== currentUserId && (
                    <button
                      type="button"
                      className={styles.ghost}
                      disabled={toggling}
                      onClick={() =>
                        startToggle(() => toggleEmployee(employee.id, !employee.active))
                      }
                    >
                      {employee.active ? 'Отключить' : 'Включить'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {editing ? `Изменить: ${editing.fio}` : 'Добавить сотрудника'}
        </h2>

        <form action={action} className={styles.form} key={editing?.id ?? 'new'}>
          <input type="hidden" name="id" value={editing?.id ?? ''} />

          <label className={styles.field}>
            <span className={styles.label}>ФИО</span>
            <input name="fio" required defaultValue={editing?.fio ?? ''} className={styles.input} />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Рабочая почта</span>
              <input
                name="email"
                type="email"
                required
                defaultValue={editing?.email ?? ''}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Телефон</span>
              <input name="phone" defaultValue={editing?.phone ?? ''} className={styles.input} />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Роль</span>
            <select name="role" defaultValue={editing?.role ?? 'MANAGER'} className={styles.select}>
              {ROLE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ROLES[key]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {editing ? 'Новый пароль (можно не менять)' : 'Пароль'}
            </span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className={styles.input}
            />
            <span className={styles.dim} style={{ fontSize: 11.5 }}>
              От 8 символов
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
    </div>
  );
}
