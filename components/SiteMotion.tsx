'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Три жеста прототипа, которые в вёрстке живут на всех страницах сразу:
 *   — полоса прогресса чтения вверху,
 *   — линии-разделители, которые дочерчиваются при появлении в кадре
 *     (элементы с data-line),
 *   — счётчики, набирающие значение (элементы с data-count).
 * Разметку они не задают: без JS всё остаётся на своих местах и видимым.
 */
export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const bar = document.getElementById('niaz-progress');

    const onScroll = () => {
      if (!bar) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.width = `${(p * 100).toFixed(2)}%`;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-line]'));
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

    if (reduced) {
      lines.forEach((el) => {
        el.style.transform = 'scaleX(1)';
      });
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    const lineIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).style.transform = 'scaleX(1)';
          lineIo.unobserve(e.target);
        });
      },
      { threshold: 0.2 },
    );
    lines.forEach((el) => {
      el.style.transform = 'scaleX(0)';
      lineIo.observe(el);
    });

    const rafs: number[] = [];
    const countIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          countIo.unobserve(el);

          const to = Number(el.dataset.count ?? '0');
          const dur = 1400;
          let start = 0;

          const tick = (now: number) => {
            if (!start) start = now;
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(to * eased));
            if (p < 1) rafs.push(requestAnimationFrame(tick));
          };
          rafs.push(requestAnimationFrame(tick));
        });
      },
      { threshold: 0.4 },
    );
    counters.forEach((el) => {
      el.textContent = '0';
      countIo.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      lineIo.disconnect();
      countIo.disconnect();
      rafs.forEach(cancelAnimationFrame);
    };
  }, [pathname]);

  return <div id="niaz-progress" className="progress" aria-hidden="true" />;
}
