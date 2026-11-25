"use client";

import {
  BatteryMedium,
  BellRing,
  Building2,
  CameraOff,
  Check,
  Clock,
  EyeOff,
  Lock,
  Minus,
  Moon,
  PhoneCall,
  Plus,
  School,
  ShieldAlert,
  ShieldCheck,
  Signal,
  UserRound,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";

import { m4Changes, type Source } from "@/lib/m4";
import { cn } from "@/lib/utils";

/**
 * M4 "Wireframe v2": the changed screens drawn as the real Nau-ino app would show them (dark navy, sky accents,
 * the same world as the site), one card per change in lib/m4.ts `m4Changes`.
 *
 * Methodology: every mock is pure markup and SVG (no photos of people; the CCTV still is an abstract corridor
 * with a silhouette). Mocks are illustrations, so they are hidden from screen readers; each card's text
 * (title, source badge, change, why) carries the meaning. Motion is limited to the alert's pulse, the
 * escalation countdown and the escalation ladder's progress dot, and stops for prefers-reduced-motion.
 */

const SOURCE: Record<Source, [string, string]> = {
  M2: ["From M2 interviews", "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"],
  M4: ["From M4 interviews", "border-sky-400/35 bg-sky-400/10 text-sky-200"],
  draft: ["Draft, to confirm", "border-amber-400/35 bg-amber-400/10 text-amber-200"],
};

/** Seconds left before the alert escalates; counts down live and restarts (static with reduced motion). */
function useCountdown(from: number) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? from : s - 1)), 1000);
    return () => clearInterval(t);
  }, [from]);
  return left;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* ---------------------------------------------------------------- W1 · the guard's phone */

function CctvStill() {
  return (
    <svg viewBox="0 0 160 90" className="block h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="m4w-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13243f" />
          <stop offset="1" stopColor="#0a1629" />
        </linearGradient>
        <radialGradient id="m4w-lamp" cx="0.5" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#9cc9ff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#9cc9ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="160" height="90" fill="url(#m4w-floor)" />
      <rect width="160" height="90" fill="url(#m4w-lamp)" />
      {/* corridor in perspective */}
      <path d="M0 90 L58 38 L102 38 L160 90 Z" fill="#0f1e36" />
      <path d="M58 38 L58 14 L102 14 L102 38" fill="none" stroke="#2a4470" strokeWidth="0.8" />
      <path d="M0 0 L58 14 M160 0 L102 14 M0 90 L58 38 M160 90 L102 38" stroke="#2a4470" strokeWidth="0.8" />
      <rect x="66" y="18" width="12" height="20" fill="#1c3358" />
      <rect x="84" y="20" width="10" height="18" fill="#1c3358" />
      {/* a figure, drawn not photographed */}
      <g fill="#c7d5ea" opacity="0.9">
        <circle cx="88" cy="47" r="4.2" />
        <path d="M81.5 70 C81.5 58 83.5 53 88 53 C92.5 53 94.5 58 94.5 70 Z" />
      </g>
      <rect x="78.5" y="41" width="19" height="31" fill="none" stroke="#f87171" strokeWidth="1.2" />
      <rect x="78.5" y="36" width="25" height="5.5" fill="#ef4444" />
      <text x="80" y="40" fontSize="4" fill="#fff" fontFamily="ui-monospace, monospace">UNKNOWN</text>
      <circle cx="7" cy="7" r="2" fill="#ef4444" className="m4w-pulse" />
      <text x="12" y="8.6" fontSize="4.6" fill="#e2e8f0" fontFamily="ui-monospace, monospace">CAM 03 · 02:17:04</text>
    </svg>
  );
}

function W1() {
  const total = 161;
  const left = useCountdown(total);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="mx-auto w-[198px] rounded-[38px] bg-gradient-to-b from-slate-500/70 via-slate-700/60 to-slate-800/80 p-[1.5px] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.85)]">
      <div className="relative overflow-hidden rounded-[36.5px] bg-[#050b17] px-3 pt-2.5 pb-3.5">
        {/* status bar + dynamic island */}
        <div className="flex items-center justify-between px-1.5 text-[10px] font-semibold text-slate-200">
          <span className="tabular-nums">02:17</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Signal className="size-3" strokeWidth={2.4} />
            <Wifi className="size-3" strokeWidth={2.4} />
            <BatteryMedium className="size-3.5" strokeWidth={2} />
          </span>
        </div>
        <div className="absolute top-2 left-1/2 h-[18px] w-[64px] -translate-x-1/2 rounded-full bg-black" />
        {/* alert card */}
        <div className="mt-3.5 rounded-2xl border border-red-400/30 bg-gradient-to-b from-red-500/[0.16] to-red-500/[0.04] p-2.5 shadow-[0_10px_30px_-12px_rgba(239,68,68,0.55)]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="m4w-ping absolute inline-flex size-full rounded-full bg-red-400" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-semibold text-red-100">Unknown person</span>
            <span className="ml-auto text-[9.5px] text-red-200/70">now</span>
          </div>
          <p className="mt-0.5 text-[9.5px] text-red-100/70">Corridor A · camera 3</p>
          <div className="mt-2 aspect-video overflow-hidden rounded-lg ring-1 ring-white/10">
            <CctvStill />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <svg viewBox="0 0 36 36" className="size-10 shrink-0 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r={r}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - left / total)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="text-[9.5px] leading-tight text-slate-300">
              <b className="block text-[13px] font-semibold text-amber-200 tabular-nums">{mmss(left)}</b>
              until the security company is called
            </span>
          </div>
        </div>
        <button type="button" tabIndex={-1} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-400 py-2.5 text-[12px] font-semibold text-sky-950">
          <Check className="size-3.5" strokeWidth={2.6} /> I&apos;m checking
        </button>
        <button type="button" tabIndex={-1} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/40 bg-red-500/10 py-2.5 text-[12px] font-semibold text-red-100">
          <PhoneCall className="size-3.5" strokeWidth={2.4} /> Call help
        </button>
        <span className="mx-auto mt-3 block h-1 w-16 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- W2 · morning summary */

function W2() {
  const kpis: [string, string, string][] = [
    ["2", "alerts", "text-white"],
    ["2", "answered", "text-sky-200"],
    ["0", "open", "text-emerald-300"],
  ];
  // 21:00 → 07:00 is 10 h; positions as a share of that window
  const at = (h: number, m: number) => (((h < 21 ? h + 24 : h) - 21 + m / 60) / 10) * 100;
  return (
    <div className="w-full max-w-[330px] rounded-2xl border border-white/10 bg-[#0b1730] p-3.5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">
          <Moon className="size-3.5" />
        </span>
        <span className="text-[12.5px] font-semibold text-white">Last night</span>
        <span className="ml-auto text-[10.5px] text-slate-400 tabular-nums">21:00 – 07:00</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {kpis.map(([n, t, tone]) => (
          <div key={t} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-2">
            <b className={cn("block text-[22px] leading-none font-semibold tabular-nums", tone)}>{n}</b>
            <span className="mt-1 block text-[10px] text-slate-400">{t}</span>
          </div>
        ))}
      </div>
      {/* the night as a strip with its two events */}
      <div className="relative mt-3.5 h-6">
        <div className="absolute inset-x-0 top-2.5 h-1 rounded-full bg-gradient-to-r from-indigo-500/30 via-slate-600/40 to-amber-300/30" />
        {[
          [at(2, 17), "bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.25)]"],
          [at(4, 5), "bg-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.25)]"],
        ].map(([x, c]) => (
          <span key={String(x)} className={cn("absolute top-[7px] size-2.5 -translate-x-1/2 rounded-full", c)} style={{ left: `${x}%` }} />
        ))}
        <span className="absolute top-4 left-0 text-[8.5px] text-slate-500">21:00</span>
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[8.5px] text-slate-500">02:00</span>
        <span className="absolute top-4 right-0 text-[8.5px] text-slate-500">07:00</span>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        <li className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-2.5 py-2">
          <ShieldAlert className="size-3.5 shrink-0 text-red-300" />
          <span className="min-w-0 text-[10.5px] leading-tight text-slate-200">
            <b className="font-semibold text-white">02:17</b> Unknown · Corridor A
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[9px] text-sky-200">guard · 0:40</span>
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-2.5 py-2">
          <CameraOff className="size-3.5 shrink-0 text-amber-300" />
          <span className="min-w-0 text-[10.5px] leading-tight text-slate-200">
            <b className="font-semibold text-white">04:05</b> Camera 6 covered
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-emerald-200">fixed 04:12</span>
        </li>
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- W3 · privacy settings */

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={cn("flex h-[18px] w-8 shrink-0 items-center rounded-full p-[2px] transition-colors", on ? "bg-sky-400" : "bg-slate-600")}>
      <span className={cn("size-[14px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform", on && "translate-x-[14px]")} />
    </span>
  );
}

function W3() {
  const rows: [typeof School, string, string][] = [
    [School, "School mode", "Pupils are never enrolled"],
    [EyeOff, "Blur faces in exports", "Applies to clips and stills"],
  ];
  return (
    <div className="w-full max-w-[330px] rounded-2xl border border-white/10 bg-[#0b1730] p-3.5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.9)]">
      <p className="text-[12.5px] font-semibold text-white">Privacy</p>
      <ul className="mt-2.5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-white/[0.025]">
        {rows.map(([Icon, t, d]) => (
          <li key={t} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/12 text-sky-200">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block text-[11px] font-semibold text-white">{t}</b>
              <span className="text-[9.5px] text-slate-400">{d}</span>
            </span>
            <span className="ml-auto">
              <Toggle on />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] text-slate-400">Blur on screen</p>
      <div className="mt-1 grid grid-cols-3 rounded-lg bg-white/[0.05] p-[3px] text-center text-[9.5px]">
        {["Everyone", "Known people", "Unknown people"].map((o, i) => (
          <span key={o} className={cn("rounded-md px-1 py-1.5", i === 1 ? "bg-sky-400 font-semibold text-sky-950 shadow-[0_2px_6px_-2px_rgba(56,189,248,0.6)]" : "text-slate-300")}>
            {o}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10.5px] text-slate-300">Keep footage</span>
        <span className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03]">
          <span className="flex size-6 items-center justify-center text-slate-400">
            <Minus className="size-3" />
          </span>
          <b className="min-w-[46px] text-center text-[11px] font-semibold text-white tabular-nums">14 days</b>
          <span className="flex size-6 items-center justify-center text-slate-400">
            <Plus className="size-3" />
          </span>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- W4 · weekly schedule */

function W4() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // a day column runs 00:00 → 24:00; the shift is 07:00 → 16:00 on weekdays
  const shiftTop = (7 / 24) * 100;
  const shiftH = (9 / 24) * 100;
  return (
    <div className="w-full max-w-[330px] rounded-2xl border border-white/10 bg-[#0b1730] p-3.5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200">
          <Clock className="size-3.5" />
        </span>
        <span className="text-[12.5px] font-semibold text-white">Schedule</span>
        <span className="ml-auto text-[10px] text-slate-400">Production hall</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {/* hour labels placed at their real position on the 92px day column (which starts below the day name) */}
        <div className="relative w-4 text-[8px] text-slate-500 tabular-nums">
          {[0, 7, 16, 24].map((h) => (
            <span key={h} className="absolute right-0 -translate-y-1/2" style={{ top: `calc(17px + ${(h / 24) * 92}px)` }}>
              {String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((d, i) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className="text-[8.5px] text-slate-400">{d}</span>
              <span className="relative h-[92px] w-full overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,rgba(129,140,248,0.16)_0_4px,rgba(129,140,248,0.06)_4px_8px)] ring-1 ring-indigo-300/10">
                {i < 5 && (
                  <span
                    className="absolute inset-x-0 rounded-[5px] bg-gradient-to-b from-amber-200 to-amber-300/80 shadow-[0_0_12px_-2px_rgba(252,211,77,0.5)]"
                    style={{ top: `${shiftTop}%`, height: `${shiftH}%` }}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9.5px] text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-amber-300" /> Shift: workers allowed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-indigo-400/40" /> After hours: alerts on
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/[0.08] px-2.5 py-1.5">
        <Lock className="size-3.5 shrink-0 text-red-300" />
        <span className="text-[10px] text-red-100">
          <b className="font-semibold">Storage room</b> · alerts at any hour
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- W5 · escalation ladder */

function W5() {
  const steps: [typeof ShieldCheck, string, string, string][] = [
    [ShieldCheck, "Night guard", "at once", "bg-sky-400/15 text-sky-200 ring-sky-400/40"],
    [Building2, "Security company", "after 3 min", "bg-indigo-400/15 text-indigo-200 ring-indigo-400/30"],
    [UserRound, "Principal", "after 10 min", "bg-slate-400/15 text-slate-200 ring-slate-400/30"],
  ];
  return (
    <div className="w-full max-w-[330px] rounded-2xl border border-white/10 bg-[#0b1730] p-3.5 shadow-[0_20px_44px_-24px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-200">
          <BellRing className="size-3.5" />
        </span>
        <span className="text-[12.5px] font-semibold text-white">Who is alerted</span>
      </div>
      <ol className="relative mt-3.5 flex flex-col gap-3">
        <span className="absolute top-4 bottom-4 left-[17px] w-px bg-gradient-to-b from-sky-400/60 via-indigo-400/40 to-slate-500/30" />
        <span className="m4w-travel absolute left-[14px] size-[7px] rounded-full bg-sky-300 shadow-[0_0_8px_2px_rgba(125,211,252,0.6)]" />
        {steps.map(([Icon, who, when, tone], i) => (
          <li key={who} className="relative flex items-center gap-2.5">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full ring-1", tone)}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block text-[11.5px] font-semibold text-white">{who}</b>
              <span className="text-[9.5px] text-slate-400">{i === 0 ? "Notified · waiting for an answer" : "If nobody answers"}</span>
            </span>
            <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-slate-200 tabular-nums">{when}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const MOCKS: Record<string, () => React.ReactElement> = { W1, W2, W3, W4, W5 };

export function WireframeV2() {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-sm text-neutral-300">
        Changes to the M3 wireframe. Each one says what it is based on; drafts are checked against the interview notes before they are built.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {m4Changes.map((c) => {
          const Mock = MOCKS[c.id];
          const [label, tone] = SOURCE[c.source];
          return (
            <article
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.015] shadow-[0_22px_48px_-30px_rgba(2,8,23,0.95)] transition duration-300 ease-out hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-[0_28px_56px_-28px_rgba(14,165,233,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="relative flex items-center justify-center overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(120%_80%_at_50%_0%,rgba(56,189,248,0.14),transparent_60%),linear-gradient(180deg,#0a1631,#070f1f)] px-4 py-7 md:h-[440px] md:py-5" aria-hidden>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(70%_70%_at_50%_45%,black,transparent)]" />
                <div className="relative w-full">
                  <div className="flex justify-center">{Mock && <Mock />}</div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span className="rounded-md bg-sky-400/10 px-1.5 py-0.5 font-mono text-[11px] text-sky-300">{c.id}</span>
                  <h3 className="text-base font-semibold text-white">{c.screen}</h3>
                  <span className={cn("ml-auto rounded-full border px-2.5 py-0.5 text-[11px] whitespace-nowrap", tone)}>{label}</span>
                </div>
                <p className="text-[15px] leading-relaxed text-neutral-100">{c.change}</p>
                <p className="mt-auto border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-neutral-400">
                  <span className="font-medium text-neutral-300">Why: </span>
                  {c.why}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
