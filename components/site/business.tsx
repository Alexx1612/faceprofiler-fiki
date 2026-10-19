import {
  BellRing,
  Building2,
  Camera,
  Check,
  Cpu,
  EyeOff,
  Layers,
  Minus,
  ScanFace,
  SearchX,
  ShieldCheck,
  Timer,
  UserPlus,
  VideoOff,
  X,
} from "lucide-react";

import { TextureCardStyled } from "@/components/ui/texture-card";
import { advantages, competitors, components, matrix, problems, steps, type Status } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Section } from "./section";

const problemIcons = [VideoOff, SearchX, Timer, Layers];
const advantageIcons = [Camera, Building2, UserPlus, EyeOff, Cpu, ShieldCheck];

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Thousands of hours of video that nobody watches"
      lead="Malls, shops, offices, care homes and event venues record around the clock, yet the footage is used only after something has gone wrong."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {problems.map((p, i) => {
          const Icon = problemIcons[i];
          return (
            <TextureCardStyled key={p.title} className="h-full">
              <div className="flex gap-4 p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{p.text}</p>
                </div>
              </div>
            </TextureCardStyled>
          );
        })}
      </div>
    </Section>
  );
}

const statusStyle: Record<Status, string> = {
  Current: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Partial: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Next: "border-white/15 bg-white/5 text-neutral-400",
};

export function Solution() {
  const count = (s: Status) => components.filter((c) => c.status === s).length;
  return (
    <Section
      id="solution"
      eyebrow="Solution & value proposition"
      title="A security layer on the cameras a site already has"
      lead="FaceProfiler recognises enrolled people, keeps strangers anonymous and alerts staff only when a human is needed. Every event is saved with evidence, and the same video produces traffic reports."
    >
      <blockquote className="relative mb-10 overflow-hidden rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-400/10 via-transparent to-transparent p-6 sm:p-10">
        <ScanFace className="absolute -top-6 -right-6 size-40 text-sky-400/10" />
        <p className="jet mb-3 text-xs tracking-widest text-sky-300 uppercase">Value proposition</p>
        <p className="max-w-3xl text-xl leading-snug font-medium text-white sm:text-3xl">
          Know who is on site, find anyone in minutes instead of hours, and learn how people use the space, without new
          cameras and without sending a single face to the cloud.
        </p>
      </blockquote>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li key={s.n} className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <span className="jet text-sm text-sky-400">{s.n}</span>
            <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">{components.length} components, one product</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["Current", "Partial", "Next"] as Status[]).map((s) => (
            <span key={s} className={cn("rounded-full border px-2.5 py-1", statusStyle[s])}>
              {count(s)} {s === "Current" ? "working today" : s === "Partial" ? "partly built" : "next"}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((c) => (
          <div key={c.name} className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white">{c.name}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", statusStyle[c.status])}>{c.status}</span>
            </div>
            <p className="text-sm leading-snug text-neutral-400">{c.text}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mt-6 max-w-3xl text-xs leading-relaxed">
        In the EU, face checks need consent or another legal basis (GDPR). The AI Act bans emotion recognition in
        workplaces and schools and bans face databases scraped from the internet, so FaceProfiler only knows people a
        customer enrols. Traffic, attention, fall and fight features work without identifying anyone.
      </p>
    </Section>
  );
}

const cell = {
  yes: { Icon: Check, cls: "bg-emerald-400/15 text-emerald-300", label: "Yes" },
  partial: { Icon: Minus, cls: "bg-amber-400/15 text-amber-300", label: "Partly" },
  no: { Icon: X, cls: "bg-white/5 text-neutral-500", label: "No" },
};

export function Competition() {
  return (
    <Section
      id="competition"
      eyebrow="Competition"
      title="Strong players, built for someone else"
      lead="The market leaders sell to large enterprises or ask customers to replace their cameras. Small and mid-size sites are left with cheap hardware they may not trust, or nothing."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {competitors.map((c) => (
          <TextureCardStyled key={c.name} className="h-full">
            <div className="p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                <span className="jet text-right text-[11px] text-neutral-500 uppercase">{c.kind}</span>
              </div>
              <p className="mt-3 text-sm text-neutral-300">
                <span className="text-emerald-300">+ </span>
                {c.strength}
              </p>
              <p className="mt-1.5 text-sm text-neutral-400">
                <span className="text-red-300">− </span>
                {c.gap}
              </p>
            </div>
          </TextureCardStyled>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="p-4 text-left font-medium text-neutral-400">What a small site needs</th>
              {matrix.columns.map((col, i) => (
                <th key={col} className={cn("p-4 text-center font-medium", i === 0 ? "text-sky-300" : "text-neutral-300")}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                <td className="p-4 text-neutral-300">{row.label}</td>
                {row.values.map((v, i) => {
                  const { Icon, cls, label } = cell[v];
                  return (
                    <td key={i} className={cn("p-3 text-center", i === 0 && "bg-sky-400/[0.05]")}>
                      <span className={cn("inline-flex size-7 items-center justify-center rounded-full", cls)} title={label}>
                        <Icon className="size-4" aria-label={label} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-3 text-xs">Our assessment from each vendor&apos;s public product pages, October 2026.</p>
    </Section>
  );
}

export function Advantage() {
  return (
    <Section
      id="advantage"
      eyebrow="Our advantage"
      title="Why FaceProfiler wins the small and mid-size site"
      lead="Large-system capabilities at a price and a setup effort a single shop, school or office can accept."
    >
      <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {advantages.map((a, i) => {
          const Icon = advantageIcons[i];
          return (
            <div key={a.title} className="bg-background group relative p-6 transition-colors hover:bg-sky-400/[0.04] sm:p-8">
              <Icon className="size-6 text-sky-400 transition-transform group-hover:scale-110" />
              <h3 className="mt-4 text-lg font-semibold text-white">{a.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{a.text}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-neutral-300">
        <BellRing className="size-5 shrink-0 text-sky-400" />
        Alerts reach staff only when a human is needed, so a single guard can cover a whole site.
      </div>
    </Section>
  );
}
