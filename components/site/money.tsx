"use client";

import { motion } from "motion/react";
import { Cloud, Repeat, Wrench } from "lucide-react";

import ChangeablePricingSection from "@/components/watermelon/changeable-pricing-section";
import { costNote, costs, otherRevenue, plans } from "@/lib/content";
import { Section } from "./section";

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

export function Costs() {
  const total = costs.reduce((s, c) => s + c.amount, 0);
  const fixed = costs.filter((c) => c.kind === "Fixed").reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...costs.map((c) => c.amount));
  return (
    <Section
      id="costs"
      eyebrow="Cost structure"
      title={`About ${eur(Math.round(total / 1000) * 1000)} for the first year`}
      lead="People are most of the cost. Because recognition runs on the customer's PC, we pay almost nothing for servers as we grow."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { Icon: Wrench, value: eur(fixed), label: `Fixed costs (${Math.round((fixed / total) * 100)}%)` },
          { Icon: Repeat, value: eur(total - fixed), label: `Variable costs (${Math.round(((total - fixed) / total) * 100)}%)` },
          { Icon: Cloud, value: "≈ €0", label: "Cloud processing per camera" },
        ].map(({ Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <Icon className="size-5 text-sky-400" />
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
            <p className="text-muted-foreground mt-1 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 p-5 sm:p-6">
        <p className="mb-5 text-sm font-medium text-neutral-300">First-year estimate by category (EUR)</p>
        <ul className="flex flex-col gap-4">
          {costs.map((c, i) => (
            <li key={c.label} className="grid gap-1.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center sm:gap-5">
              <div>
                <p className="text-sm text-white">{c.label}</p>
                <p className="text-muted-foreground text-xs">
                  {c.kind} · {c.note}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-sky-400"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(c.amount / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: [0.2, 0, 0, 1] }}
                  />
                </div>
                <span className="jet w-20 shrink-0 text-right text-sm text-neutral-200 tabular-nums">{eur(c.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed">
          Estimate, not actual spend. {costNote}
        </p>
      </div>
    </Section>
  );
}

export function Revenue() {
  return (
    <Section
      id="revenue"
      eyebrow="Revenue streams"
      title="A monthly subscription per camera"
      lead="Recurring licence revenue is the core; setup, hardware and reports add one-time and add-on income. Prices are our proposal for the pilot phase."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr] lg:items-start">
        <ChangeablePricingSection
          title="Licence per camera"
          plans={plans.map((p) => ({ ...p, unit: p.priceMonthly === "Custom" ? "volume pricing" : undefined }))}
          defaultPlanId="business"
          defaultBillingCycle="monthly"
          monthlyLabel="Monthly"
          yearlyLabel="Yearly"
          unitLabel="per camera / month"
          footerText="Yearly billing saves about 20%."
          buttonText="Book a pilot"
          onContinue={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}
        />
        <div className="flex flex-col gap-3">
          {otherRevenue.map((r) => (
            <div key={r.title} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div>
                <p className="font-medium text-white">{r.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">{r.text}</p>
              </div>
              <span className="jet shrink-0 rounded-full bg-sky-400/10 px-2.5 py-1 text-xs whitespace-nowrap text-sky-300">{r.price}</span>
            </div>
          ))}
          <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] p-5">
            <p className="jet text-xs tracking-widest text-sky-300 uppercase">Example</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-200">
              A mall with 20 cameras on Business, billed yearly: 20 × €15 × 12 = <b className="text-white">€3,600 a year</b>,
              plus a one-time <b className="text-white">€1,000</b> setup and <b className="text-white">€588</b> for monthly
              reports.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
