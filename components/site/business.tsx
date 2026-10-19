import { Building2, Camera, Check, Cpu, EyeOff, Layers, Minus, SearchX, ShieldCheck, Timer, UserPlus, VideoOff, X } from "lucide-react";

import { TextureCardStyled } from "@/components/ui/texture-card";
import { advantages, competitors, components, matrix, problems, type Status } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Section } from "./section";

const problemIcons = [VideoOff, SearchX, Timer, Layers];
const advantageIcons = [Camera, Building2, UserPlus, EyeOff, Cpu, ShieldCheck];

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="Hours of video that nobody watches"
      lead="Sites record around the clock, yet the footage is used only after something has gone wrong."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {problems.map((p, i) => {
          const Icon = problemIcons[i];
          return (
            <TextureCardStyled key={p.title} className="h-full">
              <div className="p-4">
                <span className="flex size-8 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-red-300">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-3 font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-sm leading-snug text-neutral-400">{p.text}</p>
              </div>
            </TextureCardStyled>
          );
        })}
      </div>
    </Section>
  );
}

const statusStyle: Record<Status, { box: string; dot: string; label: string }> = {
  Current: { box: "border-emerald-400/25", dot: "bg-emerald-400", label: "Working today" },
  Partial: { box: "border-amber-400/25", dot: "bg-amber-400", label: "Partly built" },
  Next: { box: "border-white/10", dot: "bg-neutral-500", label: "Next" },
};

export function Solution() {
  return (
    <Section
      id="solution"
      eyebrow="Solution & value proposition"
      title="A security layer on existing cameras"
      lead="FaceProfiler recognises enrolled people, keeps strangers anonymous and alerts staff only when a human is needed. Every event is saved with evidence and turned into a readable report."
    >
      <p className="mb-4 rounded-2xl border border-sky-300/15 bg-gradient-to-br from-sky-400/10 via-transparent to-transparent p-4 text-base leading-snug font-medium text-white sm:text-lg">
        <span className="jet mb-1 block text-xs tracking-widest text-sky-300 uppercase">Value proposition</span>
        Know who is on site, find anyone in minutes instead of hours, without new cameras and without sending a single
        face to the cloud.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {(["Current", "Partial", "Next"] as Status[]).map((s) => {
          const items = components.filter((c) => c.status === s);
          return (
            <div key={s} className={cn("rounded-2xl border bg-white/[0.02] p-4", statusStyle[s].box)}>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <span className={cn("size-2 rounded-full", statusStyle[s].dot)} />
                {statusStyle[s].label}
                <span className="text-muted-foreground ml-auto text-xs">{items.length}</span>
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
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        EU: face checks need consent or another legal basis (GDPR); the AI Act bans emotion recognition in workplaces and
        schools and face databases scraped from the internet, so FaceProfiler only knows people a customer enrols.
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
      eyebrow="Competition & our advantage"
      title="Strong players, built for someone else"
      lead="The leaders sell to large enterprises or ask customers to replace their cameras; small and mid-size sites are left with cheap hardware they may not trust."
    >
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="p-3 text-left font-medium text-neutral-400">What a small site needs</th>
              {matrix.columns.map((col, i) => (
                <th key={col} className={cn("p-3 text-center font-medium", i === 0 ? "text-sky-300" : "text-neutral-200")}>
                  {col}
                  {i > 0 && (
                    <span className="block text-[10px] font-normal text-neutral-500">{competitors[i - 1].kind}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.06] last:border-0">
                <td className="px-3 py-2 text-neutral-300">{row.label}</td>
                {row.values.map((v, i) => {
                  const { Icon, cls, label } = cell[v];
                  return (
                    <td key={i} className={cn("px-3 py-2 text-center", i === 0 && "bg-sky-400/[0.05]")}>
                      <span className={cn("inline-flex size-6 items-center justify-center rounded-full", cls)} title={label}>
                        <Icon className="size-3.5" aria-label={label} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">Our assessment from each vendor&apos;s public product pages, October 2026.</p>

      <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {advantages.map((a, i) => {
          const Icon = advantageIcons[i];
          return (
            <div key={a.title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-sky-400" />
              <div>
                <h3 className="font-semibold text-white">{a.title}</h3>
                <p className="text-sm leading-snug text-neutral-400">{a.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
