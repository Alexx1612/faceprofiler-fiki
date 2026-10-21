"use client";

import { Target } from "lucide-react";

import { measured, tracked } from "@/lib/content";

/**
 * The value as text. These tiles sit above the fold, so they render their real value at once
 * (an animation from zero would show "0.0%" in previews and screenshots).
 */
function AnimatedValue({ value, precision, suffix }: { value: number; precision: number; suffix: string }) {
  return (
    <span className="tabular-nums">
      {value.toFixed(precision)}
      {suffix}
    </span>
  );
}

/** Key metrics strip: what the demo measures today (shown under the hero video). */
export function MetricsStrip() {
  return (
    <div id="metrics" className="scroll-mt-24">
      <div className="grid grid-cols-3 gap-1.5">
        {measured.map((m) => (
          <div key={m.label} className="rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur">
            <div className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              <AnimatedValue value={m.value} precision={m.precision} suffix={m.suffix} />
            </div>
            <p className="text-[11px] leading-tight font-medium text-neutral-200">{m.label}</p>
            <p className="text-[10px] leading-tight text-neutral-500">{m.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-neutral-500">Key metrics, measured: 405-photo test and 3 clips, laptop CPU, no graphics card, 16 Oct 2026.</p>
    </div>
  );
}

/** Business targets tracked from the first pilot. */
export function TrackedTargets() {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tracked.map((t) => (
        <li key={t.label} title={t.why} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
          <Target className="size-3 text-sky-400" /> {t.label}: <span className="jet text-sky-300">{t.target}</span>
        </li>
      ))}
    </ul>
  );
}
