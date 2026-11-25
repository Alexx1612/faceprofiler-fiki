/**
 * Session recording for owner-only replays (PostHog-style, our own collector).
 *
 * Methodology: loaded on demand by lib/collect.ts, and only when the collector is configured, the visitor
 * clicked Accept, and the browser does not send Do-Not-Track / Global Privacy Control (collect.ts never
 * starts otherwise). rrweb (MIT, pinned) records the page with privacy on by default: every input is masked,
 * text inside forms and the survey is masked, video and canvas (the game) are blocked and shown as empty
 * boxes of the same size. Events are sent every 10 s or 200 events as text/plain chunks of at most 900 KB
 * (`{type:"replay", session, anon, seq, t0, events, version, test, meta}`), with a beacon when the tab is
 * hidden. A session is recorded for at most 15 minutes; the chunk counter survives page loads in the tab.
 * Test-mode traffic is recorded too, flagged `test`.
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
const SEQ_KEY = "nauino:rseq";
const SAMPLE_KEY = "nauino:rsample";

type RrEvent = { type: number; timestamp: number; data?: unknown };

let stopFn: (() => void) | undefined;
let buffer: RrEvent[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let startedAt = 0;
let hideHandler: (() => void) | undefined;

function sessionStore(key: string, value?: string): string | null {
  try {
    if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Next chunk number for this session, kept across page loads in the tab: "session|seq|started". */
function nextSeq(session: string): { seq: number; started: number } {
  const [sid, seq, started] = (sessionStore(SEQ_KEY) ?? "").split("|");
  const same = sid === session;
  const n = same ? Number(seq) + 1 : 0;
  const s = same && Number(started) ? Number(started) : Date.now();
  sessionStore(SEQ_KEY, `${session}|${n}|${s}`);
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
  if (!buffer.length || !collectUrl) return;
  const events = buffer;
  buffer = [];
  const ctx = replayContext();
  for (const group of splitChunks(events, MAX_CHUNK_BYTES - 2048)) {
    const { seq, started } = nextSeq(ctx.session);
    if (Date.now() - started > MAX_SESSION_MS) {
      stopReplay();
      return;
    }
    // "type" first: the collector routes replay chunks before its normal size limit by looking at the start
    const body = JSON.stringify({
      type: "replay",
      session: ctx.session,
      anon: ctx.anon,
      seq,
      t0: group[0]?.timestamp ?? Date.now(),
      events: group,
      version: ctx.version,
      test: ctx.test,
      meta: { path: ctx.path, device: ctx.device, country: ctx.country, utm_source: ctx.utm_source, referrer_host: ctx.referrer_host },
    });
    if (beacon && body.length < 60_000 && navigator.sendBeacon?.(collectUrl, new Blob([body], { type: "text/plain" }))) continue;
    fetch(collectUrl, { method: "POST", mode: "no-cors", keepalive: beacon && body.length < 60_000, headers: { "Content-Type": "text/plain" }, body }).catch(() => {});
  }
}

/** Start recording if allowed (consent granted, collector set, sampled in, under the 15-minute cap). */
export async function startReplay() {
  if (stopFn || typeof window === "undefined" || !collectUrl || collectConsent() !== "granted" || !sampled()) return;
  const [sid, , started] = (sessionStore(SEQ_KEY) ?? "").split("|");
  if (sid === replayContext().session && Number(started) && Date.now() - Number(started) > MAX_SESSION_MS) return;
  const { record } = await import("rrweb");
  if (stopFn || collectConsent() !== "granted") return;
  startedAt = Date.now();
  stopFn =
    record({
      emit(e) {
        buffer.push(e as RrEvent);
        if (buffer.length >= FLUSH_EVENTS) flush();
      },
      maskAllInputs: true,
      maskTextSelector: "[data-private], .lp-form, .gf, input, textarea",
      blockSelector: "[data-no-replay], video, canvas",
      recordCrossOriginIframes: false,
      slimDOMOptions: "all",
      sampling: { mousemove: 50, scroll: 150, input: "last" },
    }) ?? undefined;
  timer = setInterval(() => {
    flush();
    if (Date.now() - startedAt > MAX_SESSION_MS) stopReplay();
  }, FLUSH_MS);
  hideHandler = () => {
    if (document.visibilityState === "hidden") flush(true);
  };
  document.addEventListener("visibilitychange", hideHandler);
  window.addEventListener("pagehide", () => flush(true));
}

/** Stop recording (Decline, or the 15-minute cap); whatever is buffered is sent first. */
export function stopReplay() {
  if (!stopFn) return;
  stopFn();
  stopFn = undefined;
  if (timer) clearInterval(timer);
  timer = undefined;
  if (hideHandler) document.removeEventListener("visibilitychange", hideHandler);
  if (collectConsent() === "granted") flush();
  else buffer = [];
}
