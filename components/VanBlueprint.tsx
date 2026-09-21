'use client';

/**
 * Порт анимации `van77-blueprint.jsx` из прототипа («Чертёж фургона new1»):
 * фургон в изометрии, который рисуется по сценам — сетка листа, построение,
 * обводка, размеры, итог. Значения размеров перенесены с ортогонального
 * листа (мм).
 * Движок прототипа (animations-v2-engine) заменён минимальным таймлайном:
 * нужны только последовательность сцен, прогресс внутри сцены и один проход.
 */

import { useEffect, useRef, useState } from 'react';
import { VAN_STROKES } from '@/lib/van-strokes';

const W = 1920;
const H = 1080;
const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace";
const INK = '#eef4f8';
const GRAPHITE = '#14181b';

// Геометрия листа и артворка — из прототипа без изменений.
// Обводка вида 3/4 — 1308×968 px рендера, размещена в масштабе 0.711.
const IMG = { l: 466, t: 181, w: 930, h: 689 };

const NOSE = 470;
const TAIL = 1392;
const FAX = 757;
const RAX = 1170;
const CH1 = 1292;
const NEAR_B = 730;
const BOXR_FAR = 1149;
const BOXF = 702;
const ROOF = 185;
const GND = 865;
const BODY_T = 275;
const REAR_T = 216;
const REAR_B = 612;
const TOPD = 142;
const CHAIN = 898;
const TOTAL_Y = 940;

const BB = { x1: NOSE, y1: ROOF, x2: TAIL, y2: GND };
const FW = { cx: FAX, cy: 768, r: 97 };
const RW = { cx: RAX, cy: 647, r: 90 };
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

const SUBTITLE = 'ШАССИ · КУЗОВ · ГИДРОБОРТ';

const SPEC: [string, string][] = [
  ['ДЛИНА', '8026'],
  ['ШИРИНА', '2430'],
  ['ВЫСОТА', '3770'],
  ['БАЗА', '4516'],
  ['КОЛЕЯ', '1820'],
  ['КУЗОВ', '5100'],
  ['ВНУТРИ', '2213'],
];

type Rule = ['v' | 'h', number];
const FINE: Rule[] = [];
for (let x = FR.x; x <= FR.x + FR.w + 1; x += 48) FINE.push(['v', x]);
for (let y = FR.y; y <= FR.y + FR.h + 1; y += 48) FINE.push(['h', y]);
const BOLD: Rule[] = [];
for (let x = FR.x; x <= FR.x + FR.w + 1; x += 240) BOLD.push(['v', x]);
for (let y = FR.y; y <= FR.y + FR.h + 1; y += 240) BOLD.push(['h', y]);

const thin = { stroke: 'rgba(238,244,248,0.55)', strokeWidth: 1.4, strokeLinecap: 'round' as const };
const hair = { stroke: 'rgba(238,244,248,0.45)', strokeWidth: 1.2, strokeLinecap: 'round' as const };
const dash = { stroke: 'rgba(238,244,248,0.4)', strokeWidth: 1.2, strokeDasharray: '7 7' };
const tickS = { stroke: 'rgba(238,244,248,0.3)', strokeWidth: 1 };

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

/** Горизонтальная размерная стрелка, dir = ±1 — куда смотрит остриё. */
const arrow = (x: number, y: number, dir: number) => (
  <polygon
    points={`${x + dir},${y} ${x + dir * 14},${y - 5} ${x + dir * 14},${y + 5}`}
  />
);
/** Вертикальная размерная стрелка. */
const arrowV = (x: number, y: number, dir: number) => (
  <polygon
    points={`${x},${y + dir} ${x - 5},${y + dir * 14} ${x + 5},${y + dir * 14}`}
  />
);

/** Размерная надпись на плашке цвета листа — перекрывает размерную линию. */
function Label({
  p,
  x,
  y,
  t,
  w = 150,
  h = 32,
  fs = 24,
  rot = false,
}: {
  p: number;
  x: number;
  y: number;
  t: string;
  w?: number;
  h?: number;
  fs?: number;
  rot?: boolean;
}) {
  return (
    <g
      opacity={seg(p, 0.55, 1)}
      transform={rot ? `translate(${x} ${y}) rotate(-90)` : `translate(${x} ${y})`}
    >
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={GRAPHITE} />
      <text
        x="0"
        y={fs * 0.36}
        textAnchor="middle"
        fill={INK}
        fontFamily={MONO}
        fontSize={fs}
        letterSpacing="2"
      >
        {type(t, seg(p, 0.55, 1))}
      </text>
    </g>
  );
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
  const fitFs = (s: string, max: number) =>
    Math.min(max, Math.floor(298 / (0.75 * Math.max(s.length, 1))));
  const titleFs = fitFs(sheetTitle, 20);
  const subFs = fitFs(SUBTITLE, 17);

  const ST = VAN_STROKES;
  const strokeP = (i: number, n: number) => {
    const win = 0.17;
    const st = (i / n) * (1 - win);
    return easeOutCubic(clamp((lines - st) / win, 0, 1));
  };

  const planOp = 1 - 0.6 * boxDim;
  const dimLen = draw(seg(dims, 0, 0.3));
  const dimBase = draw(seg(dims, 0.24, 0.52));
  const dimHt = draw(seg(dims, 0.44, 0.7));
  const dimBody = draw(seg(dims, 0.6, 0.86));
  const dimRear = draw(seg(dims, 0.72, 1));

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
          {/* линия земли */}
          {G(draw(seg(plan, 0, 0.4)), 420, GND, 1520, GND, {
            stroke: 'rgba(238,244,248,0.3)',
            strokeWidth: 1.2,
            strokeDasharray: '14 10',
          })}
          {/* общий габарит */}
          <g>
            {G(draw(seg(plan, 0.12, 0.5)), BB.x1, BB.y1, BB.x2, BB.y1, dash)}
            {G(draw(seg(plan, 0.35, 0.7)), BB.x2, BB.y1, BB.x2, BB.y2, dash)}
            {G(draw(seg(plan, 0.55, 0.9)), BB.x2, BB.y2, BB.x1, BB.y2, dash)}
            {G(draw(seg(plan, 0.72, 1)), BB.x1, BB.y2, BB.x1, BB.y1, dash)}
          </g>
          {/* построение колёс */}
          {[FW, RW].map((w, i) => {
            const c = 2 * Math.PI * w.r;
            const p = draw(seg(wheels, i * 0.22, 0.78 + i * 0.22));
            return (
              <g key={`w${i}`} opacity={p > 0 ? 1 : 0}>
                <circle
                  cx={w.cx}
                  cy={w.cy}
                  r={w.r}
                  fill="none"
                  stroke={acc}
                  strokeOpacity="0.55"
                  strokeWidth="1.4"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - p)}
                />
                <line
                  x1={w.cx - w.r - 16}
                  y1={w.cy}
                  x2={w.cx - w.r - 16 + (2 * w.r + 32) * p}
                  y2={w.cy}
                  stroke={acc}
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="6 5"
                />
                <line
                  x1={w.cx}
                  y1={w.cy - w.r - 16}
                  x2={w.cx}
                  y2={w.cy - w.r - 16 + (2 * w.r + 32) * p}
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
          <g stroke={acc} strokeOpacity="0.26" strokeWidth="1" strokeDasharray="14 5 2 5">
            {[NOSE, FAX, RAX, CH1, TAIL].map((x, i) => {
              const p = draw(seg(ext, (i % 4) * 0.08, 0.6 + (i % 4) * 0.08));
              return (
                <line
                  key={`vx${i}`}
                  x1={x}
                  y1={ROOF - 40}
                  x2={x}
                  y2={ROOF - 40 + (920 - (ROOF - 40)) * p}
                />
              );
            })}
          </g>
          <g stroke="rgba(238,244,248,0.2)" strokeWidth="1" strokeDasharray="14 5 2 5">
            {[ROOF, BODY_T, REAR_B, GND].map((y, i) => {
              const p = draw(seg(ext, 0.16 + i * 0.08, 0.74 + i * 0.08));
              return <line key={`hy${i}`} x1={400} y1={y} x2={400 + 1130 * p} y2={y} />;
            })}
            {[FW, RW].map((w, i) => {
              const p = draw(seg(ext, 0.34 + i * 0.1, 0.9 + i * 0.1));
              const x0 = w.cx - w.r - 80;
              const x1 = w.cx + w.r + 110;
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
              strokeWidth="2.6"
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
          src="/blueprint/van77-lines.png"
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

        {/* размеры — значения с листа */}
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* габаритная длина 8026 */}
          <g>
            {G(dimLen, NEAR_B, TOTAL_Y, TAIL, TOTAL_Y, thin)}
            <line x1={NEAR_B} y1={765} x2={NEAR_B} y2={TOTAL_Y + 12} {...tickS} opacity={dimLen} />
            <line x1={TAIL} y1={GND + 8} x2={TAIL} y2={TOTAL_Y + 12} {...tickS} opacity={dimLen} />
            <g opacity={seg(dimLen, 0.8, 1)} fill="rgba(238,244,248,0.7)">
              {arrow(NEAR_B, TOTAL_Y, 1)}
              {arrow(TAIL, TOTAL_Y, -1)}
            </g>
            <Label p={dimLen} x={(NEAR_B + TAIL) / 2} y={TOTAL_Y} t="8026" w={132} h={34} fs={26} />
          </g>

          {/* цепочка: база 4516 / 1242 / удлинение 900 */}
          <g>
            {G(dimBase, FAX, CHAIN, TAIL, CHAIN, hair)}
            {[FAX, RAX, CH1].map((x, i) => (
              <line
                key={`cl${i}`}
                x1={x}
                y1={i === 0 ? FW.cy : i === 1 ? RW.cy : REAR_B}
                x2={x}
                y2={CHAIN + 10}
                {...tickS}
                opacity={dimBase * 0.8}
                strokeDasharray="6 6"
              />
            ))}
            <g opacity={seg(dimBase, 0.8, 1)} fill="rgba(238,244,248,0.6)">
              {arrow(FAX, CHAIN, 1)}
              {arrow(RAX, CHAIN, -1)}
              {arrow(RAX, CHAIN, 1)}
              {arrow(CH1, CHAIN, -1)}
              {arrow(CH1, CHAIN, 1)}
              {arrow(TAIL, CHAIN, -1)}
            </g>
            <Label p={dimBase} x={(FAX + RAX) / 2} y={CHAIN} t="4516" w={112} h={32} fs={24} />
            <Label p={seg(dimBase, 0.15, 1)} x={(RAX + CH1) / 2} y={CHAIN} t="1242" w={100} h={30} fs={21} />
            <Label
              p={seg(dimBase, 0.3, 1)}
              x={(CH1 + TAIL) / 2}
              y={CHAIN - 34}
              t="Удлинение 900"
              w={218}
              h={28}
              fs={18}
            />
          </g>

          {/* габаритная высота 3770 */}
          <g>
            {G(dimHt, 424, ROOF, 424, GND, thin)}
            {[ROOF, GND].map((y, i) => (
              <line key={`hl${i}`} x1={414} y1={y} x2={NOSE - 10} y2={y} {...tickS} opacity={dimHt} />
            ))}
            <g opacity={seg(dimHt, 0.8, 1)} fill="rgba(238,244,248,0.7)">
              {arrowV(424, ROOF, 1)}
              {arrowV(424, GND, -1)}
            </g>
            <Label p={dimHt} x={424} y={(ROOF + GND) / 2} t="3770" w={132} h={34} fs={26} rot />
          </g>

          {/* длина кузова 5100 — по крыше */}
          <g>
            {G(dimBody, BOXF, TOPD, BOXR_FAR, TOPD, thin)}
            <line x1={BOXF} y1={BODY_T - 10} x2={BOXF} y2={TOPD - 12} {...tickS} opacity={dimBody} />
            <line x1={BOXR_FAR} y1={ROOF - 4} x2={BOXR_FAR} y2={TOPD - 12} {...tickS} opacity={dimBody} />
            <g opacity={seg(dimBody, 0.8, 1)} fill="rgba(238,244,248,0.7)">
              {arrow(BOXF, TOPD, 1)}
              {arrow(BOXR_FAR, TOPD, -1)}
            </g>
            <Label p={dimBody} x={(BOXF + BOXR_FAR) / 2} y={TOPD} t="5100" w={124} h={32} fs={24} />
          </g>

          {/* задний торец: высота кузова 2380, внутри 2213, ширина 2430 */}
          <g>
            {G(dimRear, 1436, REAR_T, 1436, REAR_B, hair)}
            {[REAR_T, REAR_B].map((y, i) => (
              <line key={`rl${i}`} x1={1396} y1={y} x2={1446} y2={y} {...tickS} opacity={dimRear} />
            ))}
            <g opacity={seg(dimRear, 0.85, 1)} fill="rgba(238,244,248,0.6)">
              {arrowV(1436, REAR_T, 1)}
              {arrowV(1436, REAR_B, -1)}
            </g>
            <Label p={dimRear} x={1436} y={(REAR_T + REAR_B) / 2} t="2380" w={104} h={30} fs={21} rot />

            {G(seg(dimRear, 0.2, 1), 1500, REAR_T + 26, 1500, REAR_B - 26, hair)}
            <Label
              p={seg(dimRear, 0.25, 1)}
              x={1500}
              y={(REAR_T + REAR_B) / 2}
              t="Внутри 2213"
              w={184}
              h={28}
              fs={18}
              rot
            />

            {G(seg(dimRear, 0.45, 1), 1330, 340, 1452, 286, {
              stroke: 'rgba(238,244,248,0.5)',
              strokeWidth: 1.2,
            })}
            <circle cx="1330" cy="340" r="4" fill={acc} opacity={seg(dimRear, 0.45, 0.6)} />
            <text
              x="1462"
              y="293"
              fill={INK}
              fontFamily={MONO}
              fontSize="22"
              letterSpacing="2"
              opacity={seg(dimRear, 0.6, 1)}
            >
              {type('2430', seg(dimRear, 0.6, 1))}
            </text>
          </g>

          {/* выноска на гидроборт */}
          <g>
            {G(draw(seg(callout, 0, 0.5)), 1340, 606, 1424, 692, {
              stroke: 'rgba(238,244,248,0.5)',
              strokeWidth: 1.2,
            })}
            {G(draw(seg(callout, 0.4, 0.72)), 1424, 692, 1470, 692, {
              stroke: 'rgba(238,244,248,0.5)',
              strokeWidth: 1.2,
            })}
            <circle cx="1340" cy="606" r="4" fill={acc} opacity={seg(callout, 0, 0.2)} />
            <text
              x="1480"
              y="698"
              fill={INK}
              fontFamily={MONO}
              fontSize="19"
              letterSpacing="2"
              opacity="0.9"
            >
              {type('ГИДРОБОРТ', seg(callout, 0.5, 0.75))}
            </text>
            <text
              x="1480"
              y="726"
              fill="rgba(238,244,248,0.6)"
              fontFamily={MONO}
              fontSize="16"
              letterSpacing="1.5"
            >
              {type('Max 1492 / Min 1292', seg(callout, 0.7, 1))}
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

      {/* рамка листа, тех. данные, примечание и штамп */}
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
            ТЕХ. ДАННЫЕ, ММ
          </text>
          <line
            x1="80"
            y1="118"
            x2={80 + 160 * draw(seg(spec, 0.02, 0.25))}
            y2="118"
            stroke="rgba(238,244,248,0.3)"
            strokeWidth="1"
          />
          {SPEC.map((r, i) => {
            const p = seg(spec, 0.08 + i * 0.1, 0.36 + i * 0.1);
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
                  x="240"
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

        {/* примечание с листа */}
        <g
          opacity={seg(callout, 0.5, 1)}
          fill="rgba(238,244,248,0.5)"
          fontFamily={MONO}
          fontSize="16"
          letterSpacing="1.5"
        >
          <text x="80" y="446">
            {type('Лопата гидроборта ляжет', seg(callout, 0.5, 0.74))}
          </text>
          <text x="80" y="472">
            {type('на землю только в макси-', seg(callout, 0.62, 0.86))}
          </text>
          <text x="80" y="498">
            {type('мально опущенном положе-', seg(callout, 0.74, 0.94))}
          </text>
          <text x="80" y="524">
            {type('нии пневмоподвески', seg(callout, 0.84, 1))}
          </text>
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
            fontSize={subFs}
            letterSpacing={(subFs * 0.12).toFixed(1)}
          >
            {type(SUBTITLE, seg(title, 0.45, 0.85))}
          </text>
          <text
            x={TB.x + 18}
            y={TB.y + 134}
            fill="rgba(238,244,248,0.45)"
            fontFamily={MONO}
            fontSize="15"
            letterSpacing="2"
          >
            {type('ИЗОМЕТРИЯ   ЛИСТ 1/1', seg(title, 0.62, 1))}
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
        ext: draw(seg(p, 0, 0.42)),
        dims: draw(seg(p, 0.1, 0.9)),
        spec: seg(p, 0.22, 0.95),
        callout: draw(seg(p, 0.5, 1)),
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

export function VanBlueprint({
  accent = '#3FA9C9',
  sheetTitle = 'ФУРГОН · ОБЩИЙ ВИД',
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

    let raf = 0;

    // Без анимации — сразу итоговый лист.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      raf = requestAnimationFrame(() => setT(TOTAL));
      return () => cancelAnimationFrame(raf);
    }

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
