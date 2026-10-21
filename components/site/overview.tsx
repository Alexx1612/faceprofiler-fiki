import { Layers, SearchX, Timer, VideoOff } from "lucide-react";

import { TextureCardStyled } from "@/components/ui/texture-card";
import { market, problems, project, segments } from "@/lib/content";
import { Section } from "./section";

const problemIcons = [VideoOff, SearchX, Timer, Layers];

function Card({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) {
  return (
    <TextureCardStyled className="h-full">
      <div className="flex h-full flex-col p-4 sm:p-5">
        <p className="jet text-[11px] tracking-widest text-sky-300 uppercase">{tag}</p>
        <h3 className="mt-1 text-lg leading-snug font-semibold text-white">{title}</h3>
        <div className="mt-3 flex-1 text-sm text-neutral-300">{children}</div>
      </div>
    </TextureCardStyled>
  );
}

/** Problem, solution and market in one row, as the startup fundamentals start. */
export function Overview() {
  return (
    <Section
      id="problem"
      eyebrow="Problem · Solution · Market"
      title="Hours of video that nobody watches"
      lead="Sites record around the clock, yet the footage is used only after something has gone wrong."
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <Card tag="The problem" title="Cameras record, nobody reacts">
          <ul className="flex flex-col gap-2 text-[13px] leading-snug">
            {problems.map((p, i) => {
              const Icon = problemIcons[i];
              return (
                <li key={p.title} className="flex gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-red-300" />
                  <span>
                    <b className="font-medium text-white">{p.title}.</b> <span className="text-neutral-400">{p.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card tag="Solution & value proposition" title="A security layer on existing cameras">
          <p className="text-neutral-400">
            {project.name} recognises enrolled people, keeps strangers anonymous and alerts staff only when a human is
            needed. Every event is saved with evidence and turned into a readable report.
          </p>
          <p className="mt-3 rounded-xl border border-sky-300/15 bg-sky-400/[0.07] p-3 font-medium text-white">
            Know who is on site, find anyone in minutes instead of hours, without new cameras and without sending a single
            face to the cloud.
          </p>
        </Card>

        <Card tag="Market" title="Start small, grow with the market">
          <p className="text-neutral-400">
            <b className="font-medium text-white">Entry market:</b> {market.entry}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {segments.map((s) => (
              <span key={s.label} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-200">
                {s.label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-neutral-400">
            <b className="font-medium text-white">Total market:</b> {market.tam}{" "}
            <a href={market.source.url} target="_blank" rel="noreferrer" className="text-sky-300 underline-offset-2 hover:underline">
              {market.source.label}
            </a>
          </p>
          <p className="mt-2 text-xs text-neutral-500">A growing market: most sites still choose the substitute, doing nothing.</p>
        </Card>
      </div>
    </Section>
  );
}
