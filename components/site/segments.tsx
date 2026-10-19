"use client";

import { Briefcase, Frown, Gift, Users } from "lucide-react";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { segments } from "@/lib/content";
import { Section } from "./section";

/** Customer segments as Cult UI direction-aware tabs: one panel per segment. */
export function Segments() {
  const tabs = segments.map((s, i) => ({
    id: i,
    label: s.label,
    content: (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { Icon: Users, title: "Who", text: s.who },
          { Icon: Frown, title: "Their pain", text: s.pain },
          { Icon: Gift, title: "What they get", text: s.gets },
          { Icon: Briefcase, title: "Who signs", text: s.buyer },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left">
            <div className="flex items-center gap-2 text-sky-300">
              <Icon className="size-4" />
              <span className="jet text-xs tracking-widest uppercase">{title}</span>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-neutral-200">{text}</p>
          </div>
        ))}
      </div>
    ),
  }));

  return (
    <Section
      id="customers"
      eyebrow="Customer segments"
      title="One general product, set up per site"
      lead="Sites that already have cameras but no one to watch them, reached directly and through the security companies that install those cameras."
    >
      <DirectionAwareTabs tabs={tabs} className="border border-white/10 bg-white/[0.06]" />
    </Section>
  );
}
