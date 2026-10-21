"use client";

import { Building2, Camera, Check, Cpu, EyeOff, Minus, ShieldCheck, UserPlus, X } from "lucide-react";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import ChangeablePricingSection from "@/components/watermelon/changeable-pricing-section";
import {
  advantages,
  channels,
  competitors,
  costNote,
  costs,
  hypotheses,
  interviews,
  lifetimeCost,
  lifetimeCostNote,
  ltv,
  matrix,
  operations,
  otherRevenue,
  plans,
  segments,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { HBars, MultiLine } from "./charts";
import { TrackedTargets } from "./metrics";
import { Section } from "./section";
import { TabHint } from "./tab-hint";

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;
const box = "rounded-2xl border border-white/10 bg-white/[0.02] p-4";
const h4 = "mb-2 text-sm font-semibold text-white";

function Customers() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {segments.map((s) => (
        <div key={s.label} className={box}>
          <p className="font-semibold text-white">{s.label}</p>
          <p className="text-xs text-neutral-500">{s.who}</p>
          <p className="mt-2 text-sm text-neutral-300">
            <span className="text-red-300">Pain:</span> {s.pain}
          </p>
          <p className="mt-1 text-sm text-neutral-300">
            <span className="text-emerald-300">Gets:</span> {s.gets}
          </p>
          <p className="mt-2 text-xs text-neutral-400">Signs: {s.buyer}</p>
        </div>
      ))}
    </div>
  );
}

function Validation() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className={box}>
        <p className={h4}>What customers told us</p>
        <HBars labelAbove items={interviews.map((i) => ({ label: i.label, value: i.value, detail: i.detail }))} max={100} suffix="%" caption="Share who said yes (hover a bar)" />
        <p className="mt-2 text-xs text-neutral-400">7 of 10 teachers · 2 of 5 elderly-care places · 80% of camera sites asked.</p>
      </div>
      <div className={box}>
        <p className={h4}>Build, measure, learn: the next tests</p>
        <ul className="flex flex-col gap-3">
          {hypotheses.map((h) => (
            <li key={h.h} className="text-sm">
              <p className="text-neutral-100">{h.h}</p>
              <p className="text-xs text-neutral-400">
                <span className="text-sky-300">{h.evidence}</span> → {h.next}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">One or two hypotheses at a time, so each result is clear.</p>
      </div>
    </div>
  );
}

function Channels() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {channels.map((c, i) => (
        <div key={c.title} className={box}>
          <p className="jet text-xs text-sky-400">0{i + 1}</p>
          <p className="mt-1 font-semibold text-white">{c.title}</p>
          <p className="mt-1 text-sm text-neutral-400">{c.text}</p>
        </div>
      ))}
    </div>
  );
}

const cell = {
  yes: { Icon: Check, cls: "bg-emerald-400/15 text-emerald-300", label: "Yes" },
  partial: { Icon: Minus, cls: "bg-amber-400/15 text-amber-300", label: "Partly" },
  no: { Icon: X, cls: "bg-white/5 text-neutral-500", label: "No" },
};
const advantageIcons = [Camera, Building2, UserPlus, EyeOff, Cpu, ShieldCheck];

function Competition() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="sticky left-0 z-10 bg-[#11151d] p-2.5 text-left font-medium text-neutral-400 sm:bg-transparent">What a small site needs</th>
                {matrix.columns.map((col, i) => (
                  <th key={col} title={i > 0 ? competitors[i - 1].kind : undefined} className={cn("p-2.5 text-center font-medium", i === 0 ? "text-sky-300" : "text-neutral-200")}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                  <td className="sticky left-0 z-10 w-36 bg-[#0d1118] px-2.5 py-1.5 text-neutral-300 sm:w-auto sm:bg-transparent">{row.label}</td>
                  {row.values.map((v, i) => {
                    const { Icon, cls, label } = cell[v];
                    return (
                      <td key={i} className={cn("px-2.5 py-1.5 text-center", i === 0 && "bg-sky-400/[0.05]")}>
                        <span className={cn("inline-flex size-5 items-center justify-center rounded-full", cls)} title={label}>
                          <Icon className="size-3" aria-label={label} />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          <span className="sm:hidden">Swipe the table sideways. </span>Our assessment from each vendor&apos;s public product pages, Oct 2026. The other
          competitor is &quot;doing nothing&quot;.
        </p>
      </div>
      <div>
        <p className={h4}>Our unique selling points</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {advantages.map((a, i) => {
            const Icon = advantageIcons[i];
            return (
              <li key={a.title} className="flex gap-2 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-sky-400" />
                <span>
                  <b className="font-medium text-white">{a.title}.</b> <span className="text-neutral-400">{a.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Operations() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { title: "Built in-house (core value)", items: operations.inHouse, tone: "text-sky-300" },
        { title: "Partners and outsourced", items: operations.partners, tone: "text-neutral-400" },
      ].map((g) => (
        <div key={g.title} className={box}>
          <p className={h4}>{g.title}</p>
          <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
            {g.items.map((it) => (
              <li key={it} className="flex gap-2">
                <span className={cn("mt-2 size-1.5 shrink-0 rounded-full bg-current", g.tone)} /> {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BusinessModel() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,520px)_1fr] lg:items-start">
      <ChangeablePricingSection
        title="Licence per camera, monthly subscription"
        plans={plans.map((p) => ({ ...p, unit: p.priceMonthly === "Custom" ? "volume pricing" : undefined }))}
        defaultPlanId="business"
        unitLabel="per camera / month"
        footerText="Yearly billing saves about 20%."
        buttonText="Book a demo"
        onContinue={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}
      />
      <div className="flex flex-col gap-2">
        <p className={h4}>Other revenue</p>
        {otherRevenue.map((r) => (
          <div key={r.title} className={cn(box, "flex items-start justify-between gap-3 p-3")}>
            <div>
              <p className="text-sm font-medium text-white">{r.title}</p>
              <p className="text-xs text-neutral-400">{r.text}</p>
            </div>
            <span className="jet shrink-0 rounded-full bg-sky-400/10 px-2 py-0.5 text-xs whitespace-nowrap text-sky-300">{r.price}</span>
          </div>
        ))}
        <p className="text-xs text-neutral-500">Prices are our proposal for the pilot phase.</p>
      </div>
    </div>
  );
}

function Financials() {
  const total = costs.reduce((s, c) => s + c.amount, 0);
  const fixed = costs.filter((c) => c.kind === "Fixed").reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...costs.map((c) => c.amount));
  const value = ltv.lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={box}>
        <div className="flex items-baseline justify-between">
          <p className={h4}>Costs, first year</p>
          <p className="text-lg font-semibold text-white">≈ {eur(Math.round(total / 1000) * 1000)}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {costs.map((c) => (
            <li key={c.label}>
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-neutral-300">
                  {c.label} <span className="text-neutral-500">· {c.kind}</span>
                </span>
                <span className="jet text-neutral-200">{eur(c.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-[#3987e5]" style={{ width: `${(c.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Fixed {Math.round((fixed / total) * 100)}%. Estimate, not actual spend. {costNote}
        </p>
      </div>
      <div className={box}>
        <p className={h4}>One customer over its life</p>
        <ul className="flex flex-col gap-1.5 text-xs text-neutral-300">
          {ltv.lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-2">
              <span>{l.label}</span>
              <span className="jet shrink-0">{eur(l.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["Lifetime value", eur(value)],
            ["Cost to win", eur(ltv.cac)],
            ["LTV / CAC", `${(value / ltv.cac).toFixed(1)}×`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[0.04] p-2">
              <p className="text-base font-semibold text-white">{v}</p>
              <p className="text-[10px] text-neutral-400">{k}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Assumptions: a 20-camera mall on Business, 5-year life. {ltv.cacNote}</p>
      </div>
      <div className={box}>
        <p className={h4}>7-year cost for a 20-camera mall</p>
        <MultiLine x={lifetimeCost.years} series={lifetimeCost.series} caption="Illustrative · hover a year" />
        <p className="mt-1 text-[11px] leading-snug text-neutral-500">{lifetimeCostNote}</p>
      </div>
      <div className="lg:col-span-3">
        <p className={h4}>Targets we track from the first pilot</p>
        <TrackedTargets />
      </div>
    </div>
  );
}

const TABS = [
  { label: "① Customers", el: <Customers /> },
  { label: "② Interviews", el: <Validation /> },
  { label: "③ Channels", el: <Channels /> },
  { label: "④ Competition & USP", el: <Competition /> },
  { label: "⑤ Operations", el: <Operations /> },
  { label: "⑥ Business model", el: <BusinessModel /> },
  { label: "⑦ Financials", el: <Financials /> },
];

/** Business fundamentals as numbered tabs (customer, validation, channels, competition, operations, model, financials). */
export function Fundamentals() {
  return (
    <Section
      id="business"
      eyebrow="Business fundamentals"
      title="Who buys, why, and how it pays"
      lead={<TabHint text="7 tabs: click or swipe to open the next one" />}
    >
      <DirectionAwareTabs
        tabs={TABS.map((t, i) => ({ id: i, label: t.label, content: <div className="mt-4 text-left">{t.el}</div> }))}
        className="max-w-full justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
      />
    </Section>
  );
}
