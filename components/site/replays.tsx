"use client";

/**
 * Owner-only "Live now" and "Replays" for /analytics/ (PostHog-style session replay, our own collector).
 *
 * Methodology: guests see only a locked teaser; nothing about recordings is in the public stats. The owner
 * signs in with Google (useOwner); every request carries the ID token and the collector (Owner.gs) checks it
 * against OWNER_EMAILS before answering. "Live now" polls the `live` route every 15 s. "Replays" lists
 * sessions (filters: real / test, days, minimum length, page) and plays one with rrweb-player (MIT, pinned,
 * loaded on demand) at 1x/2x/4x/8x with inactivity skipped. Under the player a timeline shows page changes,
 * clicks, rage clicks (PostHog's rule) and form events; the event list beside it jumps the player there.
 * Inputs and form text were masked at recording time (lib/replay.ts), so they never reach this page.
 */
import { Lock, Play, Radio, RefreshCw, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GoogleSignIn } from "@/components/landing/google-signin";
import { googleClientId } from "@/lib/google-auth";
import { ownerFetch, useOwner } from "@/lib/owner-auth";
import { clock, markers, type Marker } from "@/lib/replay-core.mjs";
import "rrweb-player/dist/style.css";

type Fail = { ok: false; error: string };
type LiveSession = { anon: string; path: string; device: string; country: string; source: string; test: boolean; seconds_active: number; last_seen_s: number };
type ReplayRow = {
  session: string; anon: string; version: string; test: boolean; started_at: number; duration_ms: number; chunks: number;
  pages: number; first_path: string; device: string; source: string; country: string; clicks: number; rage_clicks: number; starred?: boolean;
};
type RrEvent = { type: number; timestamp: number; data?: { href?: string; width?: number; height?: number } };
type AnalyticsEvent = { ts: number; event: string; path?: string; label?: string };
type Chunk = { seq: number; t0: number; events: RrEvent[] };
type GetPart = { ok: true; parts: number; chunks: Chunk[]; events?: AnalyticsEvent[] };

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const chip = "rounded-full border px-3 py-1.5 text-xs font-medium transition";
const chipOn = "border-sky-400 bg-sky-400/15 text-sky-200";
const chipOff = "border-white/15 text-neutral-300 hover:border-white/30";
const KIND_COLOR: Record<Marker["kind"], string> = { page: "#38bdf8", click: "#a3a3a3", rage: "#f87171", form: "#34d399", event: "#fbbf24" };

/** A collector answer that means "this route does not exist yet": the Apps Script is older than this site. */
function explain(e: string): string {
  if (e === "not owner") return "This Google account is not on the owner list (Script Property OWNER_EMAILS).";
  if (e === "unknown route") return "The collector does not have replays yet: paste Replay.gs and Owner.gs in Apps Script and deploy a new version.";
  if (e === "collector not configured") return "No collector URL in this build.";
  return e === "collector unreachable" ? "The collector did not answer. Try again in a moment." : e;
}

function failed(r: unknown): r is Fail {
  return !!r && typeof r === "object" && (r as Fail).ok === false;
}

const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? cc : "");
const when = (ms: number) => new Date(ms).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Locked teaser for guests, sign-in for the owner, then the two owner-only views. */
export function ReplaysPanel() {
  const { user, token, signIn, signOut } = useOwner();
  const [noGoogle, setNoGoogle] = useState(false);
  const [view, setView] = useState<"live" | "replays">("replays");

  if (!user)
    return (
      <section className={`${box} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`} aria-label="Session replays (owner only)">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-neutral-400" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-neutral-100">Session replays and live visitors · owner only</p>
            <p className="text-xs text-neutral-400">Recorded only after a visitor accepts cookies; inputs and form text hidden. Kept 30 days.</p>
          </div>
        </div>
        {googleClientId && !noGoogle ? (
          <div className="min-w-[240px]">
            <GoogleSignIn onUser={signIn} onUnavailable={() => setNoGoogle(true)} />
          </div>
        ) : (
          <p className="text-xs text-amber-200">Google sign-in is not configured in this build.</p>
        )}
      </section>
    );

  return (
    <section className={box} aria-label="Session replays and live visitors">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["live", "replays"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`${chip} ${view === v ? chipOn : chipOff}`} aria-pressed={view === v}>
            {v === "live" ? "Live now" : "Replays"}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-400">
          {user.email} ·{" "}
          <button type="button" onClick={signOut} className="text-sky-300 underline underline-offset-2">
            sign out
          </button>
        </span>
      </div>
      {view === "live" ? <LiveNow token={token} /> : <ReplayList token={token} />}
    </section>
  );
}

function LiveNow({ token }: { token: string }) {
  const [data, setData] = useState<{ sessions: LiveSession[]; at: number } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const r = await ownerFetch<{ ok: true; sessions: LiveSession[] }>(token, { route: "live" });
    if (failed(r)) return setError(explain(r.error));
    setError("");
    setData({ sessions: r.sessions ?? [], at: Date.now() });
  }, [token]);
  useEffect(() => {
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);
  if (error) return <p className="text-sm text-amber-200">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Loading…</p>;
  const real = data.sessions.filter((s) => !s.test);
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm text-neutral-200">
        <Radio className="size-4 text-emerald-400" aria-hidden />
        <b className="text-lg tabular-nums">{real.length}</b> on the site now
        {data.sessions.length > real.length && <span className="text-xs text-amber-200">+{data.sessions.length - real.length} test</span>}
        <span className="ml-auto text-xs text-neutral-500">active in the last 2 min · refreshes every 15 s</span>
      </p>
      {data.sessions.length === 0 ? (
        <p className="text-sm text-neutral-400">Nobody right now.</p>
      ) : (
        <ul className="divide-y divide-white/10 text-sm">
          {data.sessions.map((s) => (
            <li key={s.anon + s.path} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-mono text-xs text-neutral-400">{s.anon}</span>
              <span className="text-neutral-100">{s.path || "/"}</span>
              <span className="text-xs text-neutral-400">
                {s.device} {flag(s.country)} · {s.source} · {s.seconds_active}s active · seen {s.last_seen_s}s ago
              </span>
              {s.test && <span className="rounded bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-200">TEST</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/*
 * Stars: the owner marks replays worth keeping (e.g. for a showcase). Saved in the collector (Replay.gs op=star,
 * column "starred"; starred sessions survive the 30-day clean-up) and mirrored in this browser, so starring also
 * works before the new Replay.gs is pasted (then it is only kept in this browser).
 */
const STAR_KEY = "nauino:stars";

function localStars(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STAR_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveLocalStars(set: Set<string>) {
  try {
    localStorage.setItem(STAR_KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked: the collector copy still counts */
  }
}

/** Star state for the list and the player: server flag OR this browser's copy; toggle writes both. */
function useStars(token: string) {
  const [local, setLocal] = useState<Set<string>>(() => new Set());
  const [server, setServer] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<"collector" | "browser" | "">("");
  useEffect(() => setLocal(localStars()), []);
  const isStarred = useCallback((r: ReplayRow) => (r.session in server ? server[r.session] : Boolean(r.starred)) || local.has(r.session), [local, server]);
  const toggle = useCallback(
    async (r: ReplayRow) => {
      const on = !isStarred(r);
      const next = new Set(local);
      if (on) next.add(r.session);
      else next.delete(r.session);
      setLocal(next);
      saveLocalStars(next);
      setServer((m) => ({ ...m, [r.session]: on }));
      const res = await ownerFetch<{ ok: boolean; starred?: boolean }>(token, { route: "replays", op: "star", session: r.session, on: on ? "1" : "0" });
      setSaved(!failed(res) && typeof (res as { starred?: boolean }).starred === "boolean" ? "collector" : "browser");
    },
    [isStarred, local, token],
  );
  return { isStarred, toggle, saved };
}

function StarButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Unstar ${label}` : `Star ${label}`}
      title={on ? "Starred: kept past the 30-day clean-up. Click to unstar." : "Star this replay to keep it"}
      className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
    >
      <Star className={`size-4 ${on ? "fill-amber-300 text-amber-300" : "text-neutral-500"}`} aria-hidden />
    </button>
  );
}

function ReplayList({ token }: { token: string }) {
  const stars = useStars(token);
  const [which, setWhich] = useState<"real" | "test" | "all" | "showcase" | "starred">("real");
  const [days, setDays] = useState("7");
  const [minS, setMinS] = useState("0");
  const [path, setPath] = useState("");
  const [rows, setRows] = useState<ReplayRow[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<ReplayRow | null>(null);
  const load = useCallback(async () => {
    setRows(null);
    const r = await ownerFetch<{ ok: true; sessions: ReplayRow[] }>(token, { route: "replays", op: "list", test: which === "showcase" || which === "starred" ? "all" : which, days: which === "starred" ? "30" : days, min_s: minS, path, ...(which === "starred" ? { starred: "1" } : {}) });
    if (failed(r)) return setError(explain(r.error));
    setError("");
    // showcases are the team's own recordings (lib/replay.ts): session ids start with "show_"
    const all = r.sessions ?? [];
    const mine = localStars();
    setRows(
      all.filter((x) =>
        which === "starred" ? x.starred || mine.has(x.session) : which === "showcase" ? x.session.startsWith("show_") : which === "real" || !x.session.startsWith("show_") || which === "all",
      ),
    );
  }, [token, which, days, minS, path]);
  useEffect(() => {
    void load();
  }, [load]);

  if (open) return <ReplayPlayer token={token} row={open} onBack={() => setOpen(null)} starred={stars.isStarred(open)} onStar={() => void stars.toggle(open)} />;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["real", "test", "showcase", "starred", "all"] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWhich(w)} className={`${chip} ${which === w ? chipOn : chipOff}`} aria-pressed={which === w}>
            {w === "real" ? "Real" : w === "test" ? "Test" : w === "showcase" ? "Showcase" : w === "starred" ? "★ Starred" : "All"}
          </button>
        ))}
        <label className="text-xs text-neutral-400">
          Last{" "}
          <select value={days} onChange={(e) => setDays(e.target.value)} className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-neutral-100">
            {["1", "7", "30"].map((d) => (
              <option key={d} value={d} className="bg-neutral-900">
                {d} {d === "1" ? "day" : "days"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-400">
          At least{" "}
          <select value={minS} onChange={(e) => setMinS(e.target.value)} className="rounded-md border border-white/15 bg-transparent px-2 py-1 text-neutral-100">
            {[["0", "any length"], ["10", "10 s"], ["60", "1 min"], ["300", "5 min"]].map(([v, l]) => (
              <option key={v} value={v} className="bg-neutral-900">
                {l}
              </option>
            ))}
          </select>
        </label>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Page contains…"
          aria-label="Filter by first page"
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-transparent px-2 py-1 text-sm text-neutral-100 sm:max-w-48"
        />
        <button type="button" onClick={load} className={`${chip} ${chipOff} inline-flex items-center gap-1`} aria-label="Refresh replays">
          <RefreshCw className="size-3.5" aria-hidden /> Refresh
        </button>
      </div>
      {stars.saved === "browser" && (
        <p className="mb-2 text-xs text-amber-200">Star saved in this browser only: paste the new Replay.gs in Apps Script to keep stars on every device.</p>
      )}
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : !rows ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-400">{which === "starred" ? "No starred replays yet. Press the star next to a replay to keep it here." : which === "showcase" ? "No showcases yet. Sign in with the team account and press the red record button next to your e-mail at the top." : "No recordings match. Visitors are recorded only after they accept cookies."}</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {rows.map((r) => (
            <li key={r.session} className="flex items-center gap-1">
              <StarButton on={stars.isStarred(r)} onClick={() => void stars.toggle(r)} label={`replay from ${when(r.started_at)}`} />
              <button type="button" onClick={() => setOpen(r)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-left hover:bg-white/[0.04]">
                <Play className="size-4 shrink-0 text-sky-300" aria-hidden />
                <span className="w-24 text-xs tabular-nums text-neutral-400">{when(r.started_at)}</span>
                <span className="w-12 text-sm tabular-nums text-neutral-100">{clock(r.duration_ms)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-100">{r.first_path || "/"}</span>
                <span className="text-xs text-neutral-400">
                  {r.pages} {r.pages === 1 ? "page" : "pages"} · {r.clicks} clicks{r.rage_clicks ? ` · ${r.rage_clicks} rage` : ""} · {r.device} {flag(r.country)} · {r.source}
                </span>
                {r.session.startsWith("show_") ? (
                  <span className="rounded bg-red-500/20 px-1.5 text-[10px] font-bold text-red-200">SHOWCASE</span>
                ) : (
                  r.test && <span className="rounded bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-200">TEST</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PlayerApi = { goto: (t: number, play?: boolean) => void; $destroy: () => void; triggerResize: () => void };

function ReplayPlayer({ token, row, onBack, starred, onStar }: { token: string; row: ReplayRow; onBack: () => void; starred: boolean; onStar: () => void }) {
  const [events, setEvents] = useState<RrEvent[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerApi | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: RrEvent[] = [];
      let parts = 1;
      for (let part = 0; part < parts && alive; part++) {
        setProgress(parts > 1 ? `Loading ${part + 1}/${parts}…` : "Loading…");
        const r = await ownerFetch<GetPart>(token, { route: "replays", op: "get", session: row.session, part: String(part) });
        if (failed(r)) return alive && setError(explain(r.error));
        parts = r.parts || 1;
        for (const c of r.chunks ?? []) all.push(...(c.events ?? []));
        if (part === 0 && r.events) setAnalytics(r.events);
      }
      if (!alive) return;
      all.sort((a, b) => a.timestamp - b.timestamp);
      setEvents(all);
      setProgress("");
    })();
    return () => {
      alive = false;
    };
  }, [token, row.session]);

  // build the player once the events are in; width follows the box, height keeps the recorded aspect ratio
  useEffect(() => {
    if (!events || events.length < 2 || !host.current) return;
    let alive = true;
    const target = host.current;
    (async () => {
      const { default: RrwebPlayer } = await import("rrweb-player");
      if (!alive) return;
      const metaEv = events.find((e) => e.type === 4 && e.data?.width);
      const w = Math.max(280, Math.floor(target.getBoundingClientRect().width));
      const ratio = metaEv?.data?.width && metaEv.data.height ? metaEv.data.height / metaEv.data.width : 0.62;
      const h = Math.min(Math.round(w * ratio), Math.round(window.innerHeight * 0.7));
      target.innerHTML = "";
      player.current = new RrwebPlayer({
        target,
        props: { events: events as never, width: w, height: h, autoPlay: false, skipInactive: true, speedOption: [1, 2, 4, 8], showController: true, mouseTail: false, UNSAFE_replayCanvas: true },
      }) as unknown as PlayerApi;
    })();
    return () => {
      alive = false;
      player.current?.$destroy();
      player.current = null;
    };
  }, [events]);

  const start = events?.[0]?.timestamp ?? 0;
  const end = events?.[events.length - 1]?.timestamp ?? 0;
  const marks = useMemo(() => (events ? markers(events, analytics).filter((m) => m.t >= start && m.t <= end + 1000) : []), [events, analytics, start, end]);
  const jump = (t: number) => player.current?.goto(Math.max(0, t - start - 500), true);
  const span = Math.max(1, end - start);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={onBack} className={`${chip} ${chipOff}`}>
          ← All replays
        </button>
        <StarButton on={starred} onClick={onStar} label="this replay" />
        <span className="text-neutral-300">
          {when(row.started_at)} · {clock(row.duration_ms)} · {row.first_path} · {row.device} {flag(row.country)} · {row.source}
        </span>
        {row.test && <span className="rounded bg-amber-400/20 px-1.5 text-[10px] font-bold text-amber-200">TEST</span>}
      </div>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : !events ? (
        <p className="text-sm text-neutral-400">{progress}</p>
      ) : events.length < 2 ? (
        <p className="text-sm text-neutral-400">This recording is too short to play.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div ref={host} className="replay-host w-full overflow-hidden rounded-xl bg-white" data-testid="replay-player" />
            <div className="relative mt-3 h-6 rounded-md bg-white/[0.06]" role="list" aria-label="Timeline markers">
              {marks.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  title={`${clock(m.t - start)} · ${m.label}`}
                  aria-label={`${m.kind} at ${clock(m.t - start)}: ${m.label}`}
                  onClick={() => jump(m.t)}
                  className="absolute top-1 h-4 w-1.5 -translate-x-1/2 rounded-sm"
                  style={{ left: `${((m.t - start) / span) * 100}%`, background: KIND_COLOR[m.kind] }}
                />
              ))}
            </div>
            <p className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-neutral-400">
              {(Object.keys(KIND_COLOR) as Marker["kind"][]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className="inline-block size-2 rounded-sm" style={{ background: KIND_COLOR[k] }} />
                  {k === "rage" ? "rage click" : k === "form" ? "form sent" : k}
                </span>
              ))}
            </p>
          </div>
          <ol className="max-h-[420px] overflow-auto rounded-xl border border-white/10 text-sm" aria-label="Session events">
            {marks
              .filter((m) => m.kind !== "click")
              .map((m, i) => (
                <li key={i}>
                  <button type="button" onClick={() => jump(m.t)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/[0.05]">
                    <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-neutral-400">{clock(m.t - start)}</span>
                    <span className="inline-block size-2 shrink-0 rounded-sm" style={{ background: KIND_COLOR[m.kind] }} />
                    <span className="truncate text-neutral-200">{m.label}</span>
                  </button>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
