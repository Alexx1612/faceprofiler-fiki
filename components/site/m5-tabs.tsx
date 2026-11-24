"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { asset } from "@/lib/content";
import {
  m5Analytics,
  m5Channels,
  m5GoogleForms,
  m5Lead,
  m5Log,
  m5Method,
  m5Numbers,
  m5PosthogShots,
  m5Posts,
  m5Verdict,
  type ChannelId,
} from "@/lib/m5";
import { cn } from "@/lib/utils";
import { NextArrow, TabHint, TabLabel } from "./tab-hint";

/**
 * Milestone 5 (lead generation) as numbered tabs, same style as M2-M4.
 *
 * Methodology: all text and numbers come from lib/m5.ts. Posts not yet published and numbers not yet
 * measured are shown with a dashed "waiting" box instead of a value, so the page never claims results
 * the team does not have.
 */

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const h4 = "mb-2 text-sm font-semibold text-white";

function Waiting({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-4 text-sm text-amber-100">{children}</div>;
}

function Shot({ s, caption }: { s: { src: string; width: number; height: number; alt: string }; caption?: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(s.src)} alt={s.alt} width={s.width} height={s.height} className="h-auto w-full" loading="lazy" />
      {caption && <figcaption className="px-2 py-1.5 text-[11px] text-neutral-300">{caption}</figcaption>}
    </figure>
  );
}

function Leads() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-300">{m5Lead.why}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {m5Lead.forms.map((f) => (
          <div key={f.name} className={box}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <b className="text-white">{f.name}</b>
              <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">{f.tool}</span>
            </div>
            <p className="text-sm text-neutral-300">{f.goal}</p>
            <p className="mt-2 text-xs text-neutral-400">Where: {f.where}</p>
            <p className="text-xs text-neutral-400">Fields: {f.fields}</p>
          </div>
        ))}
      </div>
      <Shot s={{ src: "/campaign/landing-updates.jpg", width: 1440, height: 639, alt: "The launch-updates sign-up section on the landing page" }} caption="Landing page: the new “Not ready for a pilot yet?” sign-up, next to the pilot form." />
      <div className="flex flex-wrap gap-2">
        <Link href="/landing/#updates" className="rounded-full bg-sky-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-sky-500">
          Open the sign-up on the landing page
        </Link>
      </div>
      <div className={box}>
        <p className={h4}>Google Forms survey</p>
        {m5GoogleForms.screenshot ? (
          <Shot s={m5GoogleForms.screenshot} caption={`Google Forms responses${m5GoogleForms.responses ? `: ${m5GoogleForms.responses}` : ""}`} />
        ) : (
          <Waiting>Waiting for the Google Forms results: the team adds a screenshot of the Responses summary.</Waiting>
        )}
        {m5GoogleForms.link && (
          <a href={m5GoogleForms.link} className="mt-2 inline-flex items-center gap-1 text-sm text-sky-300 underline">
            Open the survey <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <div className={box}>
        <p className={h4}>Privacy</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-300">
          {m5Lead.privacy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/[0.06] p-4">
        <p className="min-w-0 flex-1 basis-60 text-sm text-sky-50">Live numbers from our own collector: sources, clicks, funnel, survey and game, per site version.</p>
        <Link href="/analytics/" className="rounded-full bg-sky-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-sky-500">
          Open site analytics
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {m5Analytics.parts.map((p) => (
          <div key={p.name} className={box}>
            <p className={h4}>{p.name}</p>
            <p className="text-sm text-neutral-300">{p.what}</p>
          </div>
        ))}
      </div>
      <div className={box}>
        <p className={h4}>Events we record</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <tbody>
              {m5Analytics.events.map(([e, d]) => (
                <tr key={e} className="border-t border-white/10 first:border-0">
                  <td className="jet py-1.5 pr-3 text-sky-300">{e}</td>
                  <td className="py-1.5 text-neutral-300">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={box}>
        <p className={h4}>Consent</p>
        <p className="text-sm text-neutral-300">{m5Analytics.consent}</p>
      </div>
      {m5PosthogShots.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {m5PosthogShots.map((s) => (
            <Shot key={s.src} s={s} caption={s.caption} />
          ))}
        </div>
      ) : (
        <Waiting>Waiting for PostHog screenshots: web analytics overview, the funnel and one session replay, once the campaign has run.</Waiting>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs text-neutral-200 hover:bg-white/10"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function Kit() {
  const [lang, setLang] = useState<"en" | "ro">("en");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 basis-64 text-sm text-neutral-300">
          Ready-to-post texts. Every link carries its own UTM tags, so PostHog shows which channel each visit and sign-up came from.
        </p>
        <div role="group" aria-label="Language" className="flex rounded-full border border-white/15 p-0.5 text-sm">
          {(["en", "ro"] as const).map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={cn("min-h-9 rounded-full px-3", lang === l ? "bg-sky-600 text-white" : "text-neutral-300")}>
              {l === "en" ? "English" : "Română"}
            </button>
          ))}
        </div>
      </div>
      {m5Posts.map((p) => (
        <div key={p.channel} className={box}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <b className="text-white">{m5Channels[p.channel].name}</b>
            <span className="text-xs text-neutral-400">{p.where}</span>
            <span className="ml-auto">
              <CopyButton text={p[lang]} />
            </span>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-[#0e1c33] p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-neutral-200">{p[lang]}</pre>
          {p.note && <p className="mt-2 text-xs text-neutral-400">Tip: {p.note}</p>}
        </div>
      ))}
    </div>
  );
}

function Log() {
  const posted = m5Log.filter((l) => l.status === "posted").length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-300">
        Every post of the campaign, with its permalink and a screenshot. {posted} of {m5Log.length} published so far.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {m5Log.map((l, i) => (
          <div key={i} className={l.status === "posted" ? box : "rounded-2xl border border-dashed border-white/15 p-4"}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <b className="text-white">{m5Channels[l.channel].name}</b>
              <span className="text-xs text-neutral-400">{l.where}</span>
              <span
                className={cn(
                  "ml-auto rounded-full border px-2 py-0.5 text-[11px]",
                  l.status === "posted" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-amber-400/40 bg-amber-400/10 text-amber-200",
                )}
              >
                {l.status === "posted" ? `Posted ${l.date ?? ""}` : "Planned"}
              </span>
            </div>
            {l.screenshot && <Shot s={l.screenshot} />}
            {l.permalink && (
              <a href={l.permalink} className="mt-2 inline-flex items-center gap-1 text-sm break-all text-sky-300 underline">
                Permalink <ExternalLink className="size-3.5 shrink-0" />
              </a>
            )}
            {(l.reactions != null || l.comments != null) && (
              <p className="mt-1 text-xs text-neutral-400">
                {l.reactions ?? 0} reactions · {l.comments ?? 0} comments
              </p>
            )}
            {l.status === "planned" && <p className="text-xs text-neutral-400">Screenshot and permalink are added after posting.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Compare() {
  const rows = (Object.keys(m5Channels) as ChannelId[]).map((id) => {
    const n = m5Numbers[id];
    const posts = m5Log.filter((l) => l.channel === id && l.status === "posted").length;
    const conv = n.visitors && n.leads != null ? (100 * n.leads) / n.visitors : null;
    return { id, posts, ...n, conv };
  });
  const measured = rows.filter((r) => r.leads != null);
  const best = measured.length ? measured.reduce((a, b) => ((b.leads ?? 0) > (a.leads ?? 0) ? b : a)).id : null;
  const show = (v: number | null, suffix = "") => (v == null ? <span className="text-neutral-500">—</span> : `${Math.round(v * 10) / 10}${suffix}`);
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs text-neutral-400 uppercase">
            <tr>
              {["Channel", "Posts", "Visitors", "Leads", "Conversion", "Effort"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-t border-white/10", r.id === best && "bg-emerald-400/10")}>
                <td className="px-3 py-2 text-white">
                  {m5Channels[r.id].name}
                  {r.id === best && <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">Best</span>}
                </td>
                <td className="px-3 py-2 text-neutral-300">{r.posts}</td>
                <td className="px-3 py-2 text-neutral-300">{show(r.visitors)}</td>
                <td className="px-3 py-2 text-neutral-300">{show(r.leads)}</td>
                <td className="px-3 py-2 text-neutral-300">{show(r.conv, " %")}</td>
                <td className="px-3 py-2 text-neutral-300">{m5Channels[r.id].effort}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">
        Visitors: PostHog unique visitors by <code>utm_source</code>. Leads: Formspree sign-ups and pilot requests from that source. Conversion = leads ÷ visitors.
      </p>
      {m5Verdict ? (
        <div className={box}>
          <p className={h4}>What worked best</p>
          <p className="text-sm text-neutral-300">{m5Verdict}</p>
        </div>
      ) : (
        <Waiting>Waiting for data: the numbers and the best channel are filled in from PostHog and Formspree after the campaign. Nothing here is estimated.</Waiting>
      )}
    </div>
  );
}

function Method() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={box}>
        <p className={h4}>Timeline</p>
        <ol className="space-y-2 text-sm">
          {m5Method.timeline.map(([d, t]) => (
            <li key={d}>
              <b className="text-sky-300">{d}</b> <span className="text-neutral-300">{t}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className={box}>
        <p className={h4}>Tools</p>
        <ul className="space-y-2 text-sm">
          {m5Method.tools.map(([n, t]) => (
            <li key={n}>
              <b className="text-white">{n}</b> <span className="text-neutral-300">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(box, "md:col-span-2")}>
        <p className={h4}>For people who sign up</p>
        <p className="text-sm text-neutral-300">
          Every app has a user manual in English and Romanian, to read online or download as PDF.{" "}
          <Link href="/manuals/" className="text-sky-300 underline">
            Open the user manuals
          </Link>
        </p>
      </div>
    </div>
  );
}

const TABS = [
  { label: "Lead collection", el: <Leads /> },
  { label: "Analytics", el: <AnalyticsTab /> },
  { label: "Campaign kit", el: <Kit /> },
  { label: "Campaign log", el: <Log /> },
  { label: "Channel comparison", el: <Compare /> },
  { label: "How we did it", el: <Method /> },
];

export const M5Hint = () => <TabHint text={`${TABS.length} tabs: click or swipe to open the next one`} />;

export function M5Tabs() {
  return (
    <DirectionAwareTabs
      tabs={TABS.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
      trailing={(next) => <NextArrow onClick={next} />}
      className="max-w-full min-w-0 justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] lg:[mask-image:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
    />
  );
}
