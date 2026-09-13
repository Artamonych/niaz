'use client';

import { useState, useTransition } from 'react';
import { purgeLead, restoreLead, trashLead } from '../../actions';
import styles from '../ui.module.css';

const row: React.CSSProperties = {
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
};

/**
 * Кнопки корзины: в карточке заявки и в списке самой корзины (п. 30 бэклога).
 *
 * Удаление обратимо, поэтому подтверждение простое — как у новостей. А вот
 * «стереть насовсем» спрашивает отдельно и доступно только администратору:
 * после него заявку не вернуть.
 */
export function TrashActions({
  leadId,
  deleted,
  canPurge,
}: {
  leadId: number;
  deleted: boolean;
  canPurge: boolean;
}) {
  const [asking, setAsking] = useState<'trash' | 'purge' | null>(null);
  const [pending, start] = useTransition();

  if (!deleted) {
    return asking === 'trash' ? (
      <span style={row}>
        <span className={styles.dim} style={{ fontSize: 12.5 }}>
          Убрать заявку в корзину?
        </span>
        <button
          type="button"
          className={styles.ghost}
          disabled={pending}
          onClick={() => start(() => void trashLead(leadId))}
        >
          Да, убрать
        </button>
        <button type="button" className={styles.ghost} onClick={() => setAsking(null)}>
          Нет
        </button>
      </span>
    ) : (
      <button type="button" className={styles.ghost} onClick={() => setAsking('trash')}>
        Убрать в корзину
      </button>
    );
  }

  return (
    <span style={row}>
      <button
        type="button"
        className={styles.ghost}
        disabled={pending}
        onClick={() => start(() => void restoreLead(leadId))}
      >
        Вернуть
      </button>

      {canPurge &&
        (asking === 'purge' ? (
          <>
            <span className={styles.dim} style={{ fontSize: 12.5 }}>
              Стереть без возврата?
            </span>
            <button
              type="button"
              className={styles.ghost}
              disabled={pending}
              onClick={() => start(() => void purgeLead(leadId))}
            >
              Да, стереть
            </button>
            <button type="button" className={styles.ghost} onClick={() => setAsking(null)}>
              Нет
            </button>
          </>
        ) : (
          <button type="button" className={styles.ghost} onClick={() => setAsking('purge')}>
            Стереть насовсем
          </button>
        ))}
    </span>
  );
}
