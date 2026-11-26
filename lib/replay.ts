/**
 * Session recording for owner-only replays (PostHog-style, our own collector).
 *
 * Methodology: two modes share one rrweb recorder (MIT, pinned), never both at once.
 * - Visit: loaded on demand by lib/collect.ts, and only when the collector is configured, the visitor
 *   clicked Accept, and the browser does not send Do-Not-Track / Global Privacy Control (collect.ts never
 *   starts otherwise). Privacy on by default: every input is masked, text inside forms and the survey is
 *   masked, video and canvas (the game) are blocked and shown as empty boxes of the same size.
 * - Showcase: started by a team account with the Record button (components/analytics/showcase-recorder.tsx)
 *   to record a demo of the site. It gets its own session id ("show_…"), is always flagged test, keeps
 *   recording across page loads in the tab until Stop or 15 minutes, and also records the game canvas
 *   (2 frames/s, WebP) and the demo videos. Inputs stay masked.
 * Events are sent every 10 s or 200 events as text/plain chunks of at most 900 KB
 * (`{type:"replay", session, anon, seq, t0, events, version, test, meta}`), with a beacon when the tab is
 * hidden. The chunk counter survives page loads in the tab.
 */
import { collectConsent, collectUrl, replayContext } from "@/lib/collect";
import { splitChunks } from "@/lib/replay-core.mjs";

/** Share of consenting visitors that are recorded (1 = all). */
export const REPLAY_SAMPLE_RATE = 1;
const FLUSH_MS = 10_000;
const FLUSH_EVENTS = 200;
// the first full snapshot carries the page's CSS inline (so old replays still look right after a redeploy): ~300 KB here
const MAX_CHUNK_BYTES = 900 * 1024;
const MAX_SESSION_MS = 15 * 60 * 1000;
const SEQ_KEY = { visit: "nauino:rseq", showcase: "nauino:sseq" } as const;
const SAMPLE_KEY = "nauino:rsample";
const SHOW_KEY = "nauino:show";
/** Fired on window when a showcase recording starts or stops. */
export const SHOWCASE_EVENT = "nauino:showcase";

type Mode = "visit" | "showcase";
type RrEvent = { type: number; timestamp: number; data?: unknown };

let stopFn: (() => void) | undefined;
let mode: Mode | undefined;
let buffer: RrEvent[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let startedAt = 0;
let hideHandler: (() => void) | undefined;
let pageHideHandler: (() => void) | undefined;

function sessionStore(key: string, value?: string | null): string | null {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The running showcase in this tab: its session id and start time, or null. */
export function showcaseInfo(): { session: string; started: number } | null {
  const [session, started] = (sessionStore(SHOW_KEY) ?? "").split("|");
  if (!session || !Number(started)) return null;
  if (Date.now() - Number(started) > MAX_SESSION_MS) {
    sessionStore(SHOW_KEY, null);
    return null;
  }
  return { session, started: Number(started) };
}

/** Next chunk number for this session, kept across page loads in the tab: "session|seq|started". */
function nextSeq(m: Mode, session: string): { seq: number; started: number } {
  const [sid, seq, started] = (sessionStore(SEQ_KEY[m]) ?? "").split("|");
  const same = sid === session;
  const n = same ? Number(seq) + 1 : 0;
  const s = same && Number(started) ? Number(started) : Date.now();
  sessionStore(SEQ_KEY[m], `${session}|${n}|${s}`);
  return { seq: n, started: s };
}

function sampled(): boolean {
  const saved = sessionStore(SAMPLE_KEY);
  if (saved === "1" || saved === "0") return saved === "1";
  const yes = Math.random() < REPLAY_SAMPLE_RATE;
  sessionStore(SAMPLE_KEY, yes ? "1" : "0");
  return yes;
}

function flush(beacon = false) {
  if (!buffer.length || !collectUrl || !mode) return;
  const m = mode;
  const events = buffer;
  buffer = [];
  const ctx = replayContext();
  const show = m === "showcase" ? showcaseInfo() : null;
  if (m === "showcase" && !show) return;
  const session = show ? show.session : ctx.session;
  for (const group of splitChunks(events, MAX_CHUNK_BYTES - 2048)) {
    const { seq, started } = nextSeq(m, session);
    if (Date.now() - started > MAX_SESSION_MS) {
      if (m === "showcase") stopShowcase();
      else stopReplay();
      return;
    }
    // "type" first: the collector routes replay chunks before its normal size limit by looking at the start
    const body = JSON.stringify({
      type: "replay",
      session,
      anon: ctx.anon,
      seq,
      t0: group[0]?.timestamp ?? Date.now(),
      events: group,
      version: ctx.version,
      test: m === "showcase" ? true : ctx.test,
      meta: { path: ctx.path, device: ctx.device, country: ctx.country, utm_source: m === "showcase" ? "showcase" : ctx.utm_source, referrer_host: ctx.referrer_host },
    });
    if (beacon && body.length < 60_000 && navigator.sendBeacon?.(collectUrl, new Blob([body], { type: "text/plain" }))) continue;
    fetch(collectUrl, { method: "POST", mode: "no-cors", keepalive: beacon && body.length < 60_000, headers: { "Content-Type": "text/plain" }, body }).catch(() => {});
  }
}

async function begin(m: Mode) {
  const { record } = await import("rrweb");
  if (stopFn) return;
  if (m === "visit" && (collectConsent() !== "granted" || showcaseInfo())) return;
  if (m === "showcase" && !showcaseInfo()) return;
  mode = m;
  startedAt = Date.now();
  const show = m === "showcase";
  stopFn =
    record({
      emit(e) {
        buffer.push(e as RrEvent);
        if (buffer.length >= FLUSH_EVENTS) flush();
      },
      maskAllInputs: true,
      maskTextSelector: "[data-private], .lp-form, .gf, input, textarea",
      blockSelector: show ? "[data-no-replay]" : "[data-no-replay], video, canvas",
      recordCanvas: show,
      dataURLOptions: show ? { type: "image/webp", quality: 0.6 } : undefined,
      recordCrossOriginIframes: false,
      slimDOMOptions: "all",
      sampling: { mousemove: 50, scroll: 150, input: "last", ...(show ? { canvas: 2 } : {}) },
    }) ?? undefined;
  timer = setInterval(() => {
    flush();
    const cap = show ? (showcaseInfo()?.started ?? 0) : startedAt;
    if (Date.now() - cap > MAX_SESSION_MS) {
      if (show) stopShowcase();
      else stopReplay();
    }
  }, FLUSH_MS);
  hideHandler = () => {
    if (document.visibilityState === "hidden") flush(true);
  };
  pageHideHandler = () => flush(true);
  document.addEventListener("visibilitychange", hideHandler);
  window.addEventListener("pagehide", pageHideHandler);
}

function end(send: boolean) {
  if (!stopFn) return;
  stopFn();
  stopFn = undefined;
  if (timer) clearInterval(timer);
  timer = undefined;
  if (hideHandler) document.removeEventListener("visibilitychange", hideHandler);
  if (pageHideHandler) window.removeEventListener("pagehide", pageHideHandler);
  if (send) flush();
  else buffer = [];
  mode = undefined;
}

/** Start recording a visit if allowed (consent granted, collector set, sampled in, under the 15-minute cap, no showcase running). */
export async function startReplay() {
  if (stopFn || typeof window === "undefined" || !collectUrl || collectConsent() !== "granted" || showcaseInfo() || !sampled()) return;
  const [sid, , started] = (sessionStore(SEQ_KEY.visit) ?? "").split("|");
  if (sid === replayContext().session && Number(started) && Date.now() - Number(started) > MAX_SESSION_MS) return;
  await begin("visit");
}

/** Stop recording a visit (Decline, or the 15-minute cap); whatever is buffered is sent first. */
export function stopReplay() {
  if (mode !== "visit") return;
  end(collectConsent() === "granted");
}

/** Start a showcase recording (team accounts only, from the Record button). */
export async function startShowcase() {
  if (typeof window === "undefined" || !collectUrl || showcaseInfo()) return;
  if (mode === "visit") end(collectConsent() === "granted");
  const id = `show_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  sessionStore(SHOW_KEY, `${id}|${Date.now()}`);
  window.dispatchEvent(new CustomEvent(SHOWCASE_EVENT));
  await begin("showcase");
}

/** Keep a showcase going after a page load in the same tab. */
export async function resumeShowcase() {
  if (typeof window === "undefined" || !collectUrl || stopFn || !showcaseInfo()) return;
  await begin("showcase");
}

/** Stop the showcase: send what is buffered, then let normal visit recording resume if the visitor consented. */
export function stopShowcase() {
  if (mode === "showcase") end(true);
  sessionStore(SHOW_KEY, null);
  window.dispatchEvent(new CustomEvent(SHOWCASE_EVENT));
  void startReplay();
}
