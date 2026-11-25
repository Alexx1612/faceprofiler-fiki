"use client";

import { ChevronDown, ExternalLink, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ReplaysPanel } from "@/components/site/replays";
import { GoogleSignIn } from "@/components/landing/google-signin";
import { FrustrationView, HeatmapView, RetentionView, type Behaviour } from "@/components/site/heatmap";
import { Inbox } from "@/components/site/inbox";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import codeLinks from "@/lib/code-links.json";
import { EXPECTED_COLLECTOR, collectUrl } from "@/lib/collect";
import { googleClientId } from "@/lib/google-auth";
import { ownerFetch, useOwner } from "@/lib/owner-auth";
import { siteVersion, versions } from "@/lib/versions";
import { NextArrow, TabLabel } from "./tab-hint";

/**
 * Site analytics from our own collector (collector/Code.gs): the PostHog-style dashboard, our version.
 *
 * Methodology: fetches `NEXT_PUBLIC_COLLECT_URL?stats=1`, which returns aggregates only, per site version
 * and merged ("all"). The version selector switches between them. "Where visitors come from" sits at the
 * top: one row per normalised source with visitors, sessions, visitors who left their contact (newsletter or pilot) and
 * the conversion rate, its medium and how it was known (our UTM link, the browser's referrer, or nothing),
 * expandable to the raw referrer hosts mapped into it, campaigns, utm_content and landing paths. The source is
 * decided by the collector (classifySource in collector/Code.gs), not here. "How these numbers are made"
 * links each step to the exact lines on GitHub (lib/code-links.json, generated from markers in the code) and
 * shows the hash-chain facts, so anyone can re-check the numbers from the Sheet with collector/verify.mjs.
 * Without a collector URL, or when the fetch fails, the page shows the setup steps instead of numbers;
 * nothing is ever made up.
 *
 * Collector 1.3 adds who visits (counted once per visitor: device, OS, browser, in-app browser, screen
 * width, language, country and region, with how the country was found) and a weekday × hour grid, and
 * returns the team's own test traffic as a separate aggregate: the Real / Test switch shows one or the
 * other, never a mix. Every chart opens with a one-line takeaway computed from the numbers it shows.
 * Colours: the validated dark categorical order (dataviz skill) for identity, one blue ramp for magnitude.
 *
 * Guests and the owner (collector 1.4): `?stats=1` returns only the M5 public summary (collector publicStats:
 * totals, lead rate, trend, sources with leads and campaigns, funnel, device types, countries, form counts,
 * game summary, chain facts). The owner signs in with Google; the token goes to the collector's owner route
 * (`route=stats`), which returns the full aggregate, and unlocks the finer tabs: pages & clicks, survey
 * answers, versions, heatmap, frustration, scroll & retention, inbox and replays. The server decides; a
 * guest's page never receives the private numbers.
 */

type Count = { key: string; count: number };
type Source = {
  source: string;
  visitors: number;
  sessions: number;
  /** visitors who left their contact (newsletter or pilot); the survey is counted apart in by_form */
  conversions: number;
  conversion_rate: number;
  by_form?: { newsletter: number; pilot: number; survey: number };
  /** utm_medium, else social / search / email / referral / direct */
  mediums?: Count[];
  /** how the source was known: "utm" (our tagged link), "referrer" (sent by the browser) or "none" */
  how?: Count[];
  /** raw referrer hosts mapped into this source, e.g. l.facebook.com → facebook */
  referrer_hosts?: Count[];
  campaigns: Count[];
  contents?: Count[];
  landing_pages?: Count[];
};
type Stats = {
  visitors: number;
  sessions: number;
  pageviews: number;
  bounce_rate?: number;
  avg_session_s: number;
  /** visitors who left their contact (newsletter or pilot) and their share of visitors */
  leads?: number;
  lead_rate?: number;
  top_pages?: Count[];
  sources: Source[];
  devices: Count[];
  clicks?: Count[];
  funnel: { step: string; visitors: number; conversion: number }[];
  forms: Count[];
  survey?: Record<string, Count[]>;
  game: GameRound[];
  game_summary?: {
    players: number;
    finished_all: number;
    avg_score: number;
    score_distribution: { score: number; players: number }[];
    scenarios?: Count[];
  };
  daily: { date: string; pageviews: number; visitors: number }[];
  survey_free_text?: Count[];
  who?: Who;
  hours?: { tz: string; weekdays: string[]; grid: number[][] };
  behaviour?: Behaviour;
};
type Who = {
  devices: Count[];
  os: Count[];
  browsers: Count[];
  in_app: Count[];
  screens: Count[];
  langs: Count[];
  countries: { key: string; name: string; visitors: number; how: Count[] }[];
  regions: { country: string; region: string; visitors: number }[];
};
type GameRound = {
  round: string;
  people: number | null;
  plays: number;
  correct_pct: number;
  median_human_ms: number | null;
  best_human_ms?: number | null;
  median_machine_ms: number | null;
};
type Chain = { rows: number; chain_head: string; chain_ok: boolean | null; first_broken_row?: number | null };
type Payload = {
  generated: number;
  events: number;
  test_events?: number;
  collector?: string;
  integrity?: { collector: string; events: Chain; forms: Chain };
  versions: Record<string, Stats>;
  /** the team's own test traffic (test mode, automated browsers, test-tagged links), counted the same way */
  test?: Stats;
  test_visitors?: number;
  /** true for the guests' summary (collector publicStats) */
  public?: boolean;
  version_list?: string[];
};

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const h4 = "mb-3 text-sm font-semibold text-white";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => x.toLocaleString("en-US");
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
const HOW: Record<string, string> = { utm: "UTM link", referrer: "referrer", none: "nothing" };
/** "from referrer 3 + UTM link 1", or "no source sent" when the browser reported nothing. */
const howText = (r: Source) => {
  const h = r.how ?? [];
  if (h.length === 1 && h[0].key === "none") return "no source sent";
  return `from ${h.map((x) => `${HOW[x.key] ?? x.key}${h.length > 1 ? ` ${x.count}` : ""}`).join(" + ")}`;
};

/** Validated dark categorical order (dataviz reference palette, checked against this page's surface). */
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c"];
const OTHER = "#6b7280";
/** One blue ramp for magnitude (dark surface: more = lighter). */
const RAMP = ["#13223d", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"];
const share = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

/** The one-line, plain-language reading of a chart, above it. */
function Takeaway({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm text-neutral-200">{children}</p>;
}

/** "RO" → 🇷🇴 (regional indicator letters); "??" → 🌐. */
function flag(cc: string) {
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const LABEL: Record<string, string> = {
  ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux", chromeos: "ChromeOS",
  chrome: "Chrome", safari: "Safari", firefox: "Firefox", edge: "Edge", samsung: "Samsung", opera: "Opera",
  facebook: "Facebook app", instagram: "Instagram app", whatsapp: "WhatsApp app", linkedin: "LinkedIn app",
  tiktok: "TikTok app", snapchat: "Snapchat app", "google-app": "Google app", webview: "Other app (webview)",
  phone: "Phone", tablet: "Tablet", desktop: "Desktop", unknown: "Unknown", other: "Other",
  ro: "Romanian", en: "English", de: "German", fr: "French", it: "Italian", es: "Spanish", hu: "Hungarian",
};
const lab = (k: string) => LABEL[k] ?? k;

/**
 * Parts of a whole as one 100% bar (2px gaps between segments) with a legend that names every part, its
 * count and share, so identity never rests on colour alone. More than 5 parts fold into "Other".
 */
function Share({ title, items, total, note }: { title: string; items: Count[]; total?: number; note?: string }) {
  const sum = total ?? items.reduce((a, b) => a + b.count, 0);
  const head = items.slice(0, 5);
  const rest = items.slice(5).reduce((a, b) => a + b.count, 0);
  const parts = rest ? [...head, { key: "other", count: rest }] : head;
  return (
    <div className={box}>
      <p className={h4}>{title}</p>
      {!sum ? (
        <p className="text-sm text-neutral-400">No data yet.</p>
      ) : (
        <>
          <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${title}: ${parts.map((p) => `${lab(p.key)} ${share(p.count, sum)}%`).join(", ")}`}>
            {parts.map((p, i) => (
              <div
                key={p.key}
                title={`${lab(p.key)}: ${num(p.count)} (${share(p.count, sum)}%)`}
                style={{ width: `${(p.count / sum) * 100}%`, background: p.key === "other" || p.key === "unknown" ? OTHER : SERIES[i % SERIES.length] }}
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {parts.map((p, i) => (
              <li key={p.key} className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: p.key === "other" || p.key === "unknown" ? OTHER : SERIES[i % SERIES.length] }} />
                <span className="min-w-0 flex-1 truncate text-neutral-200">{lab(p.key)}</span>
                <span className="tabular-nums text-neutral-300">{num(p.count)}</span>
                <span className="w-10 text-right tabular-nums text-neutral-400">{share(p.count, sum)}%</span>
              </li>
            ))}
          </ul>
          {note ? <p className="mt-2 text-xs text-neutral-400">{note}</p> : null}
        </>
      )}
    </div>
  );
}

const HOW_GEO: Record<string, string> = { ip: "IP lookup", tz: "time zone", none: "unknown" };

/** Who visits: countries (ranked, expandable to regions) and device facts, each counted once per visitor. */
function WhoVisits({ s }: { s: Stats }) {
  const [open, setOpen] = useState<string | null>(null);
  const w = s.who;
  if (!w) return null;
  const visitors = s.visitors;
  const countries = w.countries;
  const known = countries.filter((c) => c.key !== "??");
  const max = Math.max(1, ...countries.map((c) => c.visitors));
  const topC = known[0];
  const phone = w.devices.find((d) => d.key === "phone")?.count ?? 0;
  const app = w.in_app.reduce((a, b) => a + b.count, 0);
  return (
    <section className={box} aria-labelledby="who-h">
      <h2 id="who-h" className="mb-1 text-base font-semibold text-white">
        Who visits
      </h2>
      <Takeaway>
        {visitors
          ? `${topC ? `Most visitors are in ${topC.name} (${num(topC.visitors)} of ${num(visitors)}). ` : ""}${share(phone, visitors)}% use a phone${app ? `; ${num(app)} opened the page inside an app (${lab(w.in_app[0].key)} most)` : ""}.`
          : "No visitors yet."}
      </Takeaway>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className={box}>
          <p className={h4}>Country → region</p>
          {!countries.length ? (
            <p className="text-sm text-neutral-400">No data yet.</p>
          ) : (
            <ul className="space-y-1">
              {countries.map((c) => {
                const regions = w.regions.filter((r) => r.country === c.key);
                const isOpen = open === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      aria-expanded={regions.length ? isOpen : undefined}
                      disabled={!regions.length}
                      onClick={() => setOpen(isOpen ? null : c.key)}
                      className="w-full rounded-lg px-1 py-1.5 text-left text-sm enabled:hover:bg-white/[0.04]"
                    >
                      <span className="mb-1 flex items-center gap-2">
                        <span aria-hidden>{flag(c.key)}</span>
                        <span className="min-w-0 flex-1 truncate text-neutral-100">{c.name}</span>
                        <span className="tabular-nums text-white">{num(c.visitors)}</span>
                        {regions.length ? <ChevronDown aria-hidden className={`size-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} /> : <span className="w-4" />}
                      </span>
                      <Bar value={c.visitors} max={max} />
                      <span className="mt-0.5 block text-xs text-neutral-400">from {c.how.map((h) => `${HOW_GEO[h.key] ?? h.key} ${h.count}`).join(" + ")}</span>
                    </button>
                    {isOpen && (
                      <ul className="mb-2 ml-7 mt-1 space-y-1 text-sm">
                        {regions.map((r) => (
                          <li key={r.region} className="flex justify-between gap-3 text-neutral-300">
                            <span className="min-w-0 truncate">{r.region}</span>
                            <span className="tabular-nums">{num(r.visitors)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-neutral-400">Region only after a visitor clicks Accept (one IP lookup; the IP is never stored). Before that, the country comes from the browser&apos;s time zone.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Share title="Device" items={w.devices} />
          <Share title="Operating system" items={w.os} />
          <Share title="Browser" items={w.browsers} />
          <Share title="Opened inside an app" items={w.in_app} total={visitors} note={app ? `${num(visitors - app)} visitors used a normal browser.` : "Everyone used a normal browser."} />
          <Share title="Screen width (px)" items={w.screens} />
          <Share title="Language" items={w.langs} />
        </div>
      </div>
    </section>
  );
}

/** Sessions by weekday × hour (Romanian time), one blue ramp; the busiest slot is named above. */
function Hours({ s }: { s: Stats }) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const h = s.hours;
  if (!h) return null;
  const max = Math.max(0, ...h.grid.flat());
  if (!max) return <p className="text-sm text-neutral-400">No sessions yet.</p>;
  let best: [number, number] = [0, 0];
  h.grid.forEach((row, d) => row.forEach((v, hr) => { if (v > h.grid[best[0]][best[1]]) best = [d, hr]; }));
  const byHour = Array.from({ length: 24 }, (_, hr) => h.grid.reduce((a, row) => a + row[hr], 0));
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const step = (v: number) => (v ? RAMP[Math.min(RAMP.length - 1, 1 + Math.floor((v / max) * (RAMP.length - 2) + 0.0001))] : RAMP[0]);
  const cur = hover ?? best;
  const hh = (x: number) => `${String(x).padStart(2, "0")}:00`;
  return (
    <div className="max-w-3xl">
      <Takeaway>
        Busiest: {h.weekdays[best[0]]} around {hh(best[1])}; across the week, most visits start at {hh(peakHour)}–{hh((peakHour + 1) % 24)} (Romanian time).
      </Takeaway>
      <p className="mb-2 text-xs text-neutral-400" aria-live="polite">
        {h.weekdays[cur[0]]} {hh(cur[1])}: {num(h.grid[cur[0]][cur[1]])} sessions
      </p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[2px]" role="img" aria-label={`Sessions by weekday and hour; busiest ${h.weekdays[best[0]]} ${hh(best[1])}`}>
          {h.grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="pr-1 text-right text-[11px] leading-5 text-neutral-400">{h.weekdays[d]}</span>
              {row.map((v, hr) => (
                <span
                  key={hr}
                  title={`${h.weekdays[d]} ${hh(hr)}: ${v} sessions`}
                  onMouseEnter={() => setHover([d, hr])}
                  onMouseLeave={() => setHover(null)}
                  className={`h-5 rounded-[3px] ${hover && hover[0] === d && hover[1] === hr ? "ring-2 ring-white/80" : ""}`}
                  style={{ background: step(v) }}
                />
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, hr) => (
            <span key={hr} className="text-center text-[10px] text-neutral-500">
              {hr % 6 === 0 ? hr : ""}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        fewer
        {RAMP.map((c) => (
          <span key={c} aria-hidden className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
        ))}
        more
      </p>
    </div>
  );
}

export const SETUP_STEPS = [
  "Create a new Google Sheet (sheets.new) and name it “Nau-ino analytics”.",
  "In the Sheet: Extensions → Apps Script.",
  "Delete the sample code, paste collector/Code.gs from the fiki repo, save.",
  "Deploy → New deployment → type Web app → Execute as: Me, Who has access: Anyone → Deploy (allow access once).",
  "Copy the Web app URL (ends with /exec).",
  "Put it in .env.local as NEXT_PUBLIC_COLLECT_URL=<url>, then npm run deploy.",
];

function NotConnected({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-4 text-sm text-amber-50 sm:p-5">
      <p className="mb-1 font-semibold text-amber-100">Not connected yet</p>
      <p className="mb-3 text-amber-100/80">{reason}</p>
      <ol className="list-decimal space-y-1.5 pl-5">
        {SETUP_STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function Bar({ value, max, tone = "bg-sky-500" }: { value: number; max: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function CountList({ items, empty = "No data yet." }: { items: Count[]; empty?: string }) {
  const max = Math.max(0, ...items.map((i) => i.count));
  if (!items.length) return <p className="text-sm text-neutral-400">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="min-w-0 truncate text-neutral-200">{i.key}</span>
            <span className="tabular-nums text-neutral-300">{num(i.count)}</span>
          </div>
          <Bar value={i.count} max={max} />
        </li>
      ))}
    </ul>
  );
}

function Kpis({ s }: { s: Stats }) {
  const items: [string, string][] = [
    ["Visitors", num(s.visitors)],
    ["Sessions", num(s.sessions)],
    ["Pageviews", num(s.pageviews)],
    ...(s.lead_rate !== undefined ? ([["Lead rate", `${pct(s.lead_rate)}${s.leads !== undefined ? ` · ${num(s.leads)}` : ""}`]] as [string, string][]) : []),
    ...(s.bounce_rate !== undefined ? ([["Bounce rate", pct(s.bounce_rate)]] as [string, string][]) : []),
    ["Avg. session", dur(s.avg_session_s)],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([k, v], i) => (
        <div key={k} className={`${box} ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
          <p className="text-xs text-neutral-400">{k}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{v}</p>
        </div>
      ))}
    </div>
  );
}

/** Where visitors come from: the owner's first question, so it gets the top of the page. */
function Sources({ s }: { s: Stats }) {
  const [open, setOpen] = useState<string | null>(null);
  const max = Math.max(0, ...s.sources.map((r) => r.visitors));
  return (
    <section className={box} aria-labelledby="src-h">
      <h2 id="src-h" className="mb-1 text-base font-semibold text-white">
        Where visitors come from
      </h2>
      <p className="mb-4 text-xs text-neutral-400">
        Source = utm_source, else the referring site. WhatsApp and Instagram apps often hide it (“direct / unknown”): share the UTM links from the{" "}
        <Link href="/M5/" className="text-sky-300 underline underline-offset-2">
          M5 campaign kit
        </Link>
        .
      </p>
      {s.sources.length ? (
        <Takeaway>
          {(() => {
            const t = s.sources[0];
            const conv = [...s.sources].filter((x) => x.visitors >= 3).sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
            return `Most visitors come from ${t.source} (${num(t.visitors)} of ${num(s.visitors)})${t.conversions ? `; ${pct(t.conversion_rate)} of them left their contact (newsletter or pilot)` : ""}.${conv && conv.source !== t.source && conv.conversion_rate > t.conversion_rate ? ` Best conversion: ${conv.source} (${pct(conv.conversion_rate)}).` : ""}`;
          })()}
        </Takeaway>
      ) : null}
      {s.sources.length === 0 ? (
        <p className="text-sm text-neutral-400">No visits yet.</p>
      ) : (
        <div className="-mx-1">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.6fr))] gap-3 px-1 pb-2 text-xs text-neutral-400 sm:grid">
            <span>Source</span>
            <span className="text-right">Visitors</span>
            <span className="text-right">Sessions</span>
            <span className="text-right" title="Visitors who signed up for news or asked for a pilot; the survey is not counted here">Left contact</span>
            <span className="text-right">Conversion</span>
          </div>
          <ul className="divide-y divide-white/10">
            {s.sources.map((r) => {
              const isOpen = open === r.source;
              return (
                <li key={r.source}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : r.source)}
                    className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-1 py-2.5 text-left hover:bg-white/[0.04] sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.6fr))]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                      <ChevronDown aria-hidden className={`size-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      <span className="min-w-0">
                        <span className="block truncate">{r.source}</span>
                        {r.mediums?.length || r.how?.length ? (
                          <span className="block truncate text-xs font-normal text-neutral-400">
                            {r.mediums?.[0]?.key}
                            {r.how?.length ? ` · ${howText(r)}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-right text-sm tabular-nums text-white sm:hidden">
                      {num(r.visitors)} <span className="text-neutral-400">· {pct(r.conversion_rate)}</span>
                    </span>
                    <span className="col-span-2 sm:hidden">
                      <Bar value={r.visitors} max={max} />
                      <span className="mt-1 block text-xs text-neutral-400">
                        {num(r.sessions)} sessions · {num(r.conversions)} left contact{r.by_form ? ` (news ${num(r.by_form.newsletter)} · pilot ${num(r.by_form.pilot)}) · survey ${num(r.by_form.survey)}` : ""}
                      </span>
                    </span>
                    <span className="hidden items-center gap-2 text-sm tabular-nums text-white sm:flex">
                      <Bar value={r.visitors} max={max} />
                      <span className="w-10 shrink-0 text-right">{num(r.visitors)}</span>
                    </span>
                    <span className="hidden text-right text-sm tabular-nums text-neutral-200 sm:block">{num(r.sessions)}</span>
                    <span className="hidden text-right text-sm tabular-nums text-neutral-200 sm:block">{num(r.conversions)}</span>
                    <span className="hidden text-right text-sm tabular-nums text-emerald-300 sm:block">{pct(r.conversion_rate)}</span>
                  </button>
                  {isOpen && (
                    <div className="grid gap-4 px-1 pb-4 pt-1 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">Referrer hosts → {r.source}</p>
                        <CountList items={r.referrer_hosts ?? []} empty={r.referrer_hosts ? "None (UTM link or no referrer)." : "Owner only."} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">utm_campaign</p>
                        <CountList items={r.campaigns} empty="None (no UTM link)." />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">utm_content</p>
                        <CountList items={r.contents ?? []} empty={r.contents ? "None." : "Owner only."} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">Landed on</p>
                        <CountList items={r.landing_pages ?? []} empty="Owner only." />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

const STEP_TEXT: Record<string, [string, string]> = {
  capture: ["Capture", "The browser sends only raw facts: referrer host, utm_* tags, landing page."],
  classify: ["Classify", "The server picks the source by fixed rules: UTM link, else referrer, else direct."],
  store: ["Store", "Each row gets a server id, server time and a SHA-256 chain hash."],
  aggregate: ["Count", "Test rows and duplicates out; the same code runs in verify.mjs."],
};

/** Link to the exact lines on GitHub: the deployed commit when the build was clean, else main. */
function codeHref(file: string, from?: number, to?: number) {
  const b = process.env.NEXT_PUBLIC_SITE_BUILD ?? "";
  const ref = /^[0-9a-f]{7,40}$/.test(b) ? b : "main";
  return `${codeLinks.repo}/blob/${ref}/${file}${from ? `#L${from}-L${to}` : ""}`;
}

function ChainFact({ name, c }: { name: string; c?: Chain }) {
  if (!c) return null;
  const ok = c.chain_ok;
  const Icon = ok === false ? ShieldAlert : ShieldCheck;
  return (
    <li className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden className={`size-4 shrink-0 ${ok === false ? "text-rose-300" : ok ? "text-emerald-300" : "text-neutral-400"}`} />
      <span className="min-w-0 truncate">
        {name}: {num(c.rows)} rows ·{" "}
        {ok === false ? `chain broken at Sheet row ${c.first_broken_row}` : ok ? "chain intact" : "chain not re-checked (too many rows)"}
        {c.chain_head ? (
          <>
            {" "}
            · head <code className="text-neutral-200">{c.chain_head.slice(0, 12)}</code>
          </>
        ) : null}
      </span>
    </li>
  );
}

/** How these numbers are made: the four steps with links to the code, the chain facts and how to re-check. */
function Provenance({ data }: { data: Payload | null }) {
  const build = process.env.NEXT_PUBLIC_SITE_BUILD ?? "";
  return (
    <section className={box} aria-labelledby="prov-h">
      <h2 id="prov-h" className="mb-3 text-base font-semibold text-white">
        How these numbers are made
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {codeLinks.steps.map((st, i) => (
          <li key={st.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
            <p className="font-semibold text-white">
              {i + 1}. {STEP_TEXT[st.id]?.[0] ?? st.id}
            </p>
            <p className="mt-1 text-xs text-neutral-400">{STEP_TEXT[st.id]?.[1]}</p>
            <a
              href={codeHref(st.file, st.from, st.to)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-9 max-w-full items-center gap-1 break-all text-xs text-sky-300 underline underline-offset-2"
            >
              <code>
                {st.file.split("/").pop()}#L{st.from}-{st.to}
              </code>
              <ExternalLink aria-hidden className="size-3 shrink-0" />
            </a>
          </li>
        ))}
      </ol>
      <ul className="mt-3 space-y-1.5 text-xs text-neutral-300">
        {data?.integrity ? (
          <>
            <ChainFact name="events" c={data.integrity.events} />
            <ChainFact name="forms" c={data.integrity.forms} />
          </>
        ) : null}
        <li>
          Verify yourself: download the Sheet tabs as CSV, then{" "}
          <code className="text-neutral-200">node collector/verify.mjs events.csv forms.csv</code> ·{" "}
          <a href={codeHref("collector/AUTHENTICITY.md")} target="_blank" rel="noreferrer" className="text-sky-300 underline underline-offset-2">
            how it works
          </a>
        </li>
        <li className="text-neutral-400">
          Site {siteVersion}
          {build ? ` (${build})` : ""}
          {data?.integrity?.collector || data?.collector ? ` · collector ${data?.integrity?.collector ?? data?.collector}` : ""}
        </li>
        {(data?.integrity?.collector ?? data?.collector) && (data?.integrity?.collector ?? data?.collector) !== EXPECTED_COLLECTOR && (
          <li role="alert" className="rounded-lg border border-amber-400/60 bg-amber-400/10 p-3 text-amber-200">
            The Apps Script runs collector {data?.integrity?.collector ?? data?.collector}; this site expects {EXPECTED_COLLECTOR}. Update it: paste the new{" "}
            <code>collector/Code.gs</code> in Apps Script, then Deploy → Manage deployments → Edit → New version.
          </li>
        )}
      </ul>
    </section>
  );
}

/** Daily pageviews (bars) and visitors (line), with a tick at each version release date. */
function Daily({ s }: { s: Stats }) {
  const [hover, setHover] = useState<number | null>(null);
  const d = s.daily;
  if (!d.length) return <p className="text-sm text-neutral-400">No data yet.</p>;
  const W = 640, H = 180, P = 24;
  const max = Math.max(1, ...d.map((x) => x.pageviews));
  const bw = (W - P * 2) / d.length;
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const releases = new Map(versions.map((v) => [v.date, v.version]));
  const line = d.map((x, i) => `${i ? "L" : "M"}${P + bw * i + bw / 2},${y(x.visitors)}`).join(" ");
  const cur = hover === null ? d[d.length - 1] : d[hover];
  const peak = d.reduce((a, b) => (b.visitors > a.visitors ? b : a), d[0]);
  const totalV = d.reduce((a, b) => a + b.visitors, 0);
  return (
    <div className="max-w-3xl">
      <Takeaway>
        {d.length === 1
          ? `All ${num(totalV)} visitors so far came on ${peak.date}.`
          : `Busiest day: ${peak.date} with ${num(peak.visitors)} visitors (${num(peak.pageviews)} pageviews) over ${d.length} days.`}
      </Takeaway>
      <p className="mb-2 text-xs text-neutral-400" aria-live="polite">
        {cur.date}: {num(cur.pageviews)} pageviews · {num(cur.visitors)} visitors
        {releases.get(cur.date) ? ` · released ${releases.get(cur.date)}` : ""}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Pageviews and visitors per day">
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgb(255 255 255 / 0.15)" />
        <line x1={P} x2={W - P} y1={y(max)} y2={y(max)} stroke="rgb(255 255 255 / 0.08)" strokeDasharray="2 4" />
        <text x={P} y={y(max) - 4} fontSize={10} fill="rgb(255 255 255 / 0.5)">
          {num(max)}
        </text>
        {d.map((x, i) => (
          <g key={x.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
            <rect x={P + bw * i} y={P / 2} width={bw} height={H - P * 1.5} fill="transparent" />
            <rect x={P + bw * i + bw * 0.15} y={y(x.pageviews)} width={bw * 0.7} height={H - P - y(x.pageviews)} rx={2} fill="#3987e5" opacity={hover === null || hover === i ? 0.9 : 0.4} />
            {releases.get(x.date) && <line x1={P + bw * i + bw / 2} x2={P + bw * i + bw / 2} y1={P / 2} y2={H - P} stroke="#f0b45a" strokeDasharray="3 3" />}
          </g>
        ))}
        <path d={line} fill="none" stroke="#7ee0b5" strokeWidth={2} />
        <text x={P} y={H - 6} fontSize={11} fill="rgb(255 255 255 / 0.55)">
          {d[0].date}
        </text>
        <text x={W - P} y={H - 6} fontSize={11} fill="rgb(255 255 255 / 0.55)" textAnchor="end">
          {d[d.length - 1].date}
        </text>
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-neutral-400">
        <span>
          <span className="mr-1 inline-block size-2 rounded-sm bg-[#3987e5]" />
          pageviews
        </span>
        <span>
          <span className="mr-1 inline-block h-0.5 w-3 bg-[#7ee0b5] align-middle" />
          visitors
        </span>
        <span>
          <span className="mr-1 inline-block h-3 w-0 border-l border-dashed border-[#f0b45a] align-middle" />
          new version
        </span>
      </p>
    </div>
  );
}

/** Funnel: one bar per step (share of step 1) and, between steps, how many dropped off. */
function Funnel({ s }: { s: Stats }) {
  const top = s.funnel[0]?.visitors ?? 0;
  const last = s.funnel[s.funnel.length - 1];
  let worst = -1, worstDrop = -1;
  s.funnel.forEach((f, i) => {
    if (!i) return;
    const prev = s.funnel[i - 1].visitors;
    const drop = prev ? 1 - f.visitors / prev : 0;
    if (drop > worstDrop) [worst, worstDrop] = [i, drop];
  });
  return (
    <div>
      <Takeaway>
        {top
          ? `${pct(last.conversion)} of landing-page visitors sent a form or the survey; the biggest drop is before “${s.funnel[worst]?.step}” (${pct(worstDrop)} left).`
          : "Nobody has reached the landing page yet."}
      </Takeaway>
      <ol className="space-y-1">
        {s.funnel.map((f, i) => {
          const prev = i ? s.funnel[i - 1].visitors : 0;
          return (
            <li key={f.step} className="text-sm">
              {i > 0 && (
                <p className="py-1 pl-3 text-xs text-neutral-400">
                  ↓ {num(Math.max(0, prev - f.visitors))} dropped ({prev ? pct(1 - f.visitors / prev) : "0%"})
                </p>
              )}
              <div className="mb-1 flex justify-between gap-3">
                <span className="text-neutral-200">
                  {i + 1}. {f.step}
                </span>
                <span className="tabular-nums text-white">
                  {num(f.visitors)} <span className="text-neutral-400">· {top ? pct(f.visitors / top) : "0%"}</span>
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-white/[0.06]" aria-hidden>
                <div className="h-full rounded-md" style={{ width: `${top ? Math.max(1, (f.visitors / top) * 100) : 0}%`, background: SERIES[0] }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-neutral-400">Per visitor, steps in order, within 14 days of step 1.</p>
    </div>
  );
}

const SURVEY_LABELS: Record<string, string> = {
  lang: "Language",
  role: "Role",
  guarded: "Who guards the school after hours",
  incident_night: "Night incident in the last 3 months",
  incident_day: "Daytime incident in the last 3 months",
  noticed: "How fast it was noticed",
  resolved: "How it was resolved",
  alert_night: "Who finds out at night, today",
  alert_day: "How staff learnt of the last daytime incident",
  refused: "Turned down a security solution (teachers)",
  decided: "Who decided the last security spending",
  safe: "Feels safe after hours (0-5)",
  incident: "Incident in the last year",
  found_out: "When the school found out",
  who_inside: "How the school knows who is inside",
  comfort: "OK with staff-only recognition (0-5)",
  alert_useful: "Phone alert useful (0-5)",
  morning_useful: "Morning summary useful (0-5)",
  game_trust: "Trust a machine after the game (0-5)",
  refuse: "Would say no because",
  tell: "Who must be told",
  decides: "Who decides to buy",
};

function Survey({ s }: { s: Stats }) {
  const keys = Object.keys(s.survey ?? {});
  if (!keys.length) return <p className="text-sm text-neutral-400">No survey answers yet.</p>;
  const order = Object.keys(SURVEY_LABELS);
  keys.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const written = new Map((s.survey_free_text ?? []).map((x) => [x.key, x.count]));
  const answers = s.forms.find((f) => f.key === "survey")?.count ?? 0;
  return (
    <div>
      <Takeaway>
        {num(answers)} survey answers. Each card shows how many picked each answer; written answers (“Other…”) are only counted here and read in the Sheet.
      </Takeaway>
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((k) => {
          const items = (s.survey ?? {})[k];
          const total = items.reduce((a, b) => a + b.count, 0);
          const lead = items[0];
          return (
            <div key={k} className={box}>
              <p className="mb-1 text-sm font-semibold text-white">{SURVEY_LABELS[k] ?? k}</p>
              <p className="mb-3 text-xs text-neutral-400">
                {lead ? `Most common: “${lead.key}” (${share(lead.count, total)}% of ${num(total)})` : ""}
                {written.get(`${k}_other`) ? ` · ${num(written.get(`${k}_other`) ?? 0)} wrote their own answer` : ""}
              </p>
              <CountList items={items} />
            </div>
          );
        })}
      </div>
      {written.get("comment") ? <p className="mt-3 text-xs text-neutral-400">{num(written.get("comment") ?? 0)} left a comment (in the Sheet only).</p> : null}
    </div>
  );
}

const sec = (ms: number | null | undefined) => (ms === null || ms === undefined ? "–" : `${(ms / 1000).toFixed(1)} s`);


/** Who plays "Spot the stranger" and how well: players, finishers, score 0-5, and each round vs the machine. */
function Game({ s }: { s: Stats }) {
  const g = s.game_summary;
  if (!s.game.length) return <p className="text-sm text-neutral-400">Nobody has played yet.</p>;
  const maxDist = Math.max(1, ...(g?.score_distribution ?? []).map((d) => d.players));
  const maxT = Math.max(1, ...s.game.flatMap((r) => [r.median_human_ms ?? 0, r.median_machine_ms ?? 0]));
  const hardest = [...s.game].filter((r) => r.plays).sort((a, b) => a.correct_pct - b.correct_pct)[0];
  return (
    <div className="flex flex-col gap-3">
      <Takeaway>
        {g ? `${num(g.players)} people played; ${num(g.finished_all)} finished all rounds, average score ${g.avg_score.toFixed(1)} of 5. ` : ""}
        {hardest ? `Hardest: round ${hardest.round} (${pct(hardest.correct_pct)} right).` : ""}
      </Takeaway>
      {g ? (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["Players", num(g.players)],
              ["Finished all 5", `${num(g.finished_all)}${g.players ? ` · ${pct(g.finished_all / g.players)}` : ""}`],
              ["Avg. score", `${g.avg_score.toFixed(1)} / 5`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className={box}>
              <p className="text-xs text-neutral-400">{k}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white sm:text-2xl">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {g ? (
          <div className={box}>
            <p className={h4}>Score (rounds right per player)</p>
            <div className="flex h-36 items-end gap-3" role="img" aria-label={`Players per score: ${g.score_distribution.map((d) => `${d.score}/5: ${d.players}`).join(", ")}`}>
              {g.score_distribution.map((d) => (
                <div key={d.score} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs tabular-nums text-neutral-200">{num(d.players)}</span>
                  <div
                    className={`w-full rounded-t-md ${d.score === 5 ? "bg-emerald-400" : "bg-sky-500"}`}
                    style={{ height: `${Math.max(3, (d.players / maxDist) * 100)}%` }}
                  />
                  <span className="text-xs text-neutral-400">{d.score}/5</span>
                </div>
              ))}
            </div>
            {g.scenarios?.length ? (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold text-neutral-300">Scenarios</p>
                <CountList items={g.scenarios ?? []} />
              </>
            ) : null}
          </div>
        ) : null}
        <div className={box}>
          <p className={h4}>Median time per round: people vs the system</p>
          <ul className="space-y-3 text-sm">
            {s.game.map((r) => (
              <li key={r.round}>
                <p className="mb-1 text-xs text-neutral-400">
                  Round {r.round}
                  {r.people ? ` · ${r.people} people` : ""} · {num(r.plays)} plays · {pct(r.correct_pct)} right
                </p>
                {(
                  [
                    ["People", r.median_human_ms, SERIES[1]],
                    ["System", r.median_machine_ms, SERIES[0]],
                  ] as const
                ).map(([who, ms, color]) => (
                  <div key={who} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-neutral-300">{who}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${ms ? Math.max(1, (ms / maxT) * 100) : 0}%`, background: color }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-200">{sec(ms)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-400">System time is modelled from Nau-ino measurements (43 ms per face, 5 frames/s, 3 frames to confirm); rounds 3-5 count from the round start.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
          {s.game.map((r) => (
            <div key={r.round} className={box}>
              <p className="text-xs text-neutral-400">
                Round {r.round}
                {r.people ? ` · ${r.people} people` : ""}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{num(r.plays)} plays</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-neutral-400">Correct</dt>
                <dd className="text-right tabular-nums text-white">{pct(r.correct_pct)}</dd>
                <dt className="text-neutral-400">Median</dt>
                <dd className="text-right tabular-nums text-white">{sec(r.median_human_ms)}</dd>
                {r.best_human_ms != null && (
                  <>
                    <dt className="text-neutral-400">Best</dt>
                    <dd className="text-right tabular-nums text-white">{sec(r.best_human_ms)}</dd>
                  </>
                )}
                <dt className="text-neutral-400">System</dt>
                <dd className="text-right tabular-nums text-neutral-200">{sec(r.median_machine_ms)}</dd>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Versions({ data, current }: { data: Payload | null; current: string }) {
  return (
    <ol className="space-y-3">
      {versions.map((v) => {
        const st = data?.versions[v.version];
        return (
          <li key={v.version} className={box}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-white">
                {v.version} <span className="text-xs font-normal text-neutral-400">· {v.date}</span>
                {v.version === current && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">live</span>}
              </p>
              {st && (
                <p className="text-xs tabular-nums text-neutral-300">
                  {num(st.visitors)} visitors · {num(st.pageviews)} views · {num((st.clicks ?? []).reduce((a, c) => a + c.count, 0))} clicks
                </p>
              )}
            </div>
            <ul className="mt-1.5 list-disc pl-5 text-sm text-neutral-300">
              {v.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

/** Real / Test: the visitors' numbers, or the team's own test traffic (never mixed). */
function ViewSwitch({ view, setView }: { view: "real" | "test"; setView: (v: "real" | "test") => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/15 p-1" role="group" aria-label="Real or test traffic">
      {(["real", "test"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => setView(v)}
          className={`min-h-9 rounded-full px-4 text-sm ${view === v ? (v === "test" ? "bg-amber-400 font-semibold text-amber-950" : "bg-sky-600 font-semibold text-white") : "text-neutral-300 hover:bg-white/5"}`}
        >
          {v === "real" ? "Real" : "Test"}
        </button>
      ))}
    </div>
  );
}

/** Owner sign-in box for the guests' view (Google; the collector decides who is an owner). */
function OwnerSignIn({ onUser, notice }: { onUser: Parameters<typeof GoogleSignIn>[0]["onUser"]; notice: string }) {
  const [unavailable, setUnavailable] = useState(!googleClientId);
  return (
    <section className={`${box} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`} aria-label="Owner sign-in">
      <div className="text-sm text-neutral-200">
        <p className="font-semibold text-white">Signed in as the owner you see everything</p>
        <p className="text-neutral-300">Conversions by campaign detail, regions, pages and clicks, heatmaps, frustration, retention, replays and the form inbox.</p>
        {notice && <p className="mt-1 text-amber-200">{notice}</p>}
      </div>
      {unavailable ? (
        <p className="text-xs text-neutral-400">{googleClientId ? "Google sign-in could not load here (blocked or offline)." : "Owner sign-in needs the Google client ID in this build."}</p>
      ) : (
        <div className="w-full max-w-[360px] shrink-0">
          <GoogleSignIn onUser={onUser} onUnavailable={() => setUnavailable(true)} />
        </div>
      )}
    </section>
  );
}

/** Device types and countries (country level only): what guests see of "who visits". */
function PublicWho({ s }: { s: Stats }) {
  const devices = s.who?.devices ?? s.devices ?? [];
  const countries = s.who?.countries ?? [];
  const total = devices.reduce((a, c) => a + c.count, 0);
  const max = Math.max(1, ...countries.map((c) => c.visitors));
  return (
    <section className={`${box} grid gap-6 md:grid-cols-2`} aria-label="Who visits">
      <div>
        <p className={h4}>Device type</p>
        <Share title="" items={devices} total={total} />
      </div>
      <div>
        <p className={h4}>Countries</p>
        {countries.length ? (
          <ul className="space-y-2 text-sm">
            {countries.map((c) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <span className="truncate text-white">
                  {flag(c.key)} {c.name}
                </span>
                <span className="tabular-nums text-white">{num(c.visitors)}</span>
                <span className="col-span-2">
                  <Bar value={c.visitors} max={max} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">No visits yet.</p>
        )}
      </div>
    </section>
  );
}

/** Guests: the M5 lead-generation story only (the collector sends nothing finer). */
function PublicSummary({ data, onUser, notice, reload }: { data: Payload; onUser: Parameters<typeof GoogleSignIn>[0]["onUser"]; notice: string; reload: () => void }) {
  const s = data.versions.all;
  return (
    <div className="flex flex-col gap-4 text-left" data-public-summary>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">M5 · Lead generation — public summary</h2>
        <Link href="/M5/" className="text-sm text-sky-300 underline underline-offset-2">
          What M5 is about →
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={reload} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:bg-white/5">
          <RefreshCw aria-hidden className="size-4" /> Refresh
        </button>
        <span className="text-xs text-neutral-400">
          {num(data.events)} real events · {num(data.test_events ?? 0)} test events (kept apart) · updated {new Date(data.generated).toLocaleString("en-GB")} · cached up to 5 min
        </span>
      </div>
      <Kpis s={s} />
      <div className={box}>
        <Daily s={s} />
      </div>
      <Sources s={s} />
      <div className={box}>
        <p className={h4}>Funnel</p>
        <Funnel s={s} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={box}>
          <p className={h4}>Forms sent</p>
          <CountList items={s.forms} empty="No forms sent yet." />
        </div>
        <div className={box}>
          <p className={h4}>Spot-the-stranger game</p>
          <Game s={s} />
        </div>
      </div>
      <PublicWho s={s} />
      <OwnerSignIn onUser={onUser} notice={notice} />
      <Provenance data={data} />
    </div>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">(collectUrl ? "loading" : "off");
  const [version, setVersion] = useState("all");
  const [view, setView] = useState<"real" | "test">("real");
  const owner = useOwner();
  const [full, setFull] = useState<Payload | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    if (!collectUrl) return;
    setState("loading");
    fetch(`${collectUrl}${collectUrl.includes("?") ? "&" : "?"}stats=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Payload) => {
        if (!j?.versions?.all) throw new Error("bad payload");
        setData(j);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(load, [load]);

  // the owner's full aggregate (server checks the Google token); falls back to the public view on failure
  const { token, signOut } = owner;
  useEffect(() => {
    if (!token) {
      setFull(null);
      return;
    }
    let alive = true;
    ownerFetch<Payload>(token, { route: "stats" }).then((r) => {
      if (!alive) return;
      if ("versions" in r && r.versions?.all) {
        setFull(r);
        setNotice("");
      } else {
        setFull(null);
        setNotice(
          "error" in r && r.error === "not owner"
            ? "This Google account is not on the owner list (OWNER_EMAILS), so you see the public summary."
            : "The owner view did not load (collector 1.4 with Owner.gs and Inbox.gs needed); showing the public summary.",
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (state === "off" || state === "error")
    return (
      <div className="flex flex-col gap-4 text-left">
        <NotConnected
          reason={
            state === "off"
              ? "No collector URL in this build, so there is nothing to show. Six steps, about 5 minutes:"
              : "The collector did not answer. Check the URL and that the web app is deployed for “Anyone”:"
          }
        />
        <Provenance data={null} />
      </div>
    );
  if (state === "loading" || !data) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (!full && (data.public || !owner.token))
    return data.public ? (
      <PublicSummary data={data} onUser={owner.signIn} notice={notice} reload={load} />
    ) : (
      // an older collector (before 1.4) still sends everything publicly: show it as before
      <FullView data={data} version={version} setVersion={setVersion} view={view} setView={setView} reload={load} owner={null} />
    );
  return (
    <FullView
      data={full ?? data}
      version={version}
      setVersion={setVersion}
      view={view}
      setView={setView}
      reload={load}
      owner={full ? { email: owner.user?.email ?? "", token, signOut } : null}
    />
  );
}

/** Everything (the owner's view, or an older collector that still publishes the full aggregate). */
function FullView({
  data,
  version,
  setVersion,
  view,
  setView,
  reload,
  owner,
}: {
  data: Payload;
  version: string;
  setVersion: (v: string) => void;
  view: "real" | "test";
  setView: (v: "real" | "test") => void;
  reload: () => void;
  owner: { email: string; token: string; signOut: () => void } | null;
}) {
  const load = reload;
  const options = [
    "all",
    ...versions.map((v) => v.version).filter((v) => Object.keys(data.versions).includes(v)),
    ...Object.keys(data.versions).filter((v) => v !== "all" && !versions.some((x) => x.version === v)).sort(),
  ];

  const isTest = view === "test";
  const s = isTest ? data.test : data.versions[version] ?? data.versions.all;
  const testVisitors = data.test_visitors ?? data.test?.visitors;
  if (!s)
    return (
      <div className="flex flex-col gap-4 text-left">
        <ViewSwitch view={view} setView={setView} />
        <p className="text-sm text-neutral-400">This collector does not report test traffic separately yet (collector 1.3 does).</p>
      </div>
    );
  const tabs = [
    {
      label: "Trend",
      el: (
        <div className="flex flex-col gap-6">
          <Daily s={s} />
          <Hours s={s} />
        </div>
      ),
    },
    {
      label: "Pages & clicks",
      el: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className={box}>
            <p className={h4}>Top pages</p>
            <CountList items={s.top_pages ?? []} />
          </div>
          <div className={box}>
            <p className={h4}>Top clicks</p>
            <CountList items={s.clicks ?? []} />
          </div>
          <div className={box}>
            <p className={h4}>Devices</p>
            <CountList items={s.devices} />
          </div>
        </div>
      ),
    },
    {
      label: "Funnel & forms",
      el: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className={box}>
            <p className={h4}>Funnel</p>
            <Funnel s={s} />
          </div>
          <div className={box}>
            <p className={h4}>Forms sent</p>
            <CountList items={s.forms} empty="No forms sent yet." />
          </div>
        </div>
      ),
    },
    { label: "Survey", el: <Survey s={s} /> },
    { label: "Game", el: <Game s={s} /> },
    { label: "Versions", el: <Versions data={data} current={siteVersion} /> },
    ...(owner
      ? [
          { label: "Heatmap", el: <HeatmapView b={s.behaviour} /> },
          { label: "Frustration", el: <FrustrationView b={s.behaviour} /> },
          { label: "Scroll & retention", el: <RetentionView b={s.behaviour} /> },
          { label: "Inbox", el: <Inbox token={owner.token} /> },
          { label: "Replays & live", el: <ReplaysPanel /> },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 text-left">
      {owner && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100" data-owner-bar>
          <ShieldCheck aria-hidden className="size-4" /> Owner view{owner.email ? ` · ${owner.email}` : ""} · all data.
          <button type="button" onClick={owner.signOut} className="ml-auto min-h-9 rounded-full border border-white/20 px-3 text-xs text-white hover:bg-white/10">
            Sign out
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitch view={view} setView={setView} />
        <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-300">
          Version
          <select
            value={version}
            disabled={isTest}
            onChange={(e) => setVersion(e.target.value)}
            className="min-h-11 rounded-xl border border-white/15 bg-[#0a1529] px-3 text-white"
          >
            {options.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All versions (merged)" : v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={load} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:bg-white/5">
          <RefreshCw aria-hidden className="size-4" /> Refresh
        </button>
        <span className="text-xs text-neutral-400">
          {num(data.events)} real events · {num(data.test_events ?? 0)} test events (kept apart) · updated {new Date(data.generated).toLocaleString("en-GB")} · cached up to 5 min
        </span>
      </div>
      {isTest && (
        <p role="status" className="rounded-xl border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span className="mr-2 rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-950">TEST</span>
          The team&apos;s own traffic only (test mode, automated checks, test-tagged links). None of it is in the real numbers.
        </p>
      )}
      <p className="text-sm text-neutral-300">
        Real visitors <b className="tabular-nums text-white">{num(data.versions.all.visitors)}</b>
        {testVisitors !== undefined ? (
          <>
            {" "}
            · Test visitors <b className="tabular-nums text-amber-200">{num(testVisitors)}</b>
          </>
        ) : null}
      </p>
      <Kpis s={s} />
      <Sources s={s} />
      <WhoVisits s={s} />
      <Provenance data={data} />
      <DirectionAwareTabs
        tabs={tabs.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
        trailing={(next) => <NextArrow onClick={next} />}
        className="max-w-full min-w-0 flex-wrap justify-center gap-1 space-x-0 rounded-3xl border border-white/10 bg-white/[0.06] p-1.5 [&>button]:shrink-0 [&>button]:whitespace-nowrap"
      />
      {/* owner-only: locked teaser for guests (components/site/replays.tsx); the owner has it as a tab above */}
      {!owner && <ReplaysPanel />}
    </div>
  );
}
