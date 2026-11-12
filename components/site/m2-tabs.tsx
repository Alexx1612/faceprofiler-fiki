"use client";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { m2Insights, m2Interviews, m2Plan, m2Problem, m2Questions, m2Ready, m2Solution } from "@/lib/m2";
import { M2Form } from "./m2-form";
import { NextArrow, TabHint, TabLabel } from "./tab-hint";

const box = "rounded-2xl border border-white/10 bg-white/[0.02] p-4";
const h4 = "mb-2 text-sm font-semibold text-white";

function ProblemIdea() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={box}>
        <p className={h4}>How we identified the problem</p>
        <p className="text-sm text-neutral-300">{m2Problem.observed}</p>
        <p className="mt-2 text-sm text-neutral-400">
          <b className="text-white">What we had to find out:</b> {m2Problem.question}
        </p>
      </div>
      <div className={box}>
        <p className={h4}>What we thought would solve it</p>
        <p className="text-sm text-neutral-300">{m2Solution.idea}</p>
        <p className="mt-2 text-sm text-neutral-400">{m2Solution.caveat}</p>
      </div>
    </div>
  );
}

function Plan() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {m2Plan.map((p, i) => (
        <li key={p.step} className={box}>
          <p className="jet text-xs text-sky-400">0{i + 1}</p>
          <p className="mt-1 font-semibold text-white">{p.step}</p>
          <p className="mt-1 text-sm text-neutral-400">{p.text}</p>
        </li>
      ))}
    </ol>
  );
}

function Interviews() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className={box}>
        <p className={h4}>Segment and place</p>
        <p className="text-sm text-neutral-400">{m2Interviews.where}</p>
      </div>
      <div className={box}>
        <p className={h4}>People interviewed</p>
        <ul className="flex flex-col gap-1 text-sm text-neutral-400">
          {m2Interviews.who.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      </div>
      <div className={box}>
        <p className={h4}>Method</p>
        <p className="text-sm text-neutral-400">{m2Interviews.how}</p>
      </div>
      <p className="text-sm text-neutral-400 md:col-span-3">{m2Interviews.why}</p>
    </div>
  );
}

function Questions() {
  return (
    <div>
      <p className="mb-3 text-sm text-neutral-400">
        Our first draft was short and closed, so it was easy to answer &quot;no, everything is fine&quot;. We rewrote every question to ask about real past events, and added a question about who responds at night.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["Day", "Night"] as const).map((t) => (
          <div key={t} className={`${box} ${t === "Day" ? "border-amber-300/20" : "border-indigo-300/20"}`}>
            <p className={`mb-3 text-xs font-semibold tracking-wider uppercase ${t === "Day" ? "text-amber-300" : "text-indigo-300"}`}>
              {t === "Day" ? "☀ During the day" : "☾ At night"}
            </p>
            <ol className="flex flex-col gap-3">
              {m2Questions.map((q, i) =>
                q.time === t ? (
                  <li key={i} className="text-sm">
                    <p className="text-neutral-400 line-through decoration-red-400/50">
                      {i + 1}. {q.draft}
                    </p>
                    <p className="text-neutral-100">
                      → {q.improved}
                      {q.isNew && <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300 uppercase">new</span>}
                    </p>
                  </li>
                ) : null
              )}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-400">Struck through: first draft (weak). Arrow: the improved question we used.</p>
    </div>
  );
}

function Insights() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {m2Insights.map((x) => (
        <div key={x.title} className={box}>
          <p className={h4}>{x.title}</p>
          <p className="text-sm text-neutral-400">{x.text}</p>
        </div>
      ))}
    </div>
  );
}

function Ready() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-white">{m2Ready.verdict}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className={box}>
          <p className="mb-2 text-sm font-semibold text-emerald-300">What we already have</p>
          <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
            {m2Ready.forReasons.map((r) => (
              <li key={r}>✓ {r}</li>
            ))}
          </ul>
        </div>
        <div className={box}>
          <p className="mb-2 text-sm font-semibold text-amber-300">Why we are not 100% sure yet</p>
          <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
            {m2Ready.againstReasons.map((r) => (
              <li key={r}>! {r}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="rounded-xl border border-sky-300/15 bg-sky-400/[0.07] p-3 text-sm text-white">{m2Ready.next}</p>
    </div>
  );
}

const TABS = [
  { label: "Problem & idea", el: <ProblemIdea /> },
  { label: "Plan", el: <Plan /> },
  { label: "Interviews", el: <Interviews /> },
  { label: "Questions", el: <Questions /> },
  { label: "Insights", el: <Insights /> },
  { label: "Next stage", el: <Ready /> },
  { label: "Questionnaire", el: <M2Form /> },
];

export const M2Hint = () => <TabHint text={`${TABS.length} tabs: click or swipe to open the next one`} />;

/** Milestone 2 content as numbered tabs, same style as the home page's business fundamentals. */
export function M2Tabs() {
  return (
    <DirectionAwareTabs
      tabs={TABS.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
      trailing={(next) => <NextArrow onClick={next} />}
      className="max-w-full min-w-0 justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] lg:[mask-image:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
    />
  );
}
