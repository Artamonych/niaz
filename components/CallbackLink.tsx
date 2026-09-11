'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Якорь блока с формой заявки — он есть почти на всех страницах сайта. */
const FORM_ID = 'zapros';

/**
 * Ссылка «Заказать звонок» к форме заявки.
 *
 * Есть форма на странице — плавно прокручиваем к ней и ставим курсор в первое
 * поле. Нет (новости, оглавления разделов) — ссылка ведёт на форму главной.
 * Адрес /#zapros в href работает и без скриптов.
 *
 * Пока форма на экране, кнопка прячется: вести уже некуда, а в углу она
 * перекрывала бы поля той самой формы.
 */
export function CallbackLink({
  className,
  hiddenClass,
  children,
}: {
  className: string;
  hiddenClass: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById(FORM_ID);
    if (!form) return;
    const io = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(form);
    return () => {
      io.disconnect();
      setFormVisible(false);
    };
  }, [pathname]);

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const form = document.getElementById(FORM_ID);
    if (!form) return; // уходим по href на главную
    event.preventDefault();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    form.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    form.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
  }

  return (
    <a
      href={`/#${FORM_ID}`}
      onClick={onClick}
      className={`${className} ${formVisible ? hiddenClass : ''}`}
      aria-hidden={formVisible || undefined}
      tabIndex={formVisible ? -1 : undefined}
    >
      {children}
    </a>
  );
}
