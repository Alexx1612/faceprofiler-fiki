/**
 * Tests for the collector's pure functions (Code.gs loaded as CommonJS). Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const C = require("./Code.gs");

const T0 = Date.UTC(2026, 10, 25, 9, 0, 0);
const MIN = 60_000;
let n = 0;
const ev = (anon, event, min, extra = {}) => ({ id: `e${n++}`, anon, session: extra.session ?? `${anon}-s1`, event, ts: T0 + min * MIN, version: "v1.12", path: "/landing/", device: "phone", ...extra });

// Visitor A: from facebook, landing -> Book a pilot -> pilot form (converts), 3 minutes
// Visitor B: from google, one pageview only, leaves after 4 s (bounce)
// Visitor C: direct, two sessions (gap 40 min); plays the game twice; older version
// Visitor D: utm_source=reddit, one pageview, stays 30 s (engaged by time, not a bounce)
const events = [
  ev("A", "$pageview", 0, { referrer: "l.facebook.com", utm_campaign: "launch", utm_content: "group-post" }),
  ev("A", "$autocapture", 1, { label: "Book a pilot" }),
  ev("A", "cta_book_pilot_click", 1),
  ev("A", "pilot_form_submitted", 3),
  ev("B", "$pageview", 0, { referrer: "www.google.ro", device: "desktop", path: "/" }),
  ev("B", "$pageleave", 0.07, { referrer: "www.google.ro", device: "desktop", path: "/" }),
  ev("C", "$pageview", 0, { version: "v1.11" }),
  ev("C", "game_round_finished", 1, { version: "v1.11", props: { round: 1, people: 3, human_ms: 2000, machine_ms: 0.02, correct: true } }),
  ev("C", "$pageview", 41, { version: "v1.11", session: "C-s2", path: "/M5/" }),
  ev("C", "game_round_finished", 42, { version: "v1.11", session: "C-s2", props: { round: 1, people: 3, human_ms: 4000, machine_ms: 0.04, correct: false } }),
  ev("D", "$pageview", 0, { utm_source: "reddit" }),
  ev("D", "$pageleave", 0.5, { utm_source: "reddit" }),
];
const forms = [
  { form: "pilot", version: "v1.12", data: { email: "x@y.ro", school: "S", role: "Teacher" } },
  { form: "survey", version: "v1.12", data: { role: "Teacher", safe: "4", comment: "free text never shown", game_r1: "3 people" } },
  { form: "survey", version: "v1.11", data: { role: "School pupil", safe: "2" } },
];

test("normalizeSource maps referrers and app ids to one channel", () => {
  const cases = {
    "l.facebook.com": "facebook", "m.facebook.com": "facebook", "lm.facebook.com": "facebook", fb: "facebook",
    "t.co": "x / twitter", "www.google.ro": "google", "google.com": "google", "out.reddit.com": "reddit",
    "android-app://com.linkedin.android": "linkedin", "lnkd.in": "linkedin", "android-app://com.google.android.gm": "gmail",
    "https://www.bing.com/search?q=x": "bing", "": "direct / unknown", "example.org": "example.org",
  };
  for (const [raw, want] of Object.entries(cases)) assert.equal(C.normalizeSource(raw), want, raw);
});

test("cleanEvents drops malformed events, trims strings and keeps the id", () => {
  const out = C.cleanEvents([{ event: "$pageview", anon: "a", label: "x".repeat(200), id: "1" }, { event: "bad name!", anon: "a" }, { anon: "a" }], T0);
  assert.equal(out.length, 1);
  assert.equal(out[0].label.length, 60);
  assert.equal(out[0].id, "1");
  assert.equal(out[0].version, "unknown");
});

test("cleanForm: honeypot is silently dropped, bad e-mail and bad names refused", () => {
  assert.deepEqual(C.cleanForm({ form: "survey", data: { _gotcha: "bot" } }, T0), { spam: true });
  assert.match(C.cleanForm({ form: "pilot", data: { email: "nope" } }, T0).error, /e-mail/);
  assert.match(C.cleanForm({ form: "Bad Name", data: {} }, T0).error, /Invalid/);
  assert.equal(C.cleanForm({ form: "pilot", data: { email: "a@b.ro" } }, T0).form, "pilot");
});

test("sessions split on the client id, 30-minute gaps and a 24-hour cap", () => {
  const s = C.sessionize([ev("Z", "$pageview", 0, { session: "" }), ev("Z", "$pageview", 31, { session: "" }), ev("Z", "$pageview", 32, { session: "" })]);
  assert.equal(s.length, 2);
  const long = [];
  for (let m = 0; m <= 25 * 60; m += 20) long.push(ev("L", "$pageview", m, { session: "" }));
  assert.equal(C.sessionize(long).length, 2);
});

test("totals, bounce (PostHog engaged rule) and session length", () => {
  const all = C.aggregate(events, forms, T0).versions.all;
  assert.equal(all.visitors, 4);
  assert.equal(all.sessions, 5); // A, B, C x2, D
  assert.equal(all.pageviews, 5);
  // B bounces (one view, 4 s). D stayed 30 s: engaged. C's sessions have a game event: engaged.
  assert.equal(all.bounce_rate, 1 / 5);
  assert.ok(all.avg_session_s > 0);
});

test("where visitors come from: normalised sources with conversions, campaigns and landing paths", () => {
  const src = C.aggregate(events, forms, T0).versions.all.sources;
  const by = Object.fromEntries(src.map((r) => [r.source, r]));
  assert.deepEqual(Object.keys(by).sort(), ["direct / unknown", "facebook", "google", "reddit"]);
  assert.equal(by.facebook.conversions, 1);
  assert.equal(by.facebook.conversion_rate, 1);
  assert.equal(by.facebook.campaigns[0].key, "launch");
  assert.equal(by.facebook.contents[0].key, "group-post");
  assert.equal(by.google.landing_pages[0].key, "/");
  assert.equal(by["direct / unknown"].sessions, 2);
  assert.equal(by["direct / unknown"].visitors, 1);
  assert.equal(by.reddit.conversions, 0);
});

test("funnel counts ordered steps per visitor within 14 days", () => {
  const f = C.aggregate(events, forms, T0).versions.all.funnel;
  assert.deepEqual(f.map((s) => s.visitors), [3, 1, 1]); // B landed on "/", not /landing/
  assert.equal(f[1].conversion, 1 / 3);
  const late = [ev("W", "$pageview", 0), ev("W", "cta_book_pilot_click", 15 * 24 * 60)];
  assert.deepEqual(C.statsFor(late, []).funnel.map((s) => s.visitors), [1, 0, 0]);
  const wrongOrder = [ev("O", "cta_book_pilot_click", 0), ev("O", "$pageview", 1)];
  assert.deepEqual(C.statsFor(wrongOrder, []).funnel.map((s) => s.visitors), [1, 0, 0]);
});

test("clicks, pages, devices and daily series", () => {
  const all = C.aggregate(events, forms, T0).versions.all;
  assert.deepEqual(all.clicks, [{ key: "Book a pilot", count: 1 }]);
  assert.equal(all.top_pages[0].key, "/landing/");
  assert.equal(all.devices.find((d) => d.key === "phone").count, 4);
  assert.deepEqual(all.daily, [{ date: "2026-11-25", pageviews: 5, visitors: 4 }]);
});

test("forms per form and survey answers without free text", () => {
  const all = C.aggregate(events, forms, T0).versions.all;
  assert.deepEqual(Object.fromEntries(all.forms.map((f) => [f.key, f.count])), { pilot: 1, survey: 2 });
  assert.deepEqual(Object.keys(all.survey).sort(), ["role", "safe"]);
  assert.equal(JSON.stringify(all).includes("free text"), false);
  assert.equal(JSON.stringify(all).includes("x@y.ro"), false);
});

test("game: plays, correct share and medians per round", () => {
  const g = C.aggregate(events, forms, T0).versions.all.game;
  assert.deepEqual(g, [{ round: "1", people: 3, plays: 2, correct_pct: 0.5, median_human_ms: 3000, best_human_ms: 2000, median_machine_ms: 0.03 }]);
});

test("per version and merged: all-time totals equal the sum of versions; duplicate ids counted once", () => {
  const dup = [...events, { ...events[0] }];
  const out = C.aggregate(dup, forms, T0);
  assert.deepEqual(Object.keys(out.versions).sort(), ["all", "v1.11", "v1.12"]);
  assert.equal(out.versions.all.pageviews, out.versions["v1.11"].pageviews + out.versions["v1.12"].pageviews);
  assert.equal(out.versions.all.pageviews, 5);
  assert.equal(out.versions["v1.11"].visitors, 1);
});

test("test traffic is stored but excluded from every number", () => {
  const testRows = [
    ev("T", "$pageview", 0, { referrer: "l.facebook.com", test: true }),
    ev("T", "cta_book_pilot_click", 1, { test: "TRUE" }),
    ev("T", "game_round_finished", 2, { test: true, props: { round: 3, people: 21, human_ms: 1, machine_ms: 1, correct: true } }),
  ];
  const out = C.aggregate([...events, ...testRows], [...forms, { form: "pilot", version: "v1.12", data: {}, test: true }], T0);
  const clean = C.aggregate(events, forms, T0);
  assert.equal(out.test_events, 4);
  assert.equal(clean.test_events, 0);
  assert.deepEqual(out.versions, clean.versions);
  assert.equal(C.cleanEvents([{ event: "$pageview", anon: "a", test: true }], T0)[0].test, true);
  assert.equal(C.cleanEvents([{ event: "$pageview", anon: "a" }], T0)[0].test, false);
  assert.equal(C.cleanForm({ form: "pilot", data: { email: "a@b.ro" }, test: true }, T0).test, true);
});
