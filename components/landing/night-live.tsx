"use client";

import { Check, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { AppFrame } from "./app-frame";

/**
 * Hero panel: last night at the school, played back the way the M3 night scenario plays.
 *
 * Methodology: a clock runs from 21:00 to 07:00 in about 16 seconds; each event slides into the list
 * when the clock passes its time; when the stranger appears at 02:17 the panel flashes and the alert
 * opens. After the night it holds for a moment and starts again. The server-rendered HTML and
 * visitors who prefer reduced motion get the finished night (every row, alert open), so the panel
 * reads without scripting. Names are fictional.
 */

const night = [
  { i: "I", name: "Ion, night guard", place: "Main entrance", time: "21:58" },
  { i: "A", name: "Ana, cleaning staff", place: "Corridor B", time: "22:30" },
  { i: "I", name: "Ion, night guard", place: "Gym door", time: "00:12" },
];
const STRANGER = "02:17";
const START = 21 * 60; // 21:00
const SPAN = 10 * 60; // to 07:00
const RUN_MS = 16000;
const HOLD_MS = 4500;

/** Minutes since 21:00 for a clock time (after midnight counts on). */
const offset = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return ((h * 60 + m - START + 1440) % 1440);
};
const fmt = (min: number) => {
  const t = (START + Math.floor(min)) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export function NightLive() {
  const [now, setNow] = useState<number | null>(null); // minutes since 21:00; null = finished (static)
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setNow(0);
  }, []);
  useEffect(() => {
    if (now === null || paused) return;
    const step = 100;
    const id = window.setTimeout(() => {
      setNow((n) => {
        if (n === null) return n;
        const next = n + (SPAN * step) / RUN_MS;
        return next > SPAN + (SPAN * HOLD_MS) / RUN_MS ? 0 : next;
      });
    }, step);
    return () => window.clearTimeout(id);
  }, [now, paused]);

  const t = now ?? SPAN;
  const shown = night.filter((r) => offset(r.time) <= t);
  const stranger = offset(STRANGER) <= t;
  const live = now !== null && now <= SPAN;
  const progress = Math.min(1, t / SPAN);

  return (
    <AppFrame screen={live ? "Live" : "Reports"} className={`lp-live${stranger && live ? " lp-live--alert" : ""}`}>
    <div aria-label="Sample night report as the console shows it">
      <div className="lp-night__head">
        <div>
          <p className="lp-night__title">{live ? "Tonight, as it happens" : "Last night's report"}</p>
          <p className="lp-night__sub">Everyone your 6 cameras saw, 21:00 to 07:00</p>
        </div>
        {stranger ? <span className="lp-chip lp-chip--alert">1 stranger</span> : <span className="lp-chip">All named</span>}
      </div>

      {now !== null && (
        <div className="lp-live__clock">
          <span className="lp-live__time" aria-live="off">
            {live && <span className="lp-live__rec" aria-hidden="true" />}
            {fmt(Math.min(t, SPAN))}
          </span>
          <span className="lp-live__bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
            <i style={{ left: `${(offset(STRANGER) / SPAN) * 100}%` }} />
          </span>
          <button type="button" className="lp-live__btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play the night" : "Pause the night"}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        </div>
      )}

      <p className="lp-night__sum">
        {stranger
          ? "Staff seen 3 times, all named. 1 stranger, flagged the moment they appeared."
          : shown.length
            ? `Staff seen ${shown.length} ${shown.length === 1 ? "time" : "times"}, all named. Nothing unusual so far.`
            : "Cameras watching. Nobody seen yet."}
      </p>
      <ul className="lp-rows">
        {shown.map((r) => (
          <li key={r.time} className="lp-row">
            <span className="lp-initial">{r.i}</span>
            <span>
              <span className="lp-row__name">{r.name}</span>
              <br />
              <span className="lp-row__place">{r.place}</span>
            </span>
            <span className="lp-row__status">
              <Check aria-hidden="true" strokeWidth={2.4} />
              {r.time}
            </span>
          </li>
        ))}
        {stranger && (
          <li className="lp-row lp-row--open">
            <span className="lp-initial">?</span>
            <span>
              <span className="lp-row__name">Unknown_1</span>
              <br />
              <span className="lp-row__place">Side gate</span>
            </span>
            <span className="lp-row__status">
              <span className="lp-dot" aria-hidden="true" />
              {STRANGER}
            </span>
          </li>
        )}
      </ul>
      {stranger && (
        <div className="lp-open">
          An adult nobody enrolled, at the side gate
          <b>Review</b>
        </div>
      )}
      <p className="lp-night__foot">Sample night, fictional names.</p>
    </div>
    </AppFrame>
  );
}
