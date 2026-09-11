'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { moveLead, assignLead } from '../actions';
import styles from './board.module.css';

type Stage = { id: string; key: string; title: string; accent: string };
type Owner = { id: string; fio: string };

type Lead = {
  id: number;
  num: string;
  fio: string;
  phone: string;
  org: string | null;
  subject: string | null;
  comment: string | null;
  stageId: string;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
};

const REFRESH_MS = 30_000;

/**
 * Новые заявки появляются на доске сами: раз в 30 секунд и сразу при
 * возвращении на вкладку. router.refresh() перечитывает данные с сервера,
 * не трогая состояние на экране — поиск и открытые списки остаются.
 * Пока менеджер тащит карточку или идёт сохранение, обновление ждёт.
 */
function useAutoRefresh(busy: boolean) {
  const router = useRouter();
  const busyRef = useRef(busy);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && !busyRef.current) router.refresh();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router]);
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Board({
  stages,
  leads,
  owners,
  editable,
}: {
  stages: Stage[];
  leads: Lead[];
  owners: Owner[];
  editable: boolean;
}) {
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const [dragged, setDragged] = useState<number | null>(null);
  useAutoRefresh(pending || dragged !== null);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? leads.filter((l) =>
        [l.num, l.fio, l.org, l.phone, l.subject].some((v) => v?.toLowerCase().includes(needle)),
      )
    : leads;

  const move = (leadId: number, stageId: string) => {
    startTransition(() => {
      moveLead(leadId, stageId);
    });
  };

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: номер, имя, организация, телефон"
          className={styles.search}
          aria-label="Поиск по заявкам"
        />
        {pending && <span className={`mono ${styles.saving}`}>Сохраняем…</span>}
      </div>

      <div className={styles.board}>
        {stages.map((stage) => {
          const items = visible.filter((l) => l.stageId === stage.id);

          return (
            <section
              key={stage.id}
              className={styles.column}
              onDragOver={(e) => {
                if (editable && dragged !== null) e.preventDefault();
              }}
              onDrop={() => {
                if (editable && dragged !== null) {
                  move(dragged, stage.id);
                  setDragged(null);
                }
              }}
            >
              <header className={styles.colHead} style={{ borderTopColor: stage.accent }}>
                <h2 className={styles.colTitle}>{stage.title}</h2>
                <span className={`mono ${styles.colCount}`}>{items.length}</span>
              </header>

              <div className={styles.cards}>
                {items.map((lead) => (
                  <article
                    key={lead.id}
                    className={styles.card}
                    draggable={editable}
                    onDragStart={() => setDragged(lead.id)}
                    onDragEnd={() => setDragged(null)}
                  >
                    <div className={styles.cardTop}>
                      <Link href={`/crm/leads/${lead.id}`} className={`mono ${styles.num}`}>
                        {lead.num}
                      </Link>
                      <span className={`mono ${styles.date}`}>{fmtDate(lead.createdAt)}</span>
                    </div>

                    <Link href={`/crm/leads/${lead.id}`} className={styles.name}>
                      {lead.fio}
                    </Link>
                    {lead.org && <p className={styles.org}>{lead.org}</p>}
                    {lead.subject && <p className={`mono ${styles.subject}`}>{lead.subject}</p>}
                    <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className={`mono ${styles.phone}`}>
                      {lead.phone}
                    </a>

                    {editable ? (
                      <div className={styles.controls}>
                        <label className={styles.control}>
                          <span className="sr-only">Ответственный</span>
                          <select
                            value={lead.ownerId ?? ''}
                            className={styles.select}
                            onChange={(e) =>
                              startTransition(() => {
                                assignLead(lead.id, e.target.value || null);
                              })
                            }
                          >
                            <option value="">Без ответственного</option>
                            {owners.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.fio}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.control}>
                          <span className="sr-only">Стадия</span>
                          <select
                            value={lead.stageId}
                            className={styles.select}
                            onChange={(e) => move(lead.id, e.target.value)}
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : (
                      lead.ownerName && <p className={`mono ${styles.owner}`}>{lead.ownerName}</p>
                    )}
                  </article>
                ))}

                {items.length === 0 && <p className={styles.empty}>Пусто</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
