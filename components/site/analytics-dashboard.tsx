"use client";

import { ChevronDown, ExternalLink, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import codeLinks from "@/lib/code-links.json";
import { EXPECTED_COLLECTOR, collectUrl } from "@/lib/collect";
import { siteVersion, versions } from "@/lib/versions";
import { NextArrow, TabLabel } from "./tab-hint";

/**
 * Site analytics from our own collector (collector/Code.gs): the PostHog-style dashboard, our version.
 *
 * Methodology: fetches `NEXT_PUBLIC_COLLECT_URL?stats=1`, which returns aggregates only, per site version
 * and merged ("all"). The version selector switches between them. "Where visitors come from" sits at the
 * top: one row per normalised source with visitors, sessions, sessions that sent a form or the survey and
 * the conversion rate, its medium and how it was known (our UTM link, the browser's referrer, or nothing),
 * expandable to the raw referrer hosts mapped into it, campaigns, utm_content and landing paths. The source is
 * decided by the collector (classifySource in collector/Code.gs), not here. "How these numbers are made"
 * links each step to the exact lines on GitHub (lib/code-links.json, generated from markers in the code) and
 * shows the hash-chain facts, so anyone can re-check the numbers from the Sheet with collector/verify.mjs.
 * Without a collector URL, or when the fetch fails, the page shows the setup steps instead of numbers;
 * nothing is ever made up.
 */

type Count = { key: string; count: number };
type Source = {
  source: string;
  visitors: number;
  sessions: number;
  conversions: number;
  conversion_rate: number;
  /** utm_medium, else social / search / email / referral / direct */
  mediums?: Count[];
  /** how the source was known: "utm" (our tagged link), "referrer" (sent by the browser) or "none" */
  how?: Count[];
  /** raw referrer hosts mapped into this source, e.g. l.facebook.com → facebook */
  referrer_hosts?: Count[];
  campaigns: Count[];
  contents: Count[];
  landing_pages: Count[];
};
type Stats = {
  visitors: number;
  sessions: number;
  pageviews: number;
  bounce_rate: number;
  avg_session_s: number;
  top_pages: Count[];
  sources: Source[];
  devices: Count[];
  clicks: Count[];
  funnel: { step: string; visitors: number; conversion: number }[];
  forms: Count[];
  survey: Record<string, Count[]>;
  game: GameRound[];
  game_summary?: {
    players: number;
    finished_all: number;
    avg_score: number;
    score_distribution: { score: number; players: number }[];
    scenarios: Count[];
  };
  daily: { date: string; pageviews: number; visitors: number }[];
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
    ["Bounce rate", pct(s.bounce_rate)],
    ["Avg. session", dur(s.avg_session_s)],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
      {s.sources.length === 0 ? (
        <p className="text-sm text-neutral-400">No visits yet.</p>
      ) : (
        <div className="-mx-1">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.6fr))] gap-3 px-1 pb-2 text-xs text-neutral-400 sm:grid">
            <span>Source</span>
            <span className="text-right">Visitors</span>
            <span className="text-right">Sessions</span>
            <span className="text-right">Sent a form</span>
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
                        {num(r.sessions)} sessions · {num(r.conversions)} sent a form
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
                        <CountList items={r.referrer_hosts ?? []} empty="None (UTM link or no referrer)." />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">utm_campaign</p>
                        <CountList items={r.campaigns} empty="None (no UTM link)." />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">utm_content</p>
                        <CountList items={r.contents} empty="None." />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-neutral-300">Landed on</p>
                        <CountList items={r.landing_pages} />
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
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-xs text-neutral-400" aria-live="polite">
        {cur.date}: {num(cur.pageviews)} pageviews · {num(cur.visitors)} visitors
        {releases.get(cur.date) ? ` · released ${releases.get(cur.date)}` : ""}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Pageviews and visitors per day">
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="rgb(255 255 255 / 0.15)" />
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

function Funnel({ s }: { s: Stats }) {
  const top = s.funnel[0]?.visitors ?? 0;
  return (
    <ol className="space-y-3">
      {s.funnel.map((f, i) => (
        <li key={f.step} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="text-neutral-200">
              {i + 1}. {f.step}
            </span>
            <span className="tabular-nums text-white">
              {num(f.visitors)} {i > 0 && <span className="text-emerald-300">· {pct(f.conversion)}</span>}
            </span>
          </div>
          <Bar value={f.visitors} max={top} tone={i === s.funnel.length - 1 ? "bg-emerald-500" : "bg-sky-500"} />
        </li>
      ))}
      <li className="text-xs text-neutral-400">Per visitor, steps in order, within 14 days of step 1.</li>
    </ol>
  );
}

const SURVEY_LABELS: Record<string, string> = {
  lang: "Language",
  role: "Role",
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
  const keys = Object.keys(s.survey);
  if (!keys.length) return <p className="text-sm text-neutral-400">No survey answers yet.</p>;
  const order = Object.keys(SURVEY_LABELS);
  keys.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {keys.map((k) => (
        <div key={k} className={box}>
          <p className={h4}>{SURVEY_LABELS[k] ?? k}</p>
          <CountList items={s.survey[k]} />
        </div>
      ))}
    </div>
  );
}

const sec = (ms: number | null | undefined) => (ms === null || ms === undefined ? "–" : `${(ms / 1000).toFixed(1)} s`);
const msx = (ms: number | null | undefined) => (ms === null || ms === undefined ? "–" : `${ms.toFixed(2)} ms`);

/** Who plays "Spot the stranger" and how well: players, finishers, score 0-4, and each round vs the machine. */
function Game({ s }: { s: Stats }) {
  const g = s.game_summary;
  if (!s.game.length) return <p className="text-sm text-neutral-400">Nobody has played yet.</p>;
  const maxDist = Math.max(1, ...(g?.score_distribution ?? []).map((d) => d.players));
  return (
    <div className="flex flex-col gap-3">
      {g ? (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["Players", num(g.players)],
              ["Finished all 4", `${num(g.finished_all)}${g.players ? ` · ${pct(g.finished_all / g.players)}` : ""}`],
              ["Avg. score", `${g.avg_score.toFixed(1)} / 4`],
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
            <div className="flex h-36 items-end gap-3" role="img" aria-label={`Players per score: ${g.score_distribution.map((d) => `${d.score}/4: ${d.players}`).join(", ")}`}>
              {g.score_distribution.map((d) => (
                <div key={d.score} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs tabular-nums text-neutral-200">{num(d.players)}</span>
                  <div
                    className={`w-full rounded-t-md ${d.score === 4 ? "bg-emerald-400" : "bg-sky-500"}`}
                    style={{ height: `${Math.max(3, (d.players / maxDist) * 100)}%` }}
                  />
                  <span className="text-xs text-neutral-400">{d.score}/4</span>
                </div>
              ))}
            </div>
            {g.scenarios.length ? (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold text-neutral-300">Scenarios</p>
                <CountList items={g.scenarios} />
              </>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
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
                <dt className="text-neutral-400">Best</dt>
                <dd className="text-right tabular-nums text-white">{sec(r.best_human_ms)}</dd>
                <dt className="text-neutral-400">Machine</dt>
                <dd className="text-right tabular-nums text-emerald-300">{msx(r.median_machine_ms)}</dd>
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
                  {num(st.visitors)} visitors · {num(st.pageviews)} views · {num(st.clicks.reduce((a, c) => a + c.count, 0))} clicks
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

export function AnalyticsDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">(collectUrl ? "loading" : "off");
  const [version, setVersion] = useState("all");

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

  const options = useMemo(() => {
    const seen = new Set(Object.keys(data?.versions ?? {}).filter((v) => v !== "all"));
    const known = versions.map((v) => v.version).filter((v) => seen.has(v));
    const other = [...seen].filter((v) => !known.includes(v)).sort();
    return ["all", ...known, ...other];
  }, [data]);

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

  const s = data.versions[version] ?? data.versions.all;
  const tabs = [
    { label: "Trend", el: <Daily s={s} /> },
    {
      label: "Pages & clicks",
      el: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className={box}>
            <p className={h4}>Top pages</p>
            <CountList items={s.top_pages} />
          </div>
          <div className={box}>
            <p className={h4}>Top clicks</p>
            <CountList items={s.clicks} />
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
  ];

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-300">
          Version
          <select
            value={version}
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
          {num(data.events)} events{data.test_events ? ` · ${num(data.test_events)} test events ignored` : ""} · updated {new Date(data.generated).toLocaleString("en-GB")} · cached up to 5 min
        </span>
      </div>
      <Kpis s={s} />
      <Sources s={s} />
      <Provenance data={data} />
      <DirectionAwareTabs
        tabs={tabs.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
        trailing={(next) => <NextArrow onClick={next} />}
        className="max-w-full min-w-0 justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] lg:[mask-image:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
      />
    </div>
  );
}
