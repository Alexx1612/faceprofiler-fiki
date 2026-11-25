/**
 * Pure helpers for session replays, shared by the recorder (lib/replay.ts), the viewer
 * (components/site/replays.tsx) and the Node tests (collector/replay.test.mjs).
 *
 * Methodology: rrweb events are plain JSON; a chunk is sent as one text/plain POST, so chunks are split
 * by their JSON size (never cutting an event in two). Markers for the player timeline follow rrweb's event
 * model: type 4 = Meta (a page load or navigation, with `data.href`), type 3 = incremental snapshot, where
 * source 2 / type 2 is a mouse click. Rage clicks use PostHog's rule: 3 or more clicks within 1 s and 30 px.
 */

/**
 * Split events into groups whose JSON stays under maxBytes (a single larger event gets its own group).
 * @param {unknown[]} events
 * @param {number} maxBytes
 * @returns {unknown[][]}
 */
export function splitChunks(events, maxBytes) {
  const out = [];
  let cur = [];
  let used = 2;
  for (const e of events) {
    const n = JSON.stringify(e).length + 1;
    if (cur.length && used + n > maxBytes) {
      out.push(cur);
      cur = [];
      used = 2;
    }
    cur.push(e);
    used += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

/**
 * Start times of rage clicks: 3+ clicks within 1 s and 30 px of the first.
 * @param {{t: number, x: number, y: number}[]} clicks sorted by time
 * @returns {number[]}
 */
export function rageClicks(clicks) {
  const out = [];
  for (let i = 0; i < clicks.length; i++) {
    let n = 1;
    for (let j = i + 1; j < clicks.length && clicks[j].t - clicks[i].t <= 1000; j++) {
      if (Math.abs(clicks[j].x - clicks[i].x) <= 30 && Math.abs(clicks[j].y - clicks[i].y) <= 30) n++;
    }
    if (n >= 3) {
      out.push(clicks[i].t);
      while (i + 1 < clicks.length && clicks[i + 1].t - clicks[i].t <= 1000) i++;
    }
  }
  return out;
}

/**
 * Timeline markers from rrweb events plus the session's analytics events.
 * @param {{type: number, timestamp: number, data?: any}[]} events rrweb events, sorted
 * @param {{ts: number, event: string, path?: string, label?: string}[]} [analytics]
 * @returns {{t: number, kind: "page" | "click" | "rage" | "form" | "event", label: string}[]}
 */
export function markers(events, analytics = []) {
  const out = [];
  const clicks = [];
  for (const e of events) {
    if (e.type === 4 && e.data && e.data.href) {
      let path = String(e.data.href);
      try {
        path = new URL(path).pathname;
      } catch {
        /* keep as is */
      }
      out.push({ t: e.timestamp, kind: "page", label: path });
    } else if (e.type === 3 && e.data && e.data.source === 2 && e.data.type === 2) {
      clicks.push({ t: e.timestamp, x: Number(e.data.x), y: Number(e.data.y) });
      out.push({ t: e.timestamp, kind: "click", label: "click" });
    }
  }
  for (const t of rageClicks(clicks)) out.push({ t, kind: "rage", label: "rage click" });
  for (const a of analytics) {
    if (!a || !Number.isFinite(Number(a.ts)) || a.event === "$pageview" || a.event === "$pageleave" || a.event === "$autocapture") continue;
    const form = /_submitted$|_requested$/.test(String(a.event));
    out.push({ t: Number(a.ts), kind: form ? "form" : "event", label: String(a.label || a.event).slice(0, 60) });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Format a duration in ms as "m:ss" (or "h:mm:ss").
 * @param {number} ms
 */
export function clock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
