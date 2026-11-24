/**
 * Our own event capture for the Google Sheet collector (collector/Code.gs), shaped like posthog-js.
 *
 * Methodology:
 * - Off unless NEXT_PUBLIC_COLLECT_URL is set; also off for Do-Not-Track / Global Privacy Control.
 * - Anonymous id: random, kept in sessionStorage (this tab only, so no cross-visit tracking) until the
 *   visitor accepts the consent bar; after Accept it moves to localStorage. Never derived from the device.
 * - Session id: new after 30 minutes without events. Every event carries the site version (lib/versions.ts),
 *   path, landing page of the session, referring host (not the full URL, and none for our own pages), utm_* from the landing URL
 *   (kept for the session), device bucket and browser family. No IP, no user-agent string.
 * - $pageview on load and on client-side navigation, $pageleave with time on page, $autocapture clicks
 *   on links and buttons with a stable label (data-track, else aria-label, else visible text; never input
 *   values or DOM paths), so click totals add up across site versions.
 * - Test mode (the owner's own traffic): `?test=1` on any page turns it on for this browser (`?test=0`
 *   off); it is also on for localhost and automated browsers (navigator.webdriver). Events and forms then
 *   carry `test: true`; the collector stores them but leaves them out of every number.
 * - Events are batched (every 5 s or 20 events) and sent as text/plain with fetch `no-cors` (Apps Script
 *   cannot answer a CORS preflight); on page hide the queue goes out with navigator.sendBeacon.
 */
import { siteVersion } from "@/lib/versions";

export const collectUrl = process.env.NEXT_PUBLIC_COLLECT_URL ?? "";
const build = process.env.NEXT_PUBLIC_SITE_BUILD ?? "";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const K = { test: "nauino:test", anon: "nauino:aid", consent: "nauino:consent", session: "nauino:sid", seen: "nauino:seen", utm: "nauino:utm", landing: "nauino:land" };

type Props = Record<string, unknown>;
type Event = Record<string, unknown> & { event: string; props?: Props };

let started = false;
const queue: Event[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let pageStart = 0;
let lastPath = "";

const store = {
  get(area: "local" | "session", k: string) {
    try {
      return (area === "local" ? localStorage : sessionStorage).getItem(k);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", k: string, v: string) {
    try {
      (area === "local" ? localStorage : sessionStorage).setItem(k, v);
    } catch {
      /* storage blocked: the id lives for this page only */
    }
  },
};

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/**
 * True for the owner's own traffic. `?test=1` / `?test=0` in the URL saves the choice in this browser;
 * without a saved choice, localhost and automated browsers count as test. Automated browsers always do.
 */
export function testMode(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(location.search).get("test");
  if (q === "1" || q === "0") store.set("local", K.test, q);
  if (navigator.webdriver) return true;
  const saved = store.get("local", K.test);
  if (saved === "1" || saved === "0") return saved === "1";
  return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
}

/** Turn test mode on or off for this browser (the TEST MODE pill calls this). */
export function setTestMode(on: boolean) {
  store.set("local", K.test, on ? "1" : "0");
  window.dispatchEvent(new CustomEvent("nauino:test", { detail: on }));
}

let memoryAnon = "";
/** Anonymous id: localStorage after consent, else this tab's sessionStorage (cookieless). */
function anonId(): string {
  const granted = store.get("local", K.consent) === "granted";
  let id = (granted ? store.get("local", K.anon) : null) ?? store.get("session", K.anon) ?? memoryAnon;
  if (!id) id = rid();
  memoryAnon = id;
  store.set("session", K.anon, id);
  if (granted) store.set("local", K.anon, id);
  return id;
}

/** Session id, renewed after 30 minutes without events. */
function sessionId(now: number): string {
  const [id, seen] = [store.get("session", K.session), Number(store.get("session", K.seen) ?? 0)];
  const sid = id && now - seen < SESSION_IDLE_MS ? id : rid();
  store.set("session", K.session, sid);
  store.set("session", K.seen, String(now));
  return sid;
}

function device(): string {
  const w = Math.min(window.innerWidth, screen?.width || window.innerWidth);
  return w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop";
}

function browser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

// @provenance:capture:start
/*
 * Where the visitor came from: the browser only reports raw facts and the collector classifies them
 * (classifySource in collector/Code.gs). Nothing here guesses a channel.
 */

/**
 * Host of the page that sent the visitor (document.referrer), never its path or query: "l.facebook.com",
 * "www.google.ro", "android-app://com.linkedin.android". "" for our own pages, none, or hidden by the app.
 */
function referrerHost(): string {
  try {
    if (!document.referrer) return "";
    const u = new URL(document.referrer);
    if (u.host === location.host) return "";
    return u.protocol === "android-app:" ? `android-app://${u.host}` : u.host;
  } catch {
    return "";
  }
}

/** First page of the current session (the page the visitor landed on), kept per session id. */
function landingPath(session: string): string {
  const saved = store.get("session", K.landing)?.split("|");
  if (saved?.[0] === session && saved[1]) return saved[1];
  store.set("session", K.landing, `${session}|${location.pathname}`);
  return location.pathname;
}

/** utm_* of the URL the visitor arrived on (the tags in links we shared), kept for the rest of the tab's visit. */
function utm(): Record<string, string> {
  const q = new URLSearchParams(location.search);
  const fresh: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = q.get(k);
    if (v) fresh[k] = v.slice(0, 60);
  }
  if (Object.keys(fresh).length) {
    store.set("session", K.utm, JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(store.get("session", K.utm) ?? "{}");
  } catch {
    return {};
  }
}

/** Fields sent with every event: raw source facts (referrer host, utm_*, landing page) plus context. */
function base(now: number) {
  const session = sessionId(now);
  return {
    id: rid(),
    ts: now,
    version: siteVersion,
    build,
    anon: anonId(),
    session,
    path: location.pathname,
    landing_path: landingPath(session),
    referrer_host: referrerHost(),
    device: device(),
    ...utm(),
    ...(testMode() ? { test: true } : {}),
  };
}
// @provenance:capture:end

function send(events: Event[], beacon = false) {
  if (!events.length) return;
  const body = JSON.stringify({ type: "events", events });
  if (beacon && navigator.sendBeacon?.(collectUrl, new Blob([body], { type: "text/plain" }))) return;
  fetch(collectUrl, { method: "POST", mode: "no-cors", keepalive: beacon, headers: { "Content-Type": "text/plain" }, body }).catch(() => {});
}

function flush(beacon = false) {
  send(queue.splice(0, 50), beacon);
}

/** Queue one event (no-op when the collector is off). */
export function collect(event: string, props?: Props, label?: string) {
  if (!started) return;
  const now = Date.now();
  queue.push({ ...base(now), event, label: label ?? "", props: { browser: browser(), ...props } });
  if (queue.length >= 20) flush();
}

function pageview() {
  if (location.pathname === lastPath) return;
  if (lastPath) leave();
  lastPath = location.pathname;
  pageStart = Date.now();
  collect("$pageview", { title: document.title.slice(0, 80) });
}

function leave() {
  if (!lastPath) return;
  const now = Date.now();
  queue.push({ ...base(now), path: lastPath, event: "$pageleave", label: "", props: { duration_ms: now - pageStart } });
}

const CLICKABLE = "a, button, [role=button], summary, input[type=submit], [data-track]";

/** Stable, short label for a clicked element: data-track, aria-label, or its visible text. */
export function clickLabel(el: Element): string {
  const track = el.closest("[data-track]")?.getAttribute("data-track");
  const raw = track || el.getAttribute("aria-label") || (el as HTMLInputElement).value || el.textContent || "";
  if (el instanceof HTMLInputElement && el.type !== "submit") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 60);
}

function onClick(e: MouseEvent) {
  const el = (e.target as Element | null)?.closest?.(CLICKABLE);
  if (!el) return;
  const label = clickLabel(el);
  if (!label) return;
  const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? "" : "";
  collect("$autocapture", { tag: el.tagName.toLowerCase(), href: href.slice(0, 120) }, label);
}

/** Start capture once per page load. Safe to call many times; does nothing without a collector URL. */
export function startCollect() {
  if (started || !collectUrl || typeof window === "undefined") return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
  started = true;
  pageview();
  for (const m of ["pushState", "replaceState"] as const) {
    const orig = history[m].bind(history);
    history[m] = (...a: Parameters<History["pushState"]>) => {
      orig(...a);
      setTimeout(pageview, 0);
    };
  }
  window.addEventListener("popstate", pageview);
  document.addEventListener("click", onClick, { capture: true });
  // Hidden tab = the visitor left or switched away: record time on page so far and send with a beacon.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leave();
      flush(true);
    } else pageStart = Date.now();
  });
  window.addEventListener("pagehide", () => flush(true));
  timer ??= setInterval(() => flush(), 5000);
}

/** Remember the consent choice; after Accept the anonymous id may persist across visits. */
export function setCollectConsent(accept: boolean) {
  store.set("local", K.consent, accept ? "granted" : "denied");
  if (accept) store.set("local", K.anon, anonId());
}

export function collectConsent(): "granted" | "denied" | "pending" {
  const v = store.get("local", K.consent);
  return v === "granted" || v === "denied" ? v : "pending";
}

/** Post a form to the collector (Formspree-like). `no-cors` hides the reply, so success is assumed. */
export async function collectForm(form: string, data: Record<string, string>): Promise<void> {
  const body = JSON.stringify({
    type: "form",
    form,
    data,
    version: siteVersion,
    anon: started ? anonId() : "",
    path: location.pathname + location.search,
    ...(testMode() ? { test: true } : {}),
  });
  await fetch(collectUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body });
}
