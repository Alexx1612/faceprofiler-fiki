/**
 * Tests for session replay pure functions: collector/Replay.gs (loaded together with Code.gs in one scope,
 * as Apps Script does) and lib/replay-core.mjs (the recorder's chunking and the viewer's markers).
 * Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

import { clock, markers, rageClicks as rageCore, splitChunks } from "../lib/replay-core.mjs";

const src = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const ctx = { module: undefined, console };
vm.createContext(ctx);
vm.runInContext(src("./Code.gs") + "\n" + src("./Replay.gs"), ctx);
const R = ctx;

const click = (t, x, y) => ({ type: 3, timestamp: t, data: { source: 2, type: 2, x, y } });
const meta = (t, href) => ({ type: 4, timestamp: t, data: { href, width: 390, height: 844 } });
const T = Date.UTC(2026, 10, 26, 10, 0, 0);

test("chunks are split by JSON size without cutting events", () => {
  const events = Array.from({ length: 50 }, (_, i) => ({ type: 3, timestamp: i, data: { pad: "x".repeat(100) } }));
  const groups = splitChunks(events, 1200);
  assert.equal(groups.flat().length, 50);
  for (const g of groups) assert.ok(JSON.stringify(g).length <= 1200);
  assert.deepEqual(splitChunks([{ big: "y".repeat(5000) }], 1000).length, 1); // one oversized event keeps its own group
});

test("rage clicks: 3+ clicks within 1 s and 30 px, same rule on server and client", () => {
  const clicks = [
    { t: 0, x: 10, y: 10 }, { t: 200, x: 15, y: 12 }, { t: 400, x: 20, y: 18 }, // rage
    { t: 5000, x: 10, y: 10 }, { t: 5600, x: 300, y: 10 }, { t: 5900, x: 12, y: 10 }, // too far apart in space
    { t: 9000, x: 50, y: 50 }, { t: 9900, x: 50, y: 50 }, { t: 11000, x: 50, y: 50 }, // too far apart in time
  ];
  assert.deepEqual(rageCore(clicks), [0]);
  assert.deepEqual(Array.from(R.rageClicks(clicks)), [0]);
});

test("chunk stats and session row merge", () => {
  const events = [meta(T, "https://x.io/faceprofiler-fiki/landing/"), click(T + 100, 5, 5), click(T + 200, 6, 5), click(T + 300, 7, 6), click(T + 9000, 100, 100)];
  const c = R.cleanChunk(
    { type: "replay", session: "sess-1234", anon: "anon-1234", seq: 0, t0: T, events, version: "v1.20", test: false, meta: { path: "/faceprofiler-fiki/landing/", device: "phone", country: "ro", utm_source: "whatsapp" } },
    T + 10000,
  );
  assert.equal(c.error, undefined);
  assert.equal(c.meta.source, "whatsapp");
  assert.equal(c.meta.country, "RO");
  assert.deepEqual({ clicks: c.stats.clicks, rage: c.stats.rage, pages: c.stats.pages }, { clicks: 4, rage: 1, pages: 1 });
  const row1 = R.mergeReplayRow(null, c, 1000);
  assert.equal(row1.day, "2026-11-26");
  assert.equal(row1.chunks, 1);
  assert.equal(row1.duration_ms, 9000);
  const c2 = R.cleanChunk({ type: "replay", session: "sess-1234", anon: "anon-1234", seq: 1, t0: T + 10000, events: [click(T + 20000, 1, 1)], version: "v1.20", test: true }, T + 30000);
  const row2 = R.mergeReplayRow(row1, c2, 500);
  assert.deepEqual({ chunks: row2.chunks, bytes: row2.bytes, clicks: row2.clicks, duration: row2.duration_ms, test: row2.test }, { chunks: 2, bytes: 1500, clicks: 5, duration: 20000, test: "true" });
  assert.equal(R.cleanChunk({ type: "replay", session: "bad id!", anon: "anon-1234", seq: 0, events: [1] }, T).error, "Bad ids.");
  assert.equal(R.cleanChunk({ type: "replay", session: "sess-1234", anon: "anon-1234", seq: 0, events: [] }, T).error, "No events.");
});

test("replay list filter: real by default, days, minimum duration, path; newest first", () => {
  const row = (session, started, dur, test, path) => ({ session, anon: "abcdefgh", started_at: String(started), last_at: String(started + dur), duration_ms: String(dur), test: test ? "true" : "false", first_path: path, chunks: "1", pages: "1", clicks: "0", rage_clicks: "0" });
  const rows = [row("a", T - 1000, 60000, false, "/landing/"), row("b", T - 500, 5000, false, "/M5/"), row("c", T - 100, 90000, true, "/landing/"), row("d", T - 10 * 86400000, 90000, false, "/landing/")];
  assert.deepEqual(Array.from(R.filterReplays(rows, {}, T), (r) => r.session), ["b", "a"]);
  assert.deepEqual(Array.from(R.filterReplays(rows, { test: "test" }, T), (r) => r.session), ["c"]);
  assert.deepEqual(Array.from(R.filterReplays(rows, { min_s: "30", path: "landing", days: "30" }, T), (r) => r.session), ["a", "d"]);
  assert.equal(R.filterReplays(rows, {}, T)[0].anon, "abcdef");
});

test("live now: sessions active in the last 2 minutes, latest page first-seen order", () => {
  const ev = (session, ts, path, extra = {}) => ({ session, anon: `anon-${session}`, ts, path, device: "phone", source: "whatsapp", ...extra });
  const events = [ev("s1", T - 90000, "/landing/"), ev("s1", T - 10000, "/M5/"), ev("s2", T - 200000, "/"), ev("s3", T - 5000, "/landing/", { test: "true", country: "RO" })];
  const live = R.liveSessions(events, T, 120000);
  assert.deepEqual(Array.from(live, (s) => [s.path, s.seconds_active, s.test]), [["/landing/", 0, true], ["/M5/", 80, false]]);
  assert.equal(live[0].country, "RO");
});

test("player markers: pages, clicks, rage clicks and form events in time order", () => {
  const ev = [meta(T, "https://x.io/faceprofiler-fiki/landing/"), click(T + 100, 5, 5), click(T + 200, 5, 5), click(T + 300, 5, 5)];
  const m = markers(ev, [{ ts: T + 400, event: "survey_submitted" }, { ts: T + 50, event: "$pageview" }]);
  assert.deepEqual(m.map((x) => x.kind), ["page", "click", "rage", "click", "click", "form"]);
  assert.equal(m[0].label, "/faceprofiler-fiki/landing/");
  assert.equal(clock(65000), "1:05");
  assert.equal(JSON.stringify(R.pageBySize([100, 100, 100, 500], 250)), "[[0,1],[2],[3]]");
});
