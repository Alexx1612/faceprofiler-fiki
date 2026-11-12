"use client";

import { useState } from "react";

import { asset } from "@/lib/content";

/**
 * "How it works" as a ruled list beside one pane (Hallmark Dusk "tour" range).
 * The first step is open in the static HTML, so the section reads with scripting off.
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
        <video src={asset("/clips/46446.mp4")} poster={asset("/clips/46446.jpg")} autoPlay muted loop playsInline aria-label="Our demo naming three people as they walk past a camera" />
        <p className="lp-pane__caption">Our demo on a stock clip. The names are fictional.</p>
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

export function Tour() {
  const [step, setStep] = useState(0);
  return (
    <div className="lp-split">
      <ol className="lp-tour">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button type="button" aria-pressed={step === i} onClick={() => setStep(i)}>
              <span className="lp-tour__dot" aria-hidden="true" />
              <span className="lp-tour__title">{s.title}</span>
              <span className="lp-tour__text">{s.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <Pane step={step} />
    </div>
  );
}
