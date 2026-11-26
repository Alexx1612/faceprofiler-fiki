/**
 * Our own event capture for the Google Sheet collector (collector/Code.gs), shaped like posthog-js.
 *
 * Methodology:
 * - Off unless NEXT_PUBLIC_COLLECT_URL is set; also off for Do-Not-Track / Global Privacy Control.
 * - Anonymous id: random, kept in sessionStorage (this tab only, so no cross-visit tracking) until the
 *   visitor accepts the consent bar; after Accept it moves to localStorage. Never derived from the device.
 * - Session id: new after 30 minutes without events. Every event carries the site version (lib/versions.ts),
 *   path, landing page of the session, referring host (not the full URL, and none for our own pages), utm_* from the landing URL
 *   (kept for the session), device bucket, OS and browser family, in-app browser (Facebook, Instagram…),
 *   screen-width bucket, language and time zone. No IP, no user-agent string.
 * - Approximate location: the country is guessed from the browser's time zone (no network call). Only after
 *   the visitor clicks Accept, one lookup per session asks a free geo-IP service for country and region;
 *   only the country code, country name and region are kept and sent, never the IP, city or coordinates.
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
/** The collector/Code.gs version this site expects; /analytics/ asks the owner to update the Apps Script when it reports an older one. Kept equal to COLLECTOR_VERSION by a test. */
export const EXPECTED_COLLECTOR = "1.4";
const build = process.env.NEXT_PUBLIC_SITE_BUILD ?? "";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const K = { test: "nauino:test", anon: "nauino:aid", consent: "nauino:consent", session: "nauino:sid", seen: "nauino:seen", utm: "nauino:utm", landing: "nauino:land", geo: "nauino:geo" };

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

/**
 * The team's own accounts count as test traffic: SHA-256 hashes (hex) of their e-mails, Gmail-normalised,
 * from NEXT_PUBLIC_TEST_EMAIL_HASHES (comma list, set in the git-ignored .env.local). Only hashes ship in the
 * site, never the addresses.
 */
const testEmailHashes = (process.env.NEXT_PUBLIC_TEST_EMAIL_HASHES ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

/** Gmail ignores dots and "+tags": a.b+x@gmail.com is ab@gmail.com (same rule as collector/Owner.gs). */
export function sameMailbox(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 0) return e;
  const name = e.slice(0, at), domain = e.slice(at + 1);
  return domain === "gmail.com" || domain === "googlemail.com" ? `${name.split("+")[0].replace(/\./g, "")}@gmail.com` : e;
}

/** After a Google sign-in: if it is one of the team's accounts, switch this browser to test mode. */
export async function markTestAccount(email: string): Promise<boolean> {
  if (!(await isTeamEmail(email))) return false;
  setTestMode(true);
  return true;
}

/** Whether an e-mail is one of the team's own accounts (compared by SHA-256 hash; only hashes ship). */
export async function isTeamEmail(email: string): Promise<boolean> {
  if (!testEmailHashes.length || typeof crypto === "undefined" || !crypto.subtle) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sameMailbox(email)));
  const hex = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
  return testEmailHashes.includes(hex);
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
  if (/Edg(A|iOS)?\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox\/|FxiOS\//.test(ua)) return "firefox";
  if (/Chrome\/|CriOS\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

/** Operating system family from the user agent (the string itself is never sent). */
function os(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/CrOS/.test(ua)) return "chromeos";
  if (/Mac OS X|Macintosh/.test(ua)) return "macos";
  if (/Linux/.test(ua)) return "linux";
  return "other";
}

/** The app whose built-in browser opened the page, if any (links shared in chats and feeds). */
function inApp(): string {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return "facebook";
  if (/Instagram/.test(ua)) return "instagram";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  if (/LinkedInApp/.test(ua)) return "linkedin";
  if (/TikTok|musical_ly|BytedanceWebview/.test(ua)) return "tiktok";
  if (/Snapchat/.test(ua)) return "snapchat";
  if (/GSA\//.test(ua)) return "google-app";
  if (/; wv\)/.test(ua)) return "webview";
  return "";
}

function screenBucket(): string {
  const w = screen?.width || window.innerWidth;
  return w < 360 ? "<360" : w < 400 ? "360-399" : w < 768 ? "400-767" : w < 1024 ? "768-1023" : w < 1440 ? "1024-1439" : "1440+";
}

/** Common time zones → country (code, name). Unknown zones still send the zone itself. */
const TZ_COUNTRY: Record<string, [string, string]> = {
  "Europe/Bucharest": ["RO", "Romania"], "Europe/Chisinau": ["MD", "Moldova"], "Europe/London": ["GB", "United Kingdom"],
  "Europe/Dublin": ["IE", "Ireland"], "Europe/Berlin": ["DE", "Germany"], "Europe/Paris": ["FR", "France"],
  "Europe/Rome": ["IT", "Italy"], "Europe/Madrid": ["ES", "Spain"], "Europe/Lisbon": ["PT", "Portugal"],
  "Europe/Vienna": ["AT", "Austria"], "Europe/Budapest": ["HU", "Hungary"], "Europe/Sofia": ["BG", "Bulgaria"],
  "Europe/Athens": ["GR", "Greece"], "Europe/Amsterdam": ["NL", "Netherlands"], "Europe/Brussels": ["BE", "Belgium"],
  "Europe/Warsaw": ["PL", "Poland"], "Europe/Prague": ["CZ", "Czechia"], "Europe/Zurich": ["CH", "Switzerland"],
  "Europe/Stockholm": ["SE", "Sweden"], "Europe/Oslo": ["NO", "Norway"], "Europe/Copenhagen": ["DK", "Denmark"],
  "Europe/Helsinki": ["FI", "Finland"], "Europe/Istanbul": ["TR", "Turkey"], "Europe/Kyiv": ["UA", "Ukraine"],
  "Europe/Kiev": ["UA", "Ukraine"], "Europe/Belgrade": ["RS", "Serbia"], "Europe/Bratislava": ["SK", "Slovakia"],
  "America/New_York": ["US", "United States"], "America/Chicago": ["US", "United States"], "America/Denver": ["US", "United States"],
  "America/Los_Angeles": ["US", "United States"], "America/Toronto": ["CA", "Canada"], "Asia/Dubai": ["AE", "United Arab Emirates"],
  "Australia/Sydney": ["AU", "Australia"],
};

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

type Geo = { country: string; country_name: string; region: string; geo_how: "ip" | "tz" | "" };

/** Approximate location: the IP lookup result for this session when there is one, else the time-zone guess. */
function geo(tz: string): Geo {
  try {
    const saved = JSON.parse(store.get("session", K.geo) ?? "null") as Geo | null;
    if (saved?.country) return saved;
  } catch {
    /* ignore */
  }
  const c = TZ_COUNTRY[tz];
  return c ? { country: c[0], country_name: c[1], region: "", geo_how: "tz" } : { country: "", country_name: "", region: "", geo_how: "" };
}

let geoAsked = false;
/**
 * After consent only: one lookup per session to a free geo-IP service (ipwho.is, then ipapi.co), 3 s timeout.
 * Keeps country code, country name and region; the IP, city and coordinates in the reply are dropped here.
 */
async function lookupGeo() {
  if (geoAsked || store.get("local", K.consent) !== "granted" || store.get("session", K.geo)) return;
  geoAsked = true;
  const tries: [string, (j: Record<string, unknown>) => Geo | null][] = [
    ["https://ipwho.is/?fields=success,country_code,country,region", (j) => (j.success === false ? null : { country: String(j.country_code ?? ""), country_name: String(j.country ?? ""), region: String(j.region ?? ""), geo_how: "ip" })],
    ["https://ipapi.co/json/", (j) => (j.error ? null : { country: String(j.country_code ?? ""), country_name: String(j.country_name ?? ""), region: String(j.region ?? ""), geo_how: "ip" })],
  ];
  for (const [url, read] of tries) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(url, { signal: ctl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      clearTimeout(t);
      if (!r.ok) continue;
      const g = read(await r.json());
      if (g && /^[A-Z]{2}$/.test(g.country)) {
        store.set("session", K.geo, JSON.stringify({ ...g, country_name: g.country_name.slice(0, 40), region: g.region.slice(0, 60) }));
        return;
      }
    } catch {
      /* blocked, offline or rate-limited: keep the time-zone guess */
    }
  }
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

/** Who is visiting: device facts and approximate location, the same on every event of the session. */
function who() {
  const tz = timeZone();
  const lang = (navigator.language || "").slice(0, 2).toLowerCase();
  return { os: os(), browser: browser(), in_app: inApp(), screen: screenBucket(), lang: /^[a-z]{2}$/.test(lang) ? lang : "", tz, ...geo(tz) };
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
    ...who(),
    ...utm(),
    ...(testMode() ? { test: true } : {}),
  };
}
// @provenance:capture:end

/**
 * Context for session replays (lib/replay.ts): the same anonymous and session ids as the analytics events,
 * so a recording can be matched with its events, plus the facts the replay list shows.
 */
export function replayContext() {
  const now = Date.now();
  const b = base(now);
  return { anon: b.anon, session: b.session, version: siteVersion, test: testMode(), path: b.path, device: b.device, country: b.country ?? "", utm_source: String((b as Record<string, unknown>).utm_source ?? ""), referrer_host: b.referrer_host };
}

/** Start or stop replay recording (lazy: rrweb is only downloaded when recording is allowed). */
function replay(on: boolean) {
  void import("@/lib/replay").then((m) => (on ? m.startReplay() : m.stopReplay())).catch(() => {});
}

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
  queue.push({ ...base(now), event, label: label ?? "", props: { ...props } });
  if (queue.length >= 20) flush();
}

function pageview() {
  if (location.pathname === lastPath) return;
  if (lastPath) leave();
  lastPath = location.pathname;
  pageStart = Date.now();
  maxScroll = scrollPct();
  collect("$pageview", { title: document.title.slice(0, 80) });
}

function leave() {
  if (!lastPath) return;
  const now = Date.now();
  queue.push({ ...base(now), path: lastPath, event: "$pageleave", label: "", props: { duration_ms: now - pageStart, scroll_pct: maxScroll } });
}

/* PostHog-style extras: click position for heatmaps, rage and dead clicks, scroll depth. */
let maxScroll = 0;

/** How far down the page the visitor has seen, in % of the document height (bottom of the viewport). */
function scrollPct(): number {
  const h = document.documentElement.scrollHeight || 1;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / h) * 100));
}

/** Click position in % of the document (rounded to 1 %) and the viewport bucket, for heatmaps. */
function clickPos(e: MouseEvent) {
  const w = document.documentElement.scrollWidth || 1;
  const h = document.documentElement.scrollHeight || 1;
  return { x: Math.round((e.pageX / w) * 100), y: Math.round((e.pageY / h) * 100), vp: device() };
}

// a function, not a constant: CLICKABLE is declared further down this module
const interactive = () => `${CLICKABLE_SEL}, input, select, textarea, label, video, canvas, [contenteditable], [tabindex]`;
let recent: { t: number; x: number; y: number }[] = [];
let rageAt = 0;

/** Short label for any element (for rage / dead clicks): data-track, aria-label, else tag + a few words. */
function anyLabel(el: Element): string {
  const c = el.closest(CLICKABLE_SEL);
  if (c) return clickLabel(c);
  const text = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
  return `${el.tagName.toLowerCase()}${text ? `: ${text}` : ""}`;
}

/**
 * Rage click: 3 or more clicks within 1 s and 30 px (one event per burst). Dead click: a click on something
 * that is not interactive and changes nothing (no navigation, no DOM change, no scroll) within 1 s.
 */
function onFrustration(e: MouseEvent) {
  const target = e.target as Element | null;
  if (!target?.closest) return;
  const now = Date.now();
  recent = recent.filter((c) => now - c.t < 1000 && Math.hypot(c.x - e.clientX, c.y - e.clientY) <= 30);
  recent.push({ t: now, x: e.clientX, y: e.clientY });
  if (recent.length >= 3 && now - rageAt > 1000) {
    rageAt = now;
    collect("$rageclick", clickPos(e), anyLabel(target));
  }
  if (target.closest(interactive())) return;
  const href = location.href;
  const y = window.scrollY;
  let changed = false;
  const mo = new MutationObserver(() => (changed = true));
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  const pos = clickPos(e);
  setTimeout(() => {
    mo.disconnect();
    if (!changed && location.href === href && Math.abs(window.scrollY - y) < 5) collect("$deadclick", pos, anyLabel(target));
  }, 1000);
}

function onScroll() {
  maxScroll = Math.max(maxScroll, scrollPct());
}

const CLICKABLE = "a, button, [role=button], summary, input[type=submit], [data-track]";
const CLICKABLE_SEL = CLICKABLE;

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
  collect("$autocapture", { tag: el.tagName.toLowerCase(), href: href.slice(0, 120), ...clickPos(e) }, label);
}

/** Start capture once per page load. Safe to call many times; does nothing without a collector URL. */
export function startCollect() {
  if (started || !collectUrl || typeof window === "undefined") return;
  // pages shown inside a frame (the owner's heatmap view) are not visits
  if (window.self !== window.top) return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
  started = true;
  void lookupGeo();
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
  document.addEventListener("click", onFrustration, { capture: true, passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  // Hidden tab = the visitor left or switched away: record time on page so far and send with a beacon.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leave();
      flush(true);
    } else pageStart = Date.now();
  });
  window.addEventListener("pagehide", () => flush(true));
  timer ??= setInterval(() => flush(), 5000);
  if (store.get("local", K.consent) === "granted") replay(true);
}

/** Remember the consent choice; after Accept the anonymous id may persist across visits. */
export function setCollectConsent(accept: boolean) {
  store.set("local", K.consent, accept ? "granted" : "denied");
  if (accept) {
    store.set("local", K.anon, anonId());
    void lookupGeo();
  }
  if (started) replay(accept);
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
    // time since page load: the inbox flags very fast (bot-like) submits as "spam?"
    data: { ...data, elapsed_ms: String(Math.round(performance.now())) },
    version: siteVersion,
    anon: started ? anonId() : "",
    path: location.pathname + location.search,
    ...(testMode() ? { test: true } : {}),
  });
  await fetch(collectUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body });
}
