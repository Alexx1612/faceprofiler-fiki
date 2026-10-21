"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleDashed, Wrench, Zap } from "lucide-react";

import { ContinuousTabs } from "@/components/watermelon/continuous-tabs";
import { components, forecast, lifetimes, mallReport, mallStatus, neuro, neuroWhy, type Status } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Columns, ForecastChart, HBars, Ranges } from "./charts";
import { Section } from "./section";
import { TabHint } from "./tab-hint";

const box = "rounded-2xl border border-white/10 bg-white/[0.02] p-4";
const h4 = "mb-2 text-sm font-semibold text-white";
const tag = "jet ml-2 rounded-full border border-amber-300/30 px-1.5 py-px text-[10px] font-normal text-amber-200 uppercase";

const statusStyle: Record<Status, { box: string; dot: string; label: string }> = {
  Current: { box: "border-emerald-400/25", dot: "bg-emerald-400", label: "Working today" },
  Partial: { box: "border-amber-400/25", dot: "bg-amber-400", label: "Partly built" },
  Next: { box: "border-white/10", dot: "bg-neutral-500", label: "Next" },
};

function Components() {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {(["Current", "Partial", "Next"] as Status[]).map((s) => {
          const items = components.filter((c) => c.status === s);
          return (
            <div key={s} className={cn("rounded-2xl border bg-white/[0.02] p-4", statusStyle[s].box)}>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <span className={cn("size-2 rounded-full", statusStyle[s].dot)} />
                {statusStyle[s].label}
                <span className="ml-auto text-xs text-neutral-500">{items.length}</span>
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {items.map((c) => (
                  <li key={c.name} title={c.text} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-200">
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Hover a component for details. EU: face checks need consent or another legal basis (GDPR); the AI Act bans emotion recognition in
        workplaces and schools and face databases scraped from the internet.
      </p>
    </div>
  );
}

function Neuro() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className={box}>
        <p className={h4}>Why neuromorphic (SNN, liquid networks)</p>
        <ul className="flex flex-col gap-2 text-sm text-neutral-300">
          {neuroWhy.map((w) => (
            <li key={w} className="flex gap-2">
              <Zap className="mt-0.5 size-4 shrink-0 text-sky-400" /> {w}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          Spiking neural networks (SNN) compute with short pulses, like neurons; liquid networks (LNN, CfC) are small recurrent networks whose
          time constants adapt to the input.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {neuro.map((n) => (
          <div key={n.idea} className="grid gap-0.5 border-b border-white/[0.06] px-4 py-2.5 last:border-0 sm:grid-cols-[0.9fr_1.4fr] sm:gap-4">
            <p className="text-sm font-medium text-white">{n.idea}</p>
            <p className="text-sm text-neutral-300">
              {n.result} <span className="text-xs text-neutral-500">· {n.where}</span>
            </p>
          </div>
        ))}
        <p className="bg-white/[0.02] px-4 py-2 text-[11px] text-neutral-500">
          Measured in the team&apos;s neuromorphic lessons on real datasets; energy figures are 45 nm per-operation estimates, not measured on a
          chip.
        </p>
      </div>
    </div>
  );
}

function Mall() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_1fr]">
      <div className={box}>
        <p className={h4}>Mall analytics: status</p>
        <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
          {mallStatus.done.map((d) => (
            <li key={d} className="flex gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" /> {d}
            </li>
          ))}
          {mallStatus.building.map((d) => (
            <li key={d} className="flex gap-2 text-neutral-400">
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <span>
                {d} <span className="text-xs whitespace-nowrap text-amber-300/80">· in progress</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={box}>
        <p className={h4}>
          Visitors per hour, Saturday <span className={tag}>Sample report</span>
        </p>
        <Columns labels={mallReport.hours} values={mallReport.footfall} unit="visitors" caption="Illustrative data · hover an hour" />
        <p className="mt-2 rounded-xl bg-sky-400/[0.07] p-2.5 text-xs leading-snug text-neutral-200">
          <b className="text-sky-300">LLM insight:</b> {mallReport.insight}
        </p>
      </div>
      <div className={box}>
        <p className={h4}>
          Average stay per zone <span className={tag}>Sample</span>
        </p>
        <HBars items={mallReport.zones.map((z) => ({ label: z.zone, value: z.minutes }))} max={20} suffix=" min" caption="Illustrative data · minutes" />
        <p className="mt-2 text-xs text-neutral-500">The report generator turns these charts into a weekly PDF with written insight.</p>
      </div>
    </div>
  );
}

function Forecasts() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className={box}>
        <p className={h4}>
          Weekly visitors, observed and forecast <span className={tag}>Illustrative</span>
        </p>
        <ForecastChart observed={forecast.observed} predicted={forecast.predicted} band={forecast.band} unit="thousands" caption="12 weeks observed, 4 forecast (±6% band) · hover a week" />
        <p className="mt-2 text-xs text-neutral-500">
          A spiking reservoir or liquid (CfC) network on the edge PC learns the weekly rhythm from the camera counts, at nanojoules per value.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {forecast.examples.map((e) => (
          <div key={e.title} className={cn(box, "p-3")}>
            <p className="text-sm font-semibold text-white">{e.title}</p>
            <p className="mt-1 text-xs leading-snug text-neutral-400">{e.text}</p>
          </div>
        ))}
        <p className="col-span-2 text-[11px] text-neutral-500">Conversion and basket values are assumptions for the example.</p>
      </div>
    </div>
  );
}

function Lifetime() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <p className={h4}>Typical service life of a camera system</p>
        <Ranges items={lifetimes} maxYears={10} caption="Approximate ranges, years · hover a part" />
      </div>
      <div className={box}>
        <p className={h4}>
          <Wrench className="mr-1.5 inline size-4 text-sky-400" />
          Predictive maintenance
        </p>
        <ul className="flex flex-col gap-2 text-sm text-neutral-300">
          <li>Each camera will report image sharpness, frame drops and disk health every day.</li>
          <li>A remaining-life model, the same method as the team&apos;s spiking turbofan-engine lesson, estimates the days each part has left.</li>
          <li>
            Below 30 days the site will get a warning: <i className="text-neutral-400">&quot;Disk in recorder 2: replace within 3 weeks&quot;</i>, so
            recordings are never lost.
          </li>
        </ul>
        <p className="mt-2 text-xs text-neutral-500">Status: method proven on public engine data; camera version is next.</p>
      </div>
    </div>
  );
}

const TABS = [
  { id: "components", label: "Components", el: <Components /> },
  { id: "neuro", label: "Neuromorphic edge", el: <Neuro /> },
  { id: "mall", label: "Mall analytics", el: <Mall /> },
  { id: "forecast", label: "Forecasts", el: <Forecasts /> },
  { id: "lifetime", label: "System lifetime", el: <Lifetime /> },
];

/** Technology, roadmap and the analytics that buyers see, as Watermelon tabs. */
export function Technology() {
  const [tab, setTab] = useState(TABS[0].id);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <Section
      id="technology"
      eyebrow="Technology & roadmap"
      title="What works today, and what comes next"
      lead={`${components.length} components, a low-power neuromorphic edge, and the reports and forecasts a mall manager reads.`}
    >
      <p className="mb-2">
        <TabHint text="5 tabs: click or swipe to open the next one" />
      </p>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="w-max">
          <ContinuousTabs tabs={TABS.map(({ id, label }) => ({ id, label }))} defaultActiveId={TABS[0].id} onChange={setTab} />
        </div>
      </div>
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {current.el}
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  );
}
