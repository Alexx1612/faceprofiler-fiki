"use client";

import { useState } from "react";
import useMeasure from "react-use-measure";

/**
 * Small hand-made SVG charts drawn at their real pixel width (measured), so labels stay
 * readable on phones. Colours are the validated dark categorical slots (blue, orange, aqua);
 * text always uses neutral ink, never the series colour. Every chart has a hover read-out.
 */

export const SERIES = ["#3987e5", "#d95926", "#199e70"];
const GRID = "rgba(255,255,255,0.08)";
const INK = "#e5e7eb";
const MUTED = "#9ca3af";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Shared frame: a one-line read-out above the plot (hover value or default caption). */
function Frame({ readout, children, height }: { readout: string; children: (w: number) => React.ReactNode; height: number }) {
  const [ref, { width }] = useMeasure();
  return (
    <div>
      <p className="jet mb-1 h-4 truncate text-[11px] text-neutral-400">{readout}</p>
      <div ref={ref} style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" className="block overflow-visible">
            {children(width)}
          </svg>
        )}
      </div>
    </div>
  );
}

/** Horizontal bars, one series. Value label at the bar end; long labels go above their bar. */
export function HBars({ items, max, suffix = "", caption, labelAbove = false }: { items: { label: string; value: number; detail?: string }[]; max: number; suffix?: string; caption: string; labelAbove?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const row = labelAbove ? 42 : 30;
  const labelW = 0.42;
  const h = items.length * row;
  const read = hover === null ? caption : `${items[hover].label}: ${items[hover].value}${suffix}${items[hover].detail ? ` (${items[hover].detail})` : ""}`;
  return (
    <Frame readout={read} height={h}>
      {(w) => {
        const x0 = labelAbove ? 0 : Math.min(w * labelW, 220);
        const span = w - x0 - 48;
        const fit = Math.floor(w / 6);
        return items.map((it, i) => {
          const bw = Math.max(4, (it.value / max) * span);
          const y = labelAbove ? i * row + 18 : i * row + 6;
          return (
            <g key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={i * row} width={w} height={row} fill="transparent" />
              {labelAbove ? (
                <text x={0} y={i * row + 12} fontSize={11} fill={INK}>
                  {it.label.length > fit ? it.label.slice(0, fit - 1) + "…" : it.label}
                </text>
              ) : (
                <text x={x0 - 8} y={y + 12} textAnchor="end" fontSize={11} fill={INK}>
                  {it.label}
                </text>
              )}
              <rect x={x0} y={y} width={bw} height={16} rx={4} fill={SERIES[0]} opacity={hover === null || hover === i ? 1 : 0.45} />
              <text x={x0 + bw + 6} y={y + 12} fontSize={11} fill={INK}>
                {it.value}
                {suffix}
              </text>
            </g>
          );
        });
      }}
    </Frame>
  );
}

/** Vertical columns with the peak labelled. */
export function Columns({ labels, values, unit, caption }: { labels: string[]; values: number[]; unit: string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 150;
  const max = Math.max(...values);
  const peak = values.indexOf(max);
  const read = hover === null ? caption : `${labels[hover]}:00 · ${fmt(values[hover])} ${unit}`;
  return (
    <Frame readout={read} height={h}>
      {(w) => {
        const top = 14;
        const base = h - 18;
        const step = w / values.length;
        const bw = Math.max(6, step - 4);
        return (
          <>
            <line x1={0} x2={w} y1={base} y2={base} stroke={GRID} />
            {values.map((v, i) => {
              const bh = ((base - top) * v) / max;
              const x = i * step + (step - bw) / 2;
              return (
                <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={i * step} y={0} width={step} height={h} fill="transparent" />
                  <rect x={x} y={base - bh} width={bw} height={bh} rx={4} fill={SERIES[0]} opacity={hover === null || hover === i ? 1 : 0.45} />
                  {i === peak && (
                    <text x={x + bw / 2} y={base - bh - 4} textAnchor="middle" fontSize={10} fill={INK}>
                      {fmt(v)}
                    </text>
                  )}
                  {(i % 2 === 0 || w > 420) && (
                    <text x={x + bw / 2} y={h - 4} textAnchor="middle" fontSize={10} fill={MUTED}>
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
  );
}

/** Observed line, then a dashed forecast with an uncertainty band. */
export function ForecastChart({ observed, predicted, band, unit, caption }: { observed: number[]; predicted: number[]; band: number; unit: string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 170;
  const all = [...observed, ...predicted];
  const lo = Math.floor(Math.min(...observed) * 0.9);
  const hi = Math.ceil(Math.max(...predicted) * (1 + band) * 1.02);
  const n = all.length;
  const read =
    hover === null
      ? caption
      : hover < observed.length
        ? `Week ${hover + 1} · ${all[hover]}k visitors (observed)`
        : `Week ${hover + 1} · ${all[hover]}k forecast (${(all[hover] * (1 - band)).toFixed(1)}–${(all[hover] * (1 + band)).toFixed(1)}k)`;
  return (
    <Frame readout={read} height={h}>
      {(w) => {
        const left = 30;
        const top = 8;
        const base = h - 20;
        const x = (i: number) => left + (i * (w - left - 8)) / (n - 1);
        const y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - top);
        const obsPath = observed.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
        const startI = observed.length - 1;
        const fc = [observed[startI], ...predicted];
        const fcPath = fc.map((v, k) => `${k ? "L" : "M"}${x(startI + k)},${y(v)}`).join(" ");
        const up = fc.map((v, k) => `${k ? "L" : "M"}${x(startI + k)},${y(k ? v * (1 + band) : v)}`).join(" ");
        const down = [...fc].reverse().map((v, k) => `L${x(startI + fc.length - 1 - k)},${y(k === fc.length - 1 ? v : v * (1 - band))}`).join(" ");
        const ticks = [lo, Math.round((lo + hi) / 2), hi];
        return (
          <>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={w} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={left - 4} y={y(t) + 3} textAnchor="end" fontSize={10} fill={MUTED}>
                  {t}k
                </text>
              </g>
            ))}
            <rect x={x(startI)} y={top} width={w - x(startI)} height={base - top} fill="rgba(255,255,255,0.025)" />
            <text x={x(startI) + 4} y={top + 10} fontSize={10} fill={MUTED}>
              forecast
            </text>
            <path d={`${up} ${down} Z`} fill={SERIES[0]} opacity={0.18} />
            <path d={obsPath} fill="none" stroke={SERIES[0]} strokeWidth={2} />
            <path d={fcPath} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeDasharray="5 4" />
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={top} y2={base} stroke={MUTED} strokeWidth={1} />
                <circle cx={x(hover)} cy={y(all[hover])} r={4} fill={SERIES[0]} stroke="#0d1118" strokeWidth={2} />
              </>
            )}
            {[0, observed.length - 1, n - 1].map((i) => (
              <text key={i} x={x(i)} y={h - 4} textAnchor="middle" fontSize={10} fill={MUTED}>
                wk {i + 1}
              </text>
            ))}
            {all.map((_, i) => (
              <rect key={i} x={x(i) - (w - left) / n / 2} y={0} width={(w - left) / n} height={h} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
            <title>{`Weekly visitors in thousands (${unit})`}</title>
          </>
        );
      }}
    </Frame>
  );
}

/** Several cumulative lines with a legend and end labels. */
export function MultiLine({ x, series, caption }: { x: number[]; series: { name: string; values: number[] }[]; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = 190;
  const hi = Math.max(...series.flatMap((s) => s.values));
  const read = hover === null ? caption : `Year ${x[hover]}: ` + series.map((s) => `${s.name.split(" ")[0]} €${fmt(s.values[hover])}`).join(" · ");
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s, i) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} /> {s.name}
          </span>
        ))}
      </div>
      <Frame readout={read} height={h}>
        {(w) => {
          const left = 40;
          const right = 52;
          const top = 8;
          const base = h - 20;
          const X = (i: number) => left + (i * (w - left - right)) / (x.length - 1);
          const Y = (v: number) => base - (v / hi) * (base - top);
          const ticks = [0, hi / 2, hi];
          return (
            <>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={left} x2={w - right} y1={Y(t)} y2={Y(t)} stroke={GRID} />
                  <text x={left - 4} y={Y(t) + 3} textAnchor="end" fontSize={10} fill={MUTED}>
                    €{Math.round(t / 1000)}k
                  </text>
                </g>
              ))}
              {series.map((s, si) => (
                <g key={s.name}>
                  <path d={s.values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ")} fill="none" stroke={SERIES[si]} strokeWidth={2} />
                  <text x={X(x.length - 1) + 6} y={Y(s.values[s.values.length - 1]) + 3} fontSize={10} fill={INK}>
                    €{Math.round(s.values[s.values.length - 1] / 1000)}k
                  </text>
                </g>
              ))}
              {hover !== null && (
                <>
                  <line x1={X(hover)} x2={X(hover)} y1={top} y2={base} stroke={MUTED} />
                  {series.map((s, si) => (
                    <circle key={s.name} cx={X(hover)} cy={Y(s.values[hover])} r={4} fill={SERIES[si]} stroke="#0d1118" strokeWidth={2} />
                  ))}
                </>
              )}
              {x.map((yr, i) => (
                <g key={yr}>
                  <text x={X(i)} y={h - 4} textAnchor="middle" fontSize={10} fill={MUTED}>
                    {i === 0 ? "start" : `y${yr}`}
                  </text>
                  <rect x={X(i) - (w - left - right) / x.length / 2} y={0} width={(w - left - right) / x.length} height={h} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                </g>
              ))}
            </>
          );
        }}
      </Frame>
    </div>
  );
}

/** Low–high ranges as a whisker with a dot at the middle. */
export function Ranges({ items, maxYears, caption }: { items: { part: string; low: number; high: number }[]; maxYears: number; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const row = 30;
  const h = items.length * row + 18;
  const read = hover === null ? caption : `${items[hover].part}: ${items[hover].low}–${items[hover].high} years`;
  return (
    <Frame readout={read} height={h}>
      {(w) => {
        const x0 = Math.min(130, w * 0.35);
        const X = (v: number) => x0 + (v / maxYears) * (w - x0 - 16);
        return (
          <>
            {[0, 2, 4, 6, 8, 10].map((t) => (
              <g key={t}>
                <line x1={X(t)} x2={X(t)} y1={0} y2={h - 16} stroke={GRID} />
                <text x={X(t)} y={h - 3} textAnchor="middle" fontSize={10} fill={MUTED}>
                  {t}y
                </text>
              </g>
            ))}
            {items.map((it, i) => {
              const cy = i * row + 14;
              return (
                <g key={it.part} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={0} y={i * row} width={w} height={row} fill="transparent" />
                  <text x={x0 - 8} y={cy + 4} textAnchor="end" fontSize={11} fill={INK}>
                    {it.part}
                  </text>
                  <line x1={X(it.low)} x2={X(it.high)} y1={cy} y2={cy} stroke={SERIES[0]} strokeWidth={2} />
                  <line x1={X(it.low)} x2={X(it.low)} y1={cy - 5} y2={cy + 5} stroke={SERIES[0]} strokeWidth={2} />
                  <line x1={X(it.high)} x2={X(it.high)} y1={cy - 5} y2={cy + 5} stroke={SERIES[0]} strokeWidth={2} />
                  <circle cx={X((it.low + it.high) / 2)} cy={cy} r={hover === i ? 5 : 4} fill={SERIES[0]} stroke="#0d1118" strokeWidth={2} />
                </g>
              );
            })}
          </>
        );
      }}
    </Frame>
  );
}
