"use client";

import { ArrowDown, ArrowRight } from "lucide-react";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { m4Changes, m4Conclusions, m4Flows, m4Guide, m4Hypotheses, m4Method, m4Participants, m4Personas, m4Quotes, m4Stories, m4UseCases, type Persona, type Source } from "@/lib/m4";
import { cn } from "@/lib/utils";
import { NextArrow, TabHint, TabLabel } from "./tab-hint";

/**
 * Milestone 4 (UX) content as numbered tabs, same style as M2 and M3.
 *
 * Methodology: all text comes from lib/m4.ts. Anything that depends on the interview notes and is not
 * filled in yet is shown with a "waiting for notes" mark instead of being written here, so the page
 * never claims more than the team has.
 */

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const h4 = "mb-2 text-sm font-semibold text-white";

const SOURCE: Record<Source, [string, string]> = {
  M2: ["From M2 interviews", "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"],
  M4: ["From M4 interviews", "border-sky-400/40 bg-sky-400/10 text-sky-200"],
  draft: ["Draft, to confirm", "border-amber-400/40 bg-amber-400/10 text-amber-200"],
};
function Tag({ source }: { source: Source }) {
  const [t, c] = SOURCE[source];
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap", c)}>{t}</span>;
}
function Pending({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
      <b>Waiting for the interview notes.</b> {what}
    </div>
  );
}
const personaName = (id: Persona["id"]) => {
  const p = m4Personas.find((x) => x.id === id)!;
  return `${p.name}, ${p.role.toLowerCase()}`;
};

function Interviews() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className={box}>
          <p className={h4}>Who</p>
          <p className="text-sm text-neutral-300">{m4Method.who}</p>
          <p className="mt-2 text-sm text-neutral-400">{m4Method.why}</p>
        </div>
        <div className={box}>
          <p className={h4}>How</p>
          <p className="text-sm text-neutral-300">{m4Method.how}</p>
        </div>
        <div className={box}>
          <p className={h4}>Language</p>
          <p className="text-sm text-neutral-300">{m4Method.language}</p>
        </div>
      </div>
      <div className={box}>
        <p className={h4}>Participants</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {m4Participants.map((p) => (
            <div key={p.code} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <span className="jet flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sm font-bold text-sky-200">{p.code}</span>
              <span className="min-w-0 text-sm">
                <b className="block text-white">{p.role}</b>
                <span className="text-neutral-400">{p.segment}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {m4Guide.map((g) => (
          <div key={g.part} className={box}>
            <p className={h4}>
              {g.part} <span className="jet ml-1 text-xs font-normal text-sky-300">{g.minutes} min</span>
            </p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-neutral-300">
              {g.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function Findings() {
  const res = { pending: "Pending", confirmed: "Confirmed", rejected: "Rejected", mixed: "Mixed" } as const;
  return (
    <div className="flex flex-col gap-4">
      {m4Conclusions.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {m4Conclusions.map((c) => (
            <div key={c.title} className={cn(box, "border-sky-400/30")}>
              <p className="font-semibold text-white">{c.title}</p>
              <p className="mt-1 text-sm text-neutral-300">{c.text}</p>
              <p className="jet mt-2 text-xs text-sky-300">{c.from}</p>
            </div>
          ))}
        </div>
      ) : (
        <Pending what="The conclusions are written from the six interviews' notes; they will appear here once the notes are added." />
      )}
      <div className={box}>
        <p className={h4}>What we went in to check</p>
        <ul className="flex flex-col gap-2">
          {m4Hypotheses.map((h) => (
            <li key={h.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
              <span className="jet text-xs text-sky-300">{h.id}</span>
              <span className="min-w-0 flex-1 text-neutral-200">{h.claim}</span>
              <span className="jet text-xs text-neutral-400">{h.who}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", h.result === "pending" ? "bg-white/10 text-neutral-300" : h.result === "confirmed" ? "bg-emerald-500/20 text-emerald-200" : h.result === "rejected" ? "bg-red-500/20 text-red-200" : "bg-amber-500/20 text-amber-200")}>
                {res[h.result]}
              </span>
              {h.evidence && <span className="basis-full pl-8 text-neutral-400">{h.evidence}</span>}
            </li>
          ))}
        </ul>
      </div>
      {m4Quotes.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {m4Quotes.map((q) => (
            <blockquote key={q.text} className={box}>
              <p className="text-neutral-200">&ldquo;{q.text}&rdquo;</p>
              <footer className="jet mt-2 text-xs text-neutral-400">{q.who} · translated from Romanian</footer>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

function Personas() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {m4Personas.map((p) => (
        <article key={p.id} className={cn(box, p.primary && "border-sky-400/40")}>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-lg font-bold text-sky-100">{p.name[0]}</span>
            <span className="min-w-0">
              <b className="block text-lg text-white">{p.name}</b>
              <span className="text-sm text-neutral-300">{p.role}</span>
            </span>
            {p.primary && <span className="ml-auto rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">Main</span>}
          </div>
          <p className="text-sm text-neutral-300">{p.context}</p>
          {(
            [
              ["Goals", p.goals],
              ["Frustrations", p.frustrations],
              ["Needs from Nau-ino", p.needs],
            ] as const
          ).map(([t, list]) => (
            <div key={t} className="mt-3">
              <p className="text-xs font-semibold tracking-wide text-sky-300 uppercase">{t}</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-neutral-300">
                {list.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-3 text-sm text-neutral-400">
            <b className="text-neutral-200">Tech:</b> {p.tech}
          </p>
          <p className="mt-3 rounded-lg bg-amber-400/[0.08] px-2.5 py-1.5 text-xs text-amber-100">{p.based}</p>
        </article>
      ))}
      <p className="text-sm text-neutral-400 lg:col-span-3">Names are fictional. Ion is the main persona: he is the one who uses Nau-ino every night.</p>
    </div>
  );
}

function Stories() {
  return (
    <div className="flex flex-col gap-4">
      {m4Personas.map((p) => (
        <div key={p.id}>
          <p className="mb-2 text-sm font-semibold text-white">{personaName(p.id)}</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {m4Stories
              .filter((s) => s.persona === p.id)
              .map((s) => (
                <li key={s.story} className={box}>
                  <p className="text-sm text-neutral-200">{s.story}</p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <p className="min-w-0 flex-1 text-xs text-neutral-400">
                      <b className="text-neutral-300">Done when:</b> {s.done}
                    </p>
                    <Tag source={s.source} />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Flow({ f }: { f: (typeof m4Flows)[number] }) {
  return (
    <div className={box}>
      <p className={h4}>
        <span className="jet mr-2 text-xs text-sky-300">{f.id}</span>
        {f.title} <span className="font-normal text-neutral-400">· {personaName(f.persona)}</span>
      </p>
      <ol className="flex flex-col items-stretch gap-1">
        {f.steps.map((s, i) => (
          <li key={s.text} className="flex flex-col items-center gap-1">
            {s.branch ? (
              <div className="w-full">
                <div className="mx-auto w-fit rotate-0 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-center text-sm text-amber-100">{s.text}</div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {s.branch.map((b) => (
                    <div key={b} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center text-xs text-neutral-200">
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full rounded-lg border border-sky-400/30 bg-sky-400/[0.08] px-3 py-1.5 text-center text-sm text-white">{s.text}</div>
            )}
            {i < f.steps.length - 1 && <ArrowDown className="size-4 text-sky-300" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function UseCases() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {m4Flows.map((f) => (
          <Flow key={f.id} f={f} />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {m4UseCases.map((u) => (
          <div key={u.id} className={box}>
            <p className="font-semibold text-white">
              <span className="jet mr-2 text-xs text-sky-300">{u.id}</span>
              {u.title}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              <b className="text-neutral-300">Actor:</b> {u.actor} · <b className="text-neutral-300">Trigger:</b> {u.trigger}
            </p>
            <ol className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-200">
              {u.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className="rounded-md bg-white/[0.06] px-2 py-1">{s}</span>
                  {i < u.steps.length - 1 && <ArrowRight className="size-3 text-sky-300" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-neutral-300">
              <b className="text-white">Outcome:</b> {u.outcome}
            </p>
            {u.alt && <p className="mt-1 text-sm text-neutral-400">Otherwise: {u.alt}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Wireframe v2: grey-box sketches of the changed screens ---------- */

const wf = "rounded-xl border border-zinc-400 bg-zinc-50 p-3 text-zinc-800 shadow-lg";
const bar = (w: string, c = "bg-zinc-300") => <span className={cn("block h-2 rounded", c)} style={{ width: w }} />;

function W1() {
  return (
    <div className="mx-auto flex w-44 flex-col gap-2 rounded-[22px] border-4 border-zinc-500 bg-zinc-100 p-2.5 text-zinc-800">
      <span className="mx-auto h-1 w-10 rounded-full bg-zinc-400" />
      <span className="text-[11px] font-bold text-red-700">Unknown person · Corridor A</span>
      <span className="aspect-video rounded bg-zinc-300" />
      <span className="text-[10px] text-zinc-600">02:17 · escalates to security company in 2:41</span>
      <span className="rounded bg-zinc-800 py-2 text-center text-[11px] font-semibold text-white">I&apos;m checking</span>
      <span className="rounded border border-zinc-500 py-2 text-center text-[11px] font-semibold">Call help</span>
    </div>
  );
}
function W2() {
  return (
    <div className={wf}>
      <p className="text-[11px] font-bold">Last night · 21:00-07:00</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ["2", "alerts"],
          ["2", "answered"],
          ["0", "open"],
        ].map(([n, t]) => (
          <span key={t} className="rounded border border-zinc-300 bg-white p-1.5">
            <b className="block text-lg">{n}</b>
            <span className="text-[10px] text-zinc-500">{t}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {["02:17 Unknown · Corridor A · answered by guard in 0:40", "04:05 Camera 6 covered · fixed 04:12"].map((r) => (
          <span key={r} className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px]">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
function W3() {
  return (
    <div className={wf}>
      <p className="text-[11px] font-bold">Privacy</p>
      {[
        ["School mode: pupils are never enrolled", true],
        ["Blur faces in exports", true],
      ].map(([t, on]) => (
        <span key={String(t)} className="mt-2 flex items-center gap-2 text-[11px]">
          <span className={cn("h-3.5 w-6 rounded-full p-0.5", on ? "bg-zinc-800" : "bg-zinc-300")}>
            <span className="block size-2.5 translate-x-2.5 rounded-full bg-white" />
          </span>
          {t}
        </span>
      ))}
      <span className="mt-2 flex gap-1 text-[10px]">
        {["Everyone", "Known people", "Unknown people"].map((o, i) => (
          <span key={o} className={cn("rounded border px-1.5 py-0.5", i === 1 ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-400")}>
            {o}
          </span>
        ))}
      </span>
      <span className="mt-2 block text-[11px]">Keep footage: <b className="rounded border border-zinc-400 bg-white px-1.5">14</b> days</span>
    </div>
  );
}
function W4() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className={wf}>
      <p className="text-[11px] font-bold">Schedule</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[9px]">
        {days.map((d, i) => (
          <span key={d} className="flex flex-col gap-1">
            <span className="text-zinc-500">{d}</span>
            <span className="flex h-14 flex-col overflow-hidden rounded bg-zinc-800/80">{i < 5 && <span className="mt-[30%] h-[45%] bg-amber-200" />}</span>
          </span>
        ))}
      </div>
      <span className="mt-2 flex gap-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-zinc-800/80" /> After hours: alerts on
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-amber-200" /> Shift: workers allowed
        </span>
      </span>
    </div>
  );
}
function W5() {
  return (
    <div className={wf}>
      <p className="text-[11px] font-bold">Who is alerted</p>
      {[
        ["1", "Night guard", "at once"],
        ["2", "Security company", "after 3 min"],
        ["3", "Principal", "after 10 min"],
      ].map(([n, w, t]) => (
        <span key={n} className="mt-1.5 flex items-center gap-2 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]">
          <b className="flex size-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] text-white">{n}</b>
          {w}
          <span className="ml-auto text-zinc-500">{t}</span>
        </span>
      ))}
      <span className="mt-2 block">{bar("40%")}</span>
    </div>
  );
}
const SKETCH: Record<string, () => React.ReactElement> = { W1, W2, W3, W4, W5 };

function Wireframe() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-300">
        Changes to the M3 wireframe. Each one says what it is based on; drafts are checked against the interview notes before they are built.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {m4Changes.map((c) => {
          const S = SKETCH[c.id];
          return (
            <div key={c.id} className={cn(box, "flex flex-col gap-3")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="jet text-xs text-sky-300">{c.id}</span>
                <b className="text-white">{c.screen}</b>
                <span className="ml-auto">
                  <Tag source={c.source} />
                </span>
              </div>
              <div className="rounded-xl bg-[#0e1c33] p-3">
                <S />
              </div>
              <p className="text-sm text-neutral-200">{c.change}</p>
              <p className="text-xs text-neutral-400">Why: {c.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [
  { label: "Interviews", el: <Interviews /> },
  { label: "Findings", el: <Findings /> },
  { label: "Personas", el: <Personas /> },
  { label: "User stories", el: <Stories /> },
  { label: "Use cases & flows", el: <UseCases /> },
  { label: "Wireframe v2", el: <Wireframe /> },
];

export const M4Hint = () => <TabHint text={`${TABS.length} tabs: click or swipe to open the next one`} />;

export function M4Tabs() {
  return (
    <DirectionAwareTabs
      tabs={TABS.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
      trailing={(next) => <NextArrow onClick={next} />}
      className="max-w-full min-w-0 justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] lg:[mask-image:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
    />
  );
}
