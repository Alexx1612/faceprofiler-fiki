"use client";

import { MousePointer2, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { asset } from "@/lib/content";

import { AppFrame } from "./app-frame";

/**
 * "How it works" as a ruled list beside one pane (Hallmark Dusk "tour" range).
 * The first step is open in the static HTML, so the section reads with scripting off; with
 * scripting on, the steps play through by themselves.
 */

const steps = [
  { title: "Enrol", text: "Add one or two photos of each staff member and student. Only they are ever named." },
  { title: "Watch", text: "Nau-ino reads the cameras you already have. Every face is found, followed and compared." },
  { title: "Flag", text: "At night, a face nobody enrolled is flagged on the screen the moment it appears." },
  { title: "Report", text: "Each morning, a short written summary of the night, with the moments behind it." },
];

const people = [
  ["I", "Ion Marin", "Night guard"],
  ["A", "Ana Pop", "Cleaning staff"],
  ["E", "Elena Dobre", "Deputy head"],
];

function Pane({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="lp-glass lp-pane" key="enrol">
        <ul className="lp-rows">
          {people.map(([i, name, role]) => (
            <li key={name} className="lp-row">
              <span className="lp-initial">{i}</span>
              <span>
                <span className="lp-row__name">{name}</span>
                <br />
                <span className="lp-row__place">{role}</span>
              </span>
              <span className="lp-row__status">2 photos</span>
            </li>
          ))}
        </ul>
        <p className="lp-pane__caption">Sample list. Names are fictional.</p>
      </div>
    );
  if (step === 1)
    return (
      <div className="lp-glass lp-pane" key="watch">
        <div className="lp-cam">
          <video src={asset("/clips/46446.mp4")} poster={asset("/clips/46446.jpg")} autoPlay muted loop playsInline aria-label="Our demo naming three people as they walk past a camera" />
          <span className="lp-cam__badge lp-cam__badge--left">LIVE · Courtyard camera</span>
          <span className="lp-cam__badge lp-cam__badge--right">
            <span className="lp-cam__rec" aria-hidden="true" />
            REC
          </span>
        </div>
        <div className="lp-cam__stats">
          <span>
            <b>Green</b> enrolled, named
          </span>
          <span>
            <b>Red</b> Unknown_N, a stranger
          </span>
          <span>
            <b>track #</b> follows each person
          </span>
        </div>
        <p className="lp-pane__caption">Our demo app on a stock clip, with its own overlays. The names are fictional.</p>
      </div>
    );
  if (step === 2)
    return (
      <div className="lp-glass lp-pane" key="flag">
        <ul className="lp-rows">
          <li className="lp-row lp-row--open">
            <span className="lp-initial">?</span>
            <span>
              <span className="lp-row__name">Unknown_1</span>
              <br />
              <span className="lp-row__place">Side gate, then corridor B</span>
            </span>
            <span className="lp-row__status">
              <span className="lp-dot" aria-hidden="true" />
              02:17
            </span>
          </li>
        </ul>
        <div className="lp-open">
          Not in the school&apos;s list of people
          <b>Review</b>
        </div>
        <p className="lp-pane__caption">Sample alert.</p>
      </div>
    );
  return (
    <div className="lp-well lp-pane" key="report">
      <div className="lp-well__card">
        <h3>Night report, Tuesday</h3>
        <p>Written at 07:00 from the night&apos;s events</p>
        <p>
          <strong>A stranger came in at 02:17.</strong> One person who is not enrolled entered through the side gate and left at 02:24. The guard was
          alerted at 02:18 and sent to the gate. Otherwise as usual: the guard did three rounds and cleaning staff left at 23:05.
        </p>
      </div>
      <p className="lp-pane__caption" style={{ color: "var(--color-well-muted)" }}>
        Sample report.
      </p>
    </div>
  );
}

const STEP_MS = 6500;
const screens = ["People", "Live · Courtyard", "Alert", "Reports"];

/**
 * Plays itself like the M3 night scenario, on a loop: each step stays for STEP_MS while its bar fills;
 * in the Flag step a cursor clicks Review; near the end of each step the cursor glides to the next
 * step in the list and clicks it (a ripple), and that step opens with a flash. Choosing a step
 * yourself stops the autoplay; the button restarts it. Visitors who prefer reduced motion get the
 * manual version (first step open, no autoplay, no cursor).
 */
export function Tour() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number; click: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true);
  }, []);
  useEffect(() => {
    if (!auto) {
      setCursor(null);
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    /** Moves the cursor to the middle of an element inside the tour, then clicks after `delay`. */
    const point = (sel: string, delay: number) => {
      const box = wrap.current, el = box?.querySelector<HTMLElement>(sel);
      if (!box || !el) return;
      const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
      setCursor((c) => ({ x: r.left - b.left + Math.min(r.width / 2, 120), y: r.top - b.top + r.height / 2, click: c?.click ?? 0 }));
      at(delay, () => setCursor((c) => c && { ...c, click: c.click + 1 }));
    };
    const next = (step + 1) % steps.length;
    if (step === 2) at(1800, () => point(".lp-tour__stage .lp-open b", 900)); // click Review in the alert
    at(STEP_MS - 1700, () => point(`.lp-tour li:nth-child(${next + 1}) button`, 1000));
    at(STEP_MS, () => setStep(next));
    return () => timers.forEach(clearTimeout);
  }, [auto, step]);
  return (
    <div className="lp-split lp-tourwrap" ref={wrap}>
      {cursor && (
        <span className="lp-cursor" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">
          {cursor.click > 0 && <span key={cursor.click} className="lp-cursor__ripple" />}
          <MousePointer2 />
        </span>
      )}
      <div>
        <ol className="lp-tour">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                aria-pressed={step === i}
                onClick={() => {
                  setAuto(false);
                  setStep(i);
                }}
              >
                <span className="lp-tour__dot" aria-hidden="true" />
                <span className="lp-tour__title">
                  <span className="lp-tour__n">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </span>
                <span className="lp-tour__text">{s.text}</span>
                {auto && step === i && <span key={`bar-${step}`} className="lp-tour__bar" style={{ animationDuration: `${STEP_MS}ms` }} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="lp-tour__play" onClick={() => setAuto((a) => !a)}>
          {auto ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {auto ? "Pause the walk-through" : "Play the walk-through"}
        </button>
      </div>
      <div key={step} className="lp-tour__stage">
        <AppFrame screen={screens[step]}>
          <Pane step={step} />
        </AppFrame>
      </div>
    </div>
  );
}
