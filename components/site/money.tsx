"use client";

import { motion } from "motion/react";

import ChangeablePricingSection from "@/components/watermelon/changeable-pricing-section";
import { costNote, costs, otherRevenue, plans } from "@/lib/content";
import { Section } from "./section";

const eur = (n: number) => `€${n.toLocaleString("en-US")}`;

/** Cost structure (left) and revenue streams (right) side by side. */
export function Money() {
  const total = costs.reduce((s, c) => s + c.amount, 0);
  const fixed = costs.filter((c) => c.kind === "Fixed").reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...costs.map((c) => c.amount));
  return (
    <Section
      id="money"
      eyebrow="Cost structure & revenue streams"
      title="Low running costs, revenue per camera"
      lead="People are most of the cost; recognition runs on the customer's PC, so servers cost almost nothing as we grow. Revenue is a monthly licence per camera plus setup, hardware and reports."
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-2xl border border-white/10 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-white">Costs, first year</p>
            <p className="text-2xl font-semibold text-white">≈ {eur(Math.round(total / 1000) * 1000)}</p>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Fixed {eur(fixed)} ({Math.round((fixed / total) * 100)}%) · Variable {eur(total - fixed)} · Cloud per camera ≈ €0
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {costs.map((c, i) => (
              <li key={c.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-neutral-200">
                    {c.label} <span className="text-neutral-500">· {c.kind}</span>
                  </span>
                  <span className="jet shrink-0 text-neutral-200 tabular-nums">{eur(c.amount)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-sky-400"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(c.amount / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.08, ease: [0.2, 0, 0, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-xs leading-relaxed">Estimate, not actual spend. {costNote}</p>
        </div>

        <div className="flex flex-col gap-3">
          <ChangeablePricingSection
            title="Licence per camera"
            plans={plans.map((p) => ({ ...p, unit: p.priceMonthly === "Custom" ? "volume pricing" : undefined }))}
            defaultPlanId="business"
            unitLabel="per camera / month"
            footerText="Yearly billing saves about 20%."
            buttonText="Book a pilot"
            onContinue={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}
          />
          <ul className="grid gap-2 sm:grid-cols-3 lg:max-w-[520px]">
            {otherRevenue.map((r) => (
              <li key={r.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-sm font-medium text-white">{r.title}</p>
                <p className="jet mt-1 text-xs text-sky-300">{r.price}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
