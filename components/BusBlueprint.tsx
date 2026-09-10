'use client';

/**
 * Порт анимации `bus-blueprint.jsx` из прототипа: чертёж, который рисуется
 * по сценам — сетка листа, построение, обводка, размеры, итог.
 * Движок прототипа (animations-v2-engine) заменён минимальным таймлайном:
 * нужны только последовательность сцен, прогресс внутри сцены и один проход.
 */

import { useEffect, useRef, useState } from 'react';
import { BUS_STROKES } from '@/lib/bus-strokes';

const W = 1920;
const H = 1080;
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";
const INK = '#eef4f8';
const GRAPHITE = '#14181b';

// Геометрия листа и артворка — из прототипа без изменений.
const K = 1.04;
const AX = 300;
const AY = 60;
const sx = (v: number) => AX + (v - AX) * K;
const sy = (v: number) => AY + (v - AY) * K;
const IMG = { l: sx(278), t: sy(22), w: 1304 * K, h: 866 * K };
const BB = { x1: sx(352), y1: sy(80), x2: sx(1530), y2: sy(817) };
const FW = { cx: sx(853), cy: sy(691), rx: 77 * K, ry: 92 * K };
const RW = { cx: sx(1393), cy: sy(548), rx: 37 * K, ry: 63 * K };
const FR = { x: 44, y: 44, w: 1832, h: 992 };
const TB = { x: 1560, y: 880, w: 316, h: 156 };

const SCENES = [2.6, 2.8, 5, 3.8, 3.2];
const TOTAL = SCENES.reduce((s, x) => s + x, 0);

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;

const enter = (p: number) => easeOutCubic(clamp(p, 0, 1));
const draw = (p: number) => easeInOutCubic(clamp(p, 0, 1));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const type = (s: string, p: number) => s.slice(0, Math.round(s.length * clamp(p, 0, 1)));
const ell = (rx: number, ry: number) =>
  Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));

const SPEC: [string, string][] = [
  ['ДЛИНА', '7 340'],
  ['ШИРИНА', '1 993'],
  ['ВЫСОТА', '2 800'],
  ['БАЗА', '4 325'],
  ['МЕСТ', '19 + 1'],
  ['ШИНЫ', '235/65 R16C'],
];

type Rule = ['v' | 'h', number];
const FINE: Rule[] = [];
for (let x = FR.x; x <= FR.x + FR.w + 1; x += 48) FINE.push(['v', x]);
for (let y = FR.y; y <= FR.y + FR.h + 1; y += 48) FINE.push(['h', y]);
const BOLD: Rule[] = [];
for (let x = FR.x; x <= FR.x + FR.w + 1; x += 240) BOLD.push(['v', x]);
for (let y = FR.y; y <= FR.y + FR.h + 1; y += 240) BOLD.push(['h', y]);

/** Отрезок, который «дорисовывается» от начала к концу. */
function G(
  p: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  extra: React.SVGProps<SVGLineElement>,
) {
  return <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} {...extra} />;
}

type SheetProps = {
  accent: string;
  sheetTitle: string;
  grid?: number;
  frame?: number;
  plan?: number;
  wheels?: number;
  lines?: number;
  boxDim?: number;
  dims?: number;
  spec?: number;
  callout?: number;
  title?: number;
  glow?: number;
  ext?: number;
  vec?: number;
  raster?: number;
  sheen?: number;
  cam?: number;
};

function Sheet(props: SheetProps) {
  const {
    accent: acc,
    sheetTitle,
    grid = 0,
    frame = 0,
    plan = 0,
    wheels = 0,
    lines = 0,
    boxDim = 0,
    dims = 0,
    spec = 0,
    callout = 0,
    title = 0,
    glow = 0,
    ext = 0,
    vec = 0,
    raster = 0,
    sheen = 0,
    cam = 1,
  } = props;

  // Штамп узкий: длинная подпись вылезает за край листа и обрезается
  // границей SVG. Кегль подбираем под доступную ширину.
  const titleFs = Math.min(20, Math.floor(298 / (0.75 * Math.max(sheetTitle.length, 1))));

  const ST = BUS_STROKES;
  const strokeP = (i: number, n: number) => {
    const win = 0.17;
    const st = (i / n) * (1 - win);
    return easeOutCubic(clamp((lines - st) / win, 0, 1));
  };

  const planOp = 1 - 0.6 * boxDim;
  const dimLen = draw(seg(dims, 0, 0.34));
  const dimBase = draw(seg(dims, 0.3, 0.62));
  const dimHt = draw(seg(dims, 0.55, 0.88));

  const thin = {
    stroke: 'rgba(238,244,248,0.55)',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
  };
  const dash = { stroke: 'rgba(238,244,248,0.4)', strokeWidth: 1.2, strokeDasharray: '7 7' };

  return (
    <div style={{ position: 'absolute', inset: 0, background: GRAPHITE, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 42%, rgba(120,150,170,0.10), rgba(0,0,0,0) 62%), radial-gradient(90% 70% at 50% 100%, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
        }}
      />

      {/* миллиметровка листа */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: grid,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, #000 ${(grid * 78).toFixed(1)}%, rgba(0,0,0,0) ${(grid * 108).toFixed(1)}%)`,
          maskImage: `radial-gradient(circle at 50% 50%, #000 ${(grid * 78).toFixed(1)}%, rgba(0,0,0,0) ${(grid * 108).toFixed(1)}%)`,
        }}
      >
        <g stroke="rgba(238,244,248,0.055)" strokeWidth="1">
          {FINE.map((l, i) =>
            l[0] === 'v' ? (
              <line key={`f${i}`} x1={l[1]} y1={FR.y} x2={l[1]} y2={FR.y + FR.h} />
            ) : (
              <line key={`f${i}`} x1={FR.x} y1={l[1]} x2={FR.x + FR.w} y2={l[1]} />
            ),
          )}
        </g>
        <g stroke="rgba(238,244,248,0.11)" strokeWidth="1">
          {BOLD.map((l, i) =>
            l[0] === 'v' ? (
              <line key={`b${i}`} x1={l[1]} y1={FR.y} x2={l[1]} y2={FR.y + FR.h} />
            ) : (
              <line key={`b${i}`} x1={FR.x} y1={l[1]} x2={FR.x + FR.w} y2={l[1]} />
            ),
          )}
        </g>
      </svg>

      {/* «камера»: построение, обводка, размеры */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cam.toFixed(4)})`,
          transformOrigin: '50% 50%',
        }}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0, opacity: planOp }}
        >
          {G(draw(seg(plan, 0, 0.4)), 440, 912, 1700, 512, {
            stroke: 'rgba(238,244,248,0.3)',
            strokeWidth: 1.2,
            strokeDasharray: '14 10',
          })}
          <g>
            {G(draw(seg(plan, 0.12, 0.5)), BB.x1, BB.y1, BB.x2, BB.y1, dash)}
            {G(draw(seg(plan, 0.35, 0.7)), BB.x2, BB.y1, BB.x2, BB.y2, dash)}
            {G(draw(seg(plan, 0.55, 0.9)), BB.x2, BB.y2, BB.x1, BB.y2, dash)}
            {G(draw(seg(plan, 0.72, 1)), BB.x1, BB.y2, BB.x1, BB.y1, dash)}
          </g>
          {[FW, RW].map((w, i) => {
            const c = ell(w.rx, w.ry);
            const p = draw(seg(wheels, i * 0.22, 0.78 + i * 0.22));
            return (
              <g key={`w${i}`} transform={`rotate(-8 ${w.cx} ${w.cy})`} opacity={p > 0 ? 1 : 0}>
                <ellipse
                  cx={w.cx}
                  cy={w.cy}
                  rx={w.rx}
                  ry={w.ry}
                  fill="none"
                  stroke={acc}
                  strokeOpacity="0.55"
                  strokeWidth="1.4"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - p)}
                />
                <line
                  x1={w.cx - w.rx - 16}
                  y1={w.cy}
                  x2={w.cx - w.rx - 16 + (2 * w.rx + 32) * p}
                  y2={w.cy}
                  stroke={acc}
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="6 5"
                />
                <line
                  x1={w.cx}
                  y1={w.cy - w.ry - 16}
                  x2={w.cx}
                  y2={w.cy - w.ry - 16 + (2 * w.ry + 32) * p}
                  stroke={acc}
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="6 5"
                />
              </g>
            );
          })}
        </svg>

        {/* выносные и осевые */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <g stroke={acc} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="14 5 2 5">
            {[BB.x1, FW.cx, RW.cx, BB.x2].map((x, i) => {
              const p = draw(seg(ext, i * 0.1, 0.62 + i * 0.1));
              return <line key={`vx${i}`} x1={x} y1={64} x2={x} y2={64 + (1006 - 64) * p} />;
            })}
          </g>
          <g stroke="rgba(238,244,248,0.22)" strokeWidth="1" strokeDasharray="14 5 2 5">
            {[BB.y1, BB.y2].map((y, i) => {
              const p = draw(seg(ext, 0.18 + i * 0.1, 0.75 + i * 0.1));
              return <line key={`hy${i}`} x1={228} y1={y} x2={228 + (1620 - 228) * p} y2={y} />;
            })}
            {[FW, RW].map((w, i) => {
              const p = draw(seg(ext, 0.34 + i * 0.1, 0.9 + i * 0.1));
              const x0 = w.cx - w.rx - 90;
              const x1 = w.cx + w.rx + 130;
              return <line key={`ax${i}`} x1={x0} y1={w.cy} x2={x0 + (x1 - x0) * p} y2={w.cy} />;
            })}
          </g>
        </svg>

        {/* обводка: штрихи рисуются, затем передают эстафету растровой линовке */}
        {vec > 0 && (
          <svg
            width={IMG.w}
            height={IMG.h}
            viewBox={`0 0 ${ST.w} ${ST.h}`}
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              left: IMG.l,
              top: IMG.t,
              width: IMG.w,
              height: IMG.h,
              opacity: vec,
              filter: 'drop-shadow(0 0 6px rgba(143,214,255,0.35))',
            }}
          >
            <g
              fill="none"
              stroke="#f4f9fc"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {ST.groups.map((g, i) => (
                <path
                  key={i}
                  d={g.d}
                  pathLength="1"
                  strokeDasharray="1 1"
                  strokeDashoffset={1 - strokeP(i, ST.groups.length)}
                />
              ))}
            </g>
          </svg>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/blueprint/bus-lines.png"
          alt=""
          style={{
            position: 'absolute',
            left: IMG.l,
            top: IMG.t,
            width: IMG.w,
            height: IMG.h,
            opacity: raster,
            filter: `drop-shadow(0 0 ${(5 + glow * 14).toFixed(1)}px rgba(143,214,255,${(0.16 + glow * 0.34).toFixed(3)}))`,
          }}
        />

        {/* размеры */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <g>
            {G(dimLen, BB.x1, 940, BB.x2, 940, thin)}
            {[BB.x1, BB.x2].map((x, i) => (
              <line
                key={`lt${i}`}
                x1={x}
                y1={BB.y2 + 8}
                x2={x}
                y2={952}
                stroke="rgba(238,244,248,0.35)"
                strokeWidth="1"
                opacity={dimLen}
              />
            ))}
            <g opacity={seg(dimLen, 0.85, 1)} fill="rgba(238,244,248,0.7)">
              <polygon points={`${BB.x1 + 1},940 ${BB.x1 + 15},935 ${BB.x1 + 15},945`} />
              <polygon points={`${BB.x2 - 1},940 ${BB.x2 - 15},935 ${BB.x2 - 15},945`} />
            </g>
            <g opacity={seg(dimLen, 0.6, 1)}>
              <rect x="826" y="923" width="208" height="34" fill={GRAPHITE} />
              <text
                x="930"
                y="947"
                textAnchor="middle"
                fill={INK}
                fontFamily={MONO}
                fontSize="26"
                letterSpacing="3"
              >
                {type('7 340 мм', seg(dimLen, 0.6, 1))}
              </text>
            </g>
          </g>

          <g>
            {G(dimBase, FW.cx, 862, RW.cx, 862, thin)}
            <line
              x1={FW.cx}
              y1={FW.cy}
              x2={FW.cx}
              y2={FW.cy + (874 - FW.cy) * dimBase}
              stroke={acc}
              strokeOpacity="0.3"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            <line
              x1={RW.cx}
              y1={RW.cy}
              x2={RW.cx}
              y2={RW.cy + (874 - RW.cy) * dimBase}
              stroke={acc}
              strokeOpacity="0.3"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            <g opacity={seg(dimBase, 0.6, 1)}>
              <rect x="1039" y="845" width="168" height="32" fill={GRAPHITE} />
              <text
                x="1123"
                y="868"
                textAnchor="middle"
                fill={INK}
                fontFamily={MONO}
                fontSize="24"
                letterSpacing="3"
              >
                {type('4 325', seg(dimBase, 0.6, 1))}
              </text>
            </g>
          </g>

          <g>
            {G(dimHt, 286, BB.y1, 286, BB.y2, thin)}
            {[BB.y1, BB.y2].map((y, i) => (
              <line
                key={`ht${i}`}
                x1={274}
                y1={y}
                x2={BB.x1 - 8}
                y2={y}
                stroke="rgba(238,244,248,0.35)"
                strokeWidth="1"
                opacity={dimHt}
              />
            ))}
            <g opacity={seg(dimHt, 0.6, 1)} transform="translate(286 448) rotate(-90)">
              <rect x="-104" y="-17" width="208" height="34" fill={GRAPHITE} />
              <text
                x="0"
                y="8"
                textAnchor="middle"
                fill={INK}
                fontFamily={MONO}
                fontSize="26"
                letterSpacing="3"
              >
                {type('2 800 мм', seg(dimHt, 0.6, 1))}
              </text>
            </g>
          </g>

          <g>
            {G(draw(seg(callout, 0, 0.55)), 1256, 109, 1420, 86, {
              stroke: 'rgba(238,244,248,0.5)',
              strokeWidth: 1.2,
            })}
            {G(draw(seg(callout, 0.45, 0.8)), 1420, 86, 1520, 86, {
              stroke: 'rgba(238,244,248,0.5)',
              strokeWidth: 1.2,
            })}
            <circle cx="1256" cy="109" r="4" fill={acc} opacity={seg(callout, 0, 0.2)} />
            <text
              x="1536"
              y="94"
              fill={INK}
              fontFamily={MONO}
              fontSize="22"
              letterSpacing="4"
              opacity="0.9"
            >
              {type('ВЫСОКАЯ КРЫША H3', seg(callout, 0.6, 1))}
            </text>
          </g>
        </svg>
      </div>

      {/* блик на финальном такте */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: sheen * 0.5,
          pointerEvents: 'none',
          background: `linear-gradient(100deg, rgba(143,214,255,0) ${(sheen * 120 - 30).toFixed(1)}%, rgba(143,214,255,0.14) ${(sheen * 120 - 12).toFixed(1)}%, rgba(143,214,255,0) ${(sheen * 120 + 6).toFixed(1)}%)`,
        }}
      />

      {/* рамка листа, тех. данные и штамп */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 }}>
        <rect
          x={FR.x}
          y={FR.y}
          width={FR.w}
          height={FR.h}
          fill="none"
          stroke="rgba(238,244,248,0.42)"
          strokeWidth="2"
          strokeDasharray={2 * (FR.w + FR.h)}
          strokeDashoffset={2 * (FR.w + FR.h) * (1 - frame)}
        />
        <g stroke={acc} strokeWidth="2" opacity={seg(frame, 0.75, 1) * 0.8}>
          <line x1={FR.x} y1={FR.y + 34} x2={FR.x} y2={FR.y} />
          <line x1={FR.x} y1={FR.y} x2={FR.x + 34} y2={FR.y} />
          <line x1={FR.x + FR.w - 34} y1={FR.y} x2={FR.x + FR.w} y2={FR.y} />
          <line x1={FR.x + FR.w} y1={FR.y} x2={FR.x + FR.w} y2={FR.y + 34} />
          <line x1={FR.x} y1={FR.y + FR.h - 34} x2={FR.x} y2={FR.y + FR.h} />
          <line x1={FR.x} y1={FR.y + FR.h} x2={FR.x + 34} y2={FR.y + FR.h} />
          <line x1={FR.x + FR.w - 34} y1={FR.y + FR.h} x2={FR.x + FR.w} y2={FR.y + FR.h} />
          <line x1={FR.x + FR.w} y1={FR.y + FR.h} x2={FR.x + FR.w} y2={FR.y + FR.h - 34} />
        </g>

        <g>
          <text
            x="80"
            y="104"
            fill="rgba(238,244,248,0.55)"
            fontFamily={MONO}
            fontSize="18"
            letterSpacing="5"
            opacity={seg(spec, 0, 0.15)}
          >
            ТЕХ. ДАННЫЕ
          </text>
          <line
            x1="80"
            y1="118"
            x2={80 + 186 * draw(seg(spec, 0.02, 0.25))}
            y2="118"
            stroke="rgba(238,244,248,0.3)"
            strokeWidth="1"
          />
          {SPEC.map((r, i) => {
            const p = seg(spec, 0.1 + i * 0.12, 0.4 + i * 0.12);
            return (
              <g key={`s${i}`} opacity={p}>
                <text
                  x="80"
                  y={154 + i * 34}
                  fill="rgba(238,244,248,0.5)"
                  fontFamily={MONO}
                  fontSize="16"
                  letterSpacing="2"
                >
                  {r[0]}
                </text>
                <text
                  x="266"
                  y={154 + i * 34}
                  textAnchor="end"
                  fill={INK}
                  fontFamily={MONO}
                  fontSize="18"
                  letterSpacing="0.5"
                >
                  {type(r[1], p)}
                </text>
              </g>
            );
          })}
        </g>

        <g opacity={frame > 0.4 ? 1 : 0}>
          <rect
            x={TB.x}
            y={TB.y}
            width={TB.w}
            height={TB.h}
            fill="rgba(20,24,27,0.85)"
            stroke="rgba(238,244,248,0.35)"
            strokeWidth="1.5"
            strokeDasharray={2 * (TB.w + TB.h)}
            strokeDashoffset={2 * (TB.w + TB.h) * (1 - draw(seg(title, 0, 0.45)))}
          />
          <line
            x1={TB.x}
            y1={TB.y + 54}
            x2={TB.x + TB.w * draw(seg(title, 0.3, 0.6))}
            y2={TB.y + 54}
            stroke="rgba(238,244,248,0.25)"
            strokeWidth="1"
          />
          <line
            x1={TB.x}
            y1={TB.y + 104}
            x2={TB.x + TB.w * draw(seg(title, 0.45, 0.75))}
            y2={TB.y + 104}
            stroke="rgba(238,244,248,0.25)"
            strokeWidth="1"
          />
          <text
            x={TB.x + 18}
            y={TB.y + 35}
            fill={INK}
            fontFamily={MONO}
            fontSize={titleFs}
            letterSpacing={(titleFs * 0.15).toFixed(1)}
          >
            {type(sheetTitle, seg(title, 0.25, 0.7))}
          </text>
          <text
            x={TB.x + 18}
            y={TB.y + 86}
            fill="rgba(238,244,248,0.62)"
            fontFamily={MONO}
            fontSize="17"
            letterSpacing="2"
          >
            {type('ШАССИ · ОБЩИЙ ВИД', seg(title, 0.45, 0.85))}
          </text>
          <text
            x={TB.x + 18}
            y={TB.y + 134}
            fill="rgba(238,244,248,0.45)"
            fontFamily={MONO}
            fontSize="15"
            letterSpacing="2"
          >
            {type('М 1:20   ЛИСТ 1/1', seg(title, 0.62, 1))}
          </text>
        </g>
      </svg>
    </div>
  );
}

/** Состояние листа в конкретный момент таймлайна. */
function frameAt(t: number, accent: string, sheetTitle: string): SheetProps {
  let acc = 0;
  let idx = SCENES.length - 1;
  let p = 1;

  for (let i = 0; i < SCENES.length; i += 1) {
    const end = acc + SCENES[i];
    if (t < end || i === SCENES.length - 1) {
      idx = i;
      p = clamp((t - acc) / SCENES[i], 0, 1);
      break;
    }
    acc = end;
  }

  const base = { accent, sheetTitle };

  switch (idx) {
    case 0:
      return {
        ...base,
        grid: enter(seg(p, 0, 0.5)),
        frame: draw(seg(p, 0.16, 0.78)),
        title: seg(p, 0.5, 1),
        cam: lerp(1.05, 1.02, draw(p)),
      };
    case 1:
      return {
        ...base,
        grid: 1,
        frame: 1,
        title: 1,
        plan: draw(seg(p, 0.02, 0.62)),
        wheels: draw(seg(p, 0.38, 0.98)),
        cam: lerp(1.02, 1, draw(p)),
      };
    case 2:
      return {
        ...base,
        grid: 1,
        frame: 1,
        title: 1,
        plan: 1,
        wheels: 1,
        lines: easeInOutSine(seg(p, 0.03, 0.9)),
        vec: 1 - seg(p, 0.9, 1),
        raster: seg(p, 0.9, 1),
        boxDim: draw(seg(p, 0.5, 1)),
        glow: seg(p, 0.6, 0.95) * 0.35,
        cam: lerp(1, 1.015, draw(p)),
      };
    case 3:
      return {
        ...base,
        grid: 1,
        frame: 1,
        title: 1,
        plan: 1,
        wheels: 1,
        lines: 1,
        boxDim: 1,
        glow: 0.35,
        raster: 1,
        ext: draw(seg(p, 0, 0.5)),
        dims: draw(seg(p, 0.12, 0.86)),
        spec: seg(p, 0.28, 0.98),
        callout: draw(seg(p, 0.42, 0.98)),
        cam: lerp(1.015, 1.03, draw(p)),
      };
    default: {
      const pulse = Math.sin(Math.PI * clamp(p, 0, 1));
      return {
        ...base,
        grid: 1,
        frame: 1,
        title: 1,
        plan: 1,
        wheels: 1,
        lines: 1,
        boxDim: 1,
        raster: 1,
        ext: 1,
        dims: 1,
        spec: 1,
        callout: 1,
        glow: 0.35 + pulse * 0.5,
        sheen: pulse,
        cam: lerp(1.03, 1, draw(p)),
      };
    }
  }
}

export function BusBlueprint({
  accent = '#3FA9C9',
  sheetTitle = 'СПЕЦТРАНСПОРТ · ОБЩИЙ ВИД',
}: {
  accent?: string;
  sheetTitle?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [scale, setScale] = useState(0);

  // Лист живёт в координатах 1920×1080 и масштабируется под ширину контейнера.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / W);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);

  // Проигрывается один раз и только когда чертёж попал в кадр.
  useEffect(() => {
    const el = box.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setT(TOTAL);
      return;
    }

    let raf = 0;
    let started = 0;

    const tick = (now: number) => {
      if (!started) started = now;
      const elapsed = (now - started) / 1000;
      setT(Math.min(elapsed, TOTAL));
      if (elapsed < TOTAL) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: GRAPHITE }}
    >
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <Sheet {...frameAt(t, accent, sheetTitle)} />
      </div>
    </div>
  );
}
