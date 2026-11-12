"use client";

import { useState } from "react";
import useMeasure from "react-use-measure";

/**
 * Small hand-made SVG charts drawn at their real pixel width (measured), so labels stay readable on phones.
 *
 * Methodology (dataviz skill): colours are the reference dark categorical slots (blue, orange, aqua), validated
 * all-pairs against the fiki card surface #10141c with the skill's validate_palette.js (all checks pass). Text always
 * uses neutral ink, never the series colour. Bars are at most 24px thick with a 4px rounded data end and a square
 * baseline; lines are 2px; gridlines are solid hairlines. Every mark answers hover and keyboard focus with the same
 * read-out, and every chart has a "Show the numbers" table, so no value depends on a pointer or on colour alone.
 */

export const SERIES = ["#3987e5", "#d95926", "#199e70"];
/** Unfilled meter track: a dark step of the blue ramp, so the whole bar reads as one measure. */
const TRACK = "#1c2c45";
const GRID = "rgba(255,255,255,0.08)";
const BASE = "rgba(255,255,255,0.18)";
const INK = "#e5e7eb";
const MUTED = "#9ca3af";
const SURFACE = "#10141c";
const FS = 11;

const fmt = (n: number) => n.toLocaleString("en-US");

/** Round tick values from 0 to at least `max`: steps of 1, 2, 2.5 or 5 × 10^k, about `count` of them. */
function niceTicks(max: number, count = 3, min = 0) {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t < max + step; t += step) ticks.push(Number(t.toFixed(6)));
  return ticks;
}

/** Path for a horizontal bar: square at the baseline (left), 4px rounded data end (right). */
function hbarPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h / 2);
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}

/** Path for a vertical column: square at the baseline (bottom), 4px rounded data end (top). */
function colPath(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  const top = base - h;
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** Props that make one SVG mark answer the pointer and the keyboard alike. */
function markProps(i: number, label: string, set: (i: number | null) => void) {
  return {
    tabIndex: 0,
    role: "img" as const,
    "aria-label": label,
    onMouseEnter: () => set(i),
    onMouseLeave: () => set(null),
    onFocus: () => set(i),
    onBlur: () => set(null),
    className: "outline-none focus-visible:[&>.hit]:stroke-sky-300 focus-visible:[&>.hit]:stroke-1",
  };
}

/** The table twin of a chart: every value readable without hovering and without colour. */
function NumbersTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-8 cursor-pointer items-center text-xs text-neutral-400 hover:text-white">Show the numbers</summary>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead>
            <tr className="border-b border-white/10 text-neutral-400">
              {head.map((h, i) => (
                <th key={h} scope="col" className={i ? "py-1 pl-3 text-right font-medium" : "py-1 font-medium"}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-white/5">
                {r.map((c, ci) =>
                  ci ? (
                    <td key={ci} className="py-1 pl-3 text-right tabular-nums">
                      {c}
                    </td>
                  ) : (
                    <th key={ci} scope="row" className="py-1 font-normal">
                      {c}
                    </th>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Shared frame: a one-line live read-out above the plot (hover/focus value or the default caption). */
function Frame({ readout, label, children, height }: { readout: string; label: string; children: (w: number) => React.ReactNode; height: number }) {
  const [ref, { width }] = useMeasure();
  return (
    <div>
      <p className="jet mb-1 min-h-4 text-xs text-neutral-400" aria-live="polite">
        {readout}
      </p>
      <div ref={ref} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="group" aria-label={label} className="block overflow-visible">
            {children(width)}
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * Horizontal bars, one series. Value at the bar end; long labels go above their bar.
 * With `track`, each bar becomes a meter: the unfilled part of the whole (`max`) is drawn in the same ramp.
 */
export function HBars({
  items,
  max,
  suffix = "",
  caption,
  labelAbove = false,
  track = false,
  title,
}: {
  items: { label: string; value: number; detail?: string }[];
  max: number;
  suffix?: string;
  caption: string;
  labelAbove?: boolean;
  track?: boolean;
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const row = labelAbove ? 44 : 32;
  const barH = 16;
  const h = items.length * row;
  const text = (it: (typeof items)[number]) => `${it.label}: ${it.value}${suffix}${it.detail ? ` (${it.detail})` : ""}`;
  return (
    <div>
      <Frame readout={hover === null ? caption : text(items[hover])} label={title} height={h}>
        {(w) => {
          const x0 = labelAbove ? 0 : Math.min(w * 0.42, 220);
          const span = w - x0 - 52;
          const fit = Math.floor(w / 6.2);
          return items.map((it, i) => {
            const bw = Math.max(4, (it.value / max) * span);
            const y = labelAbove ? i * row + 20 : i * row + (row - barH) / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={it.label} {...markProps(i, text(it), setHover)}>
                <rect className="hit" x={0} y={i * row} width={w} height={row} rx={6} fill="transparent" />
                {labelAbove ? (
                  <text x={0} y={i * row + 13} fontSize={FS} fill={INK}>
                    {it.label.length > fit ? it.label.slice(0, fit - 1) + "…" : it.label}
                  </text>
                ) : (
                  <text x={x0 - 8} y={y + 12} textAnchor="end" fontSize={FS} fill={INK}>
                    {it.label}
                  </text>
                )}
                {track && <path d={hbarPath(x0, y, span, barH)} fill={TRACK} />}
                <path d={hbarPath(x0, y, bw, barH)} fill={SERIES[0]} opacity={dim ? 0.45 : 1} />
                <text x={x0 + (track ? span : bw) + 6} y={y + 12} fontSize={FS} fill={INK} className="tabular-nums">
                  {it.value}
                  {suffix}
                </text>
              </g>
            );
          });
        }}
      </Frame>
      <NumbersTable head={["", "Value", ...(items.some((i) => i.detail) ? ["Detail"] : [])]} rows={items.map((it) => [it.label, `${it.value}${suffix}`, ...(it.detail ? [it.detail] : [])])} />
    </div>
  );
}

/** Vertical columns on clean ticks, the peak labelled on its cap. */
export function Columns({ labels, values, unit, caption, title }: { labels: string[]; values: number[]; unit: string; caption: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 170;
  const max = Math.max(...values);
  const ticks = niceTicks(max, 3);
  const hi = ticks[ticks.length - 1];
  const peak = values.indexOf(max);
  const text = (i: number) => `${labels[i]}:00 · ${fmt(values[i])} ${unit}`;
  return (
    <div>
      <Frame readout={hover === null ? caption : text(hover)} label={title} height={h}>
        {(w) => {
          const left = 38;
          const top = 16;
          const base = h - 20;
          const step = (w - left) / values.length;
          const bw = Math.min(24, Math.max(6, step - 2));
          const Y = (v: number) => base - ((base - top) * v) / hi;
          return (
            <>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={left} x2={w} y1={Y(t)} y2={Y(t)} stroke={t ? GRID : BASE} />
                  <text x={left - 6} y={Y(t) + 4} textAnchor="end" fontSize={FS} fill={MUTED} className="tabular-nums">
                    {fmt(t)}
                  </text>
                </g>
              ))}
              {values.map((v, i) => {
                const x = left + i * step + (step - bw) / 2;
                const dim = hover !== null && hover !== i;
                return (
                  <g key={i} {...markProps(i, text(i), setHover)}>
                    <rect className="hit" x={left + i * step} y={top - 14} width={step} height={base - top + 14} fill="transparent" />
                    <path d={colPath(x, base, bw, base - Y(v))} fill={SERIES[0]} opacity={dim ? 0.45 : 1} />
                    {i === peak && (
                      <text x={x + bw / 2} y={Y(v) - 5} textAnchor="middle" fontSize={FS} fill={INK} className="tabular-nums">
                        {fmt(v)}
                      </text>
                    )}
                    {(i % 2 === 0 || w > 460) && (
                      <text x={x + bw / 2} y={h - 4} textAnchor="middle" fontSize={FS} fill={MUTED}>
                        {labels[i]}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          );
        }}
      </Frame>
      <NumbersTable head={["Hour", unit[0].toUpperCase() + unit.slice(1)]} rows={labels.map((l, i) => [`${l}:00`, fmt(values[i])])} />
    </div>
  );
}

/** Observed line, then a dashed forecast (dashing means "projection" here) with a 10% uncertainty wash. */
export function ForecastChart({ observed, predicted, band, unit, caption, title }: { observed: number[]; predicted: number[]; band: number; unit: string; caption: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 180;
  const all = [...observed, ...predicted];
  const ticks = niceTicks(Math.max(...predicted) * (1 + band), 3, Math.min(...observed) * 0.95);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const n = all.length;
  const range = (v: number) => `${(v * (1 - band)).toFixed(1)}–${(v * (1 + band)).toFixed(1)}k`;
  const text = (i: number) => (i < observed.length ? `Week ${i + 1} · ${all[i]}k visitors (observed)` : `Week ${i + 1} · ${all[i]}k forecast (${range(all[i])})`);
  return (
    <div>
      <Frame readout={hover === null ? caption : text(hover)} label={`${title} (${unit})`} height={h}>
        {(w) => {
          const left = 34;
          const top = 8;
          const base = h - 20;
          const x = (i: number) => left + (i * (w - left - 8)) / (n - 1);
          const y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - top);
          const obsPath = observed.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
          const startI = observed.length - 1;
          const fc = [observed[startI], ...predicted];
          const fcPath = fc.map((v, k) => `${k ? "L" : "M"}${x(startI + k)},${y(v)}`).join(" ");
          const up = fc.map((v, k) => `${k ? "L" : "M"}${x(startI + k)},${y(k ? v * (1 + band) : v)}`).join(" ");
          const down = [...fc]
            .reverse()
            .map((v, k) => `L${x(startI + fc.length - 1 - k)},${y(k === fc.length - 1 ? v : v * (1 - band))}`)
            .join(" ");
          const slot = (w - left) / n;
          return (
            <>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={left} x2={w} y1={y(t)} y2={y(t)} stroke={t === lo ? BASE : GRID} />
                  <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize={FS} fill={MUTED} className="tabular-nums">
                    {t}k
                  </text>
                </g>
              ))}
              <rect x={x(startI)} y={top} width={w - x(startI)} height={base - top} fill="rgba(255,255,255,0.025)" />
              <text x={x(startI) + 4} y={top + 11} fontSize={FS} fill={MUTED}>
                forecast
              </text>
              <path d={`${up} ${down} Z`} fill={SERIES[0]} opacity={0.1} />
              <path d={obsPath} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={fcPath} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
              <circle cx={x(n - 1)} cy={y(all[n - 1])} r={4} fill={SERIES[0]} stroke={SURFACE} strokeWidth={2} />
              <text x={x(n - 1) - 8} y={y(all[n - 1]) + 18} textAnchor="end" fontSize={FS} fill={INK} className="tabular-nums">
                {all[n - 1]}k
              </text>
              {hover !== null && (
                <>
                  <line x1={x(hover)} x2={x(hover)} y1={top} y2={base} stroke={MUTED} strokeWidth={1} />
                  <circle cx={x(hover)} cy={y(all[hover])} r={4} fill={SERIES[0]} stroke={SURFACE} strokeWidth={2} />
                </>
              )}
              {[0, startI, n - 1].map((i) => (
                <text key={i} x={x(i)} y={h - 4} textAnchor={i === n - 1 ? "end" : i ? "middle" : "start"} fontSize={FS} fill={MUTED}>
                  wk {i + 1}
                </text>
              ))}
              {all.map((_, i) => (
                <g key={i} {...markProps(i, text(i), setHover)}>
                  <rect className="hit" x={x(i) - slot / 2} y={0} width={slot} height={h} fill="transparent" />
                </g>
              ))}
            </>
          );
        }}
      </Frame>
      <NumbersTable head={["Week", "Visitors", "Range"]} rows={all.map((v, i) => [`Week ${i + 1}${i < observed.length ? "" : " (forecast)"}`, `${v}k`, i < observed.length ? "observed" : range(v)])} />
    </div>
  );
}

/** Several cumulative lines on one axis, with a line-key legend and end labels. */
export function MultiLine({ x, series, caption, title }: { x: number[]; series: { name: string; values: number[] }[]; caption: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 200;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values)), 3);
  const hi = ticks[ticks.length - 1];
  const money = (v: number) => (v >= 1000 ? `€${fmt(Math.round(v / 1000))}k` : `€${v}`);
  const text = (i: number) => `${i === 0 ? "Start" : `Year ${x[i]}`}: ` + series.map((s) => `${s.name.split(" ")[0]} €${fmt(s.values[i])}`).join(" · ");
  return (
    <div>
      <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
        {series.map((s, i) => (
          <li key={s.name} className="flex items-center gap-1.5 text-xs text-neutral-300">
            <span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} aria-hidden="true" /> {s.name}
          </li>
        ))}
      </ul>
      <Frame readout={hover === null ? caption : text(hover)} label={title} height={h}>
        {(w) => {
          const left = 44;
          const right = 52;
          const top = 8;
          const base = h - 20;
          const X = (i: number) => left + (i * (w - left - right)) / (x.length - 1);
          const Y = (v: number) => base - (v / hi) * (base - top);
          const slot = (w - left - right) / (x.length - 1);
          return (
            <>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={left} x2={w - right} y1={Y(t)} y2={Y(t)} stroke={t ? GRID : BASE} />
                  <text x={left - 6} y={Y(t) + 4} textAnchor="end" fontSize={FS} fill={MUTED} className="tabular-nums">
                    {money(t)}
                  </text>
                </g>
              ))}
              {series.map((s, si) => {
                const last = s.values[s.values.length - 1];
                return (
                  <g key={s.name}>
                    <path d={s.values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ")} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx={X(x.length - 1)} cy={Y(last)} r={4} fill={SERIES[si]} stroke={SURFACE} strokeWidth={2} />
                    <text x={X(x.length - 1) + 8} y={Y(last) + 4} fontSize={FS} fill={INK} className="tabular-nums">
                      {money(last)}
                    </text>
                  </g>
                );
              })}
              {hover !== null && (
                <>
                  <line x1={X(hover)} x2={X(hover)} y1={top} y2={base} stroke={MUTED} />
                  {series.map((s, si) => (
                    <circle key={s.name} cx={X(hover)} cy={Y(s.values[hover])} r={4} fill={SERIES[si]} stroke={SURFACE} strokeWidth={2} />
                  ))}
                </>
              )}
              {x.map((yr, i) => (
                <g key={yr} {...markProps(i, text(i), setHover)}>
                  <rect className="hit" x={X(i) - slot / 2} y={0} width={slot} height={h} fill="transparent" />
                  <text x={X(i)} y={h - 4} textAnchor="middle" fontSize={FS} fill={MUTED}>
                    {i === 0 ? "start" : `y${yr}`}
                  </text>
                </g>
              ))}
            </>
          );
        }}
      </Frame>
      <NumbersTable head={["", ...series.map((s) => s.name)]} rows={x.map((yr, i) => [i === 0 ? "Start" : `Year ${yr}`, ...series.map((s) => `€${fmt(s.values[i])}`)])} />
    </div>
  );
}

/** Low–high ranges as a whisker with a dot at the middle. */
export function Ranges({ items, maxYears, caption, title }: { items: { part: string; low: number; high: number }[]; maxYears: number; caption: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const row = 32;
  const h = items.length * row + 20;
  const text = (i: number) => `${items[i].part}: ${items[i].low}–${items[i].high} years`;
  return (
    <div>
      <Frame readout={hover === null ? caption : text(hover)} label={title} height={h}>
        {(w) => {
          const x0 = Math.min(130, w * 0.35);
          const X = (v: number) => x0 + (v / maxYears) * (w - x0 - 16);
          return (
            <>
              {niceTicks(maxYears, 5).map((t) => (
                <g key={t}>
                  <line x1={X(t)} x2={X(t)} y1={0} y2={h - 18} stroke={t ? GRID : BASE} />
                  <text x={X(t)} y={h - 4} textAnchor="middle" fontSize={FS} fill={MUTED} className="tabular-nums">
                    {t}y
                  </text>
                </g>
              ))}
              {items.map((it, i) => {
                const cy = i * row + 15;
                return (
                  <g key={it.part} {...markProps(i, text(i), setHover)}>
                    <rect className="hit" x={0} y={i * row} width={w} height={row} rx={6} fill="transparent" />
                    <text x={x0 - 8} y={cy + 4} textAnchor="end" fontSize={FS} fill={INK}>
                      {it.part}
                    </text>
                    <line x1={X(it.low)} x2={X(it.high)} y1={cy} y2={cy} stroke={SERIES[0]} strokeWidth={2} strokeLinecap="round" />
                    <line x1={X(it.low)} x2={X(it.low)} y1={cy - 5} y2={cy + 5} stroke={SERIES[0]} strokeWidth={2} strokeLinecap="round" />
                    <line x1={X(it.high)} x2={X(it.high)} y1={cy - 5} y2={cy + 5} stroke={SERIES[0]} strokeWidth={2} strokeLinecap="round" />
                    <circle cx={X((it.low + it.high) / 2)} cy={cy} r={hover === i ? 5 : 4} fill={SERIES[0]} stroke={SURFACE} strokeWidth={2} />
                  </g>
                );
              })}
            </>
          );
        }}
      </Frame>
      <NumbersTable head={["Part", "Shortest", "Longest"]} rows={items.map((it) => [it.part, `${it.low} years`, `${it.high} years`])} />
    </div>
  );
}

/**
 * Meter: one ratio against its whole, as a thin bar. The fill is series blue, the unfilled track a dark step of
 * the same ramp. The figure beside it is the value; the meter only shows how much of the whole it is.
 */
export function Meter({ part, whole, label }: { part: number; whole: number; label: string }) {
  const pct = whole ? Math.max(0, Math.min(1, part / whole)) : 0;
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={whole} aria-valuenow={part} aria-label={label} className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: TRACK }}>
      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: SERIES[0] }} />
    </div>
  );
}
