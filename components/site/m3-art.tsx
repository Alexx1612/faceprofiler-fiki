"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Drawn placeholders for the M3 wireframe and app demos: camera feeds with walking silhouettes,
 * face boxes that move with them, a scan line, a blinking REC dot and a running clock, plus
 * head-and-shoulders avatars. Everything is SVG/CSS (no photographs, no real people).
 * Animations are switched off by the site's prefers-reduced-motion rule.
 */

/** A clock that starts at `start` (hh:mm:ss) and ticks every second. */
export function useClock(start = "02:17:00") {
  const [t, setT] = useState(() => start.split(":").reduce((a, v) => a * 60 + Number(v), 0));
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 86400), 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(t / 3600))}:${p(Math.floor(t / 60) % 60)}:${p(t % 60)}`;
}

/** Person silhouette in viewBox units, standing at x, feet at y, height h. */
function Figure({ h = 34, tone = "#9aa6b5" }: { h?: number; tone?: string }) {
  const r = h * 0.13;
  return (
    <g>
      <circle cx={0} cy={-h + r} r={r} fill={tone} />
      <path d={`M ${-h * 0.2} ${-h + 2.4 * r} Q 0 ${-h + 1.8 * r} ${h * 0.2} ${-h + 2.4 * r} L ${h * 0.17} ${-h * 0.42} L ${h * 0.1} 0 L ${-h * 0.1} 0 L ${-h * 0.17} ${-h * 0.42} Z`} fill={tone} />
    </g>
  );
}

type Walker = { y: number; h: number; dur: number; delay: number; label?: string; known?: boolean; reverse?: boolean };

const SCENES: Record<string, Walker[]> = {
  corridor: [
    { y: 78, h: 40, dur: 11, delay: -2, label: "Ana 0.84", known: true },
    { y: 70, h: 30, dur: 14, delay: -8, label: "Unknown_1", reverse: true },
  ],
  gate: [{ y: 80, h: 44, dur: 9, delay: -3, label: "Unknown_1" }],
  yard: [
    { y: 82, h: 28, dur: 16, delay: -5 },
    { y: 74, h: 22, dur: 19, delay: -12, reverse: true },
  ],
  room: [{ y: 80, h: 36, dur: 13, delay: -6, label: "Night guard 0.91", known: true }],
  empty: [],
};

/** Animated camera tile. `scene` picks who walks through; `boxes` draws face boxes and labels. */
export function CamFeed({ label, scene = "corridor", boxes = true, className, night = true, hud = true }: { label?: string; scene?: keyof typeof SCENES; boxes?: boolean; className?: string; night?: boolean; hud?: boolean }) {
  const clock = useClock(scene === "gate" ? "02:17:00" : "02:16:40");
  return (
    <div className={cn("relative overflow-hidden rounded border border-zinc-500/60", night ? "bg-[#1d2430]" : "bg-[#cfd6de]", className)}>
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        {/* room: back wall, floor and perspective lines */}
        <rect x="0" y="0" width="160" height="52" fill={night ? "#262f3d" : "#dde3ea"} />
        <rect x="0" y="52" width="160" height="38" fill={night ? "#202834" : "#c5cdd6"} />
        {[-40, 0, 40, 80, 120, 160, 200].map((x) => (
          <line key={x} x1={80 + (x - 80) * 0.25} y1="52" x2={x} y2="90" stroke={night ? "#2f3a4a" : "#b3bcc7"} strokeWidth="0.6" />
        ))}
        <rect x="20" y="18" width="18" height="34" fill={night ? "#1a212c" : "#c8d0d9"} stroke={night ? "#3a4657" : "#aab4bf"} strokeWidth="0.6" />
        <rect x="118" y="14" width="26" height="16" fill={night ? "#2c3647" : "#e8edf2"} stroke={night ? "#3a4657" : "#aab4bf"} strokeWidth="0.6" />
        {(SCENES[scene] ?? []).map((w, i) => (
          <g key={i} style={{ animation: `${w.reverse ? "m3-walk-rev" : "m3-walk"} ${w.dur}s linear ${w.delay}s infinite` }}>
            <g transform={`translate(0 ${w.y})`}>
              <Figure h={w.h} tone={night ? "#8794a6" : "#6b7787"} />
              {boxes && w.label && (
                <g>
                  <rect
                    x={-w.h * 0.17}
                    y={-w.h - 1}
                    width={w.h * 0.34}
                    height={w.h * 0.36}
                    fill="none"
                    stroke={w.known ? "#34d399" : "#f87171"}
                    strokeWidth="0.9"
                    className="m3-pulse"
                  />
                  <rect x={-w.h * 0.17} y={-w.h - 7} width={w.label.length * 2.6 + 3} height="6" fill={w.known ? "#065f46" : "#7f1d1d"} />
                  <text x={-w.h * 0.17 + 1.5} y={-w.h - 2.6} fontSize="4.2" fill="#fff" fontFamily="ui-monospace, monospace">
                    {w.label}
                  </text>
                </g>
              )}
            </g>
          </g>
        ))}
        <rect x="0" y="0" width="160" height="2" fill={night ? "#7dd3fc" : "#0369a1"} opacity="0.18" className="m3-scan" />
      </svg>
      {hud && (
        <span className="absolute top-1 right-1.5 flex items-center gap-1 rounded-sm bg-black/50 px-1 font-mono text-[9px] text-white">
          <span className="m3-blink size-1.5 rounded-full bg-red-500" />
          {clock}
        </span>
      )}
      {label && <span className="absolute bottom-1 left-1 rounded-sm bg-black/55 px-1 text-[10px] text-zinc-100">{label}</span>}
    </div>
  );
}

/** Head-and-shoulders placeholder for a person card or a reference photo. */
export function Avatar({ className, hue = 210, ring }: { className?: string; hue?: number; ring?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded border border-zinc-300", className)} style={{ background: `linear-gradient(160deg, hsl(${hue} 30% 88%), hsl(${hue} 25% 76%))` }}>
      <svg viewBox="0 0 40 50" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 size-full" aria-hidden="true">
        <circle cx="20" cy="19" r="8.5" fill={`hsl(${hue} 18% 52%)`} />
        <path d="M5 50 Q6 32 20 31 Q34 32 35 50 Z" fill={`hsl(${hue} 18% 52%)`} />
      </svg>
      {ring && <span className={cn("absolute inset-0 rounded ring-2 ring-inset", ring)} />}
    </div>
  );
}

/** A list whose newest entry slides in at the top every few seconds (the night's events). */
export function Ticker({ items, every = 3500, render }: { items: string[]; every?: number; render: (s: string, fresh: boolean) => React.ReactNode }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= items.length ? 1 : x + 1)), every);
    return () => clearInterval(id);
  }, [items.length, every]);
  const shown = items.slice(0, n).reverse();
  return (
    <>
      {shown.map((s, i) => (
        <div key={`${s}-${n - i}`} className={i === 0 ? "animate-in slide-in-from-top-2 fade-in duration-500" : ""}>
          {render(s, i === 0)}
        </div>
      ))}
    </>
  );
}
