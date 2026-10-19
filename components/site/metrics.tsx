"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Target } from "lucide-react";

import { RollingNumber } from "@/components/ui/rolling-number";
import { ContinuousTabs } from "@/components/watermelon/continuous-tabs";
import { measured, tracked } from "@/lib/content";
import { Section } from "./section";

/** A number that rolls up from zero the first time it scrolls into view. */
function AnimatedValue({ value, precision, suffix }: { value: number; precision: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <span ref={ref} className="tabular-nums">
      <RollingNumber value={inView ? value : 0} precision={precision} format={(n) => n.toFixed(precision)} />
      {suffix}
    </span>
  );
}

export function Metrics() {
  const [tab, setTab] = useState("measured");
  return (
    <Section
      id="metrics"
      eyebrow="Key metrics"
      title="Measured today, tracked tomorrow"
      lead="Product numbers come from the demo's own tests; business targets are our assumptions."
    >
      <div className="w-fit max-w-full">
      <ContinuousTabs
        tabs={[
          { id: "measured", label: "Measured today" },
          { id: "tracked", label: "We will track" },
        ]}
        defaultActiveId="measured"
        onChange={setTab}
      />
      </div>
      <div className="mt-5">
        <AnimatePresence mode="wait">
          {tab === "measured" ? (
            <motion.div
              key="measured"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {measured.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4">
                    <div className="text-3xl font-semibold tracking-tight text-white">
                      <AnimatedValue value={m.value} precision={m.precision} suffix={m.suffix} />
                    </div>
                    <p className="mt-2 text-sm leading-snug font-medium text-neutral-200">{m.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{m.note}</p>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                405-photo test and 3 video clips, Intel Core i7-13650HX laptop, no graphics card, 16 Oct 2026.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="tracked"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              {tracked.map((t) => (
                <div
                  key={t.label}
                  className="grid gap-1 border-b border-white/[0.06] px-4 py-3 last:border-0 sm:grid-cols-[1.3fr_0.7fr_1.4fr] sm:items-center sm:gap-6"
                >
                  <span className="font-medium text-white">{t.label}</span>
                  <span className="jet flex items-center gap-1.5 text-sm text-sky-300">
                    <Target className="size-4" /> {t.target}
                  </span>
                  <span className="text-sm text-neutral-400">{t.why}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Section>
  );
}
