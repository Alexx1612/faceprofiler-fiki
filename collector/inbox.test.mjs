/**
 * Tests for the owner inbox (Inbox.gs) and the PostHog-style extras and public summary (Code.gs).
 * Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const C = require("./Code.gs");
const I = require("./Inbox.gs");

const T = Date.UTC(2026, 10, 23, 9); // Monday 23 Nov 2026, 09:00 UTC
const DAY = 86400000;
let k = 0;
const ev = (anon, event, ms, extra = {}) => ({
  id: `x${k++}`, anon, session: extra.session ?? `${anon}-1`, event, ts: T + ms, version: "v1.20",
  path: extra.path ?? "/faceprofiler-fiki/landing/", device: extra.device ?? "phone", label: extra.label ?? "", props: extra.props ?? {},
});

test("heatmap: clicks with x/y land in 2 % cells per page and device; clicks without position are skipped", () => {
  const events = [
    ev("A", "$autocapture", 0, { label: "Book a pilot", props: { x: 10, y: 3, vp: "phone" } }),
    ev("A", "$autocapture", 1000, { label: "Book a pilot", props: { x: 11, y: 3.9, vp: "phone" } }),
    ev("B", "$deadclick", 0, { label: "hero image", props: { x: 100, y: 0, vp: "desktop" } }),
    ev("B", "$autocapture", 500, { label: "no position" }),
  ];
  const h = C.heatmaps(events);
  const phone = h.find((x) => x.device === "phone");
  assert.equal(phone.clicks, 2);
  assert.deepEqual(phone.cells, [[5, 1, 2]]); // x 10-11 % → col 5, y 3-3.9 % → row 1
  assert.deepEqual(phone.top, [{ key: "Book a pilot", count: 2 }]);
  const desk = h.find((x) => x.device === "desktop");
  assert.deepEqual(desk.cells, [[49, 0, 1]]); // 100 % clamps into the last column
  assert.equal(C.heatCell("abc", 50), null);
});

test("frustration: rage and dead clicks counted per page and element", () => {
  const f = C.frustration([
    ev("A", "$rageclick", 0, { label: "Submit" }),
    ev("B", "$rageclick", 0, { label: "Submit" }),
    ev("A", "$deadclick", 0, { label: "Logo" }),
  ]);
  assert.deepEqual(f.rage, [{ path: "/faceprofiler-fiki/landing/", label: "Submit", count: 2 }]);
  assert.equal(f.dead[0].label, "Logo");
});

test("scroll depth: deepest scroll per visitor and page, share reaching 25/50/75/100 %", () => {
  const s = C.scrollDepth([
    ev("A", "$pageleave", 0, { props: { scroll_pct: 30 } }),
    ev("A", "$pageleave", 9000, { props: { scroll_pct: 80 } }), // same visitor, deeper later: 80 counts
    ev("B", "$pageleave", 0, { props: { scroll_pct: 100 } }),
    ev("C", "$pageleave", 0, { props: { scroll_pct: 10 } }),
    ev("D", "$pageleave", 0, { props: {} }), // no depth: not counted
  ]);
  const p = s[0];
  assert.equal(p.visitors, 3);
  assert.equal(p.r25, 2 / 3);
  assert.equal(p.r75, 2 / 3);
  assert.equal(p.r100, 1 / 3);
});

test("retention: returning visitors and weekly cohorts", () => {
  const sessions = C.sessionize([
    ev("A", "$pageview", 0, { session: "A1" }),
    ev("A", "$pageview", 1 * DAY, { session: "A2" }), // returns next day (same week)
    ev("A", "$pageview", 8 * DAY, { session: "A3" }), // and in week 1
    ev("B", "$pageview", 0, { session: "B1" }),
    ev("C", "$pageview", 14 * DAY, { session: "C1" }), // first seen two weeks later
  ]);
  const r = C.retention(sessions);
  assert.equal(r.visitors, 3);
  assert.equal(r.returning, 1);
  assert.deepEqual(r.cohorts[0], { week: "2026-11-23", size: 2, w1: 1, w2: 0, w3: 0 });
  assert.deepEqual(r.cohorts[1], { week: "2026-12-07", size: 1, w1: 0, w2: 0, w3: 0 });
  assert.equal(C.weekStart(Date.UTC(2026, 10, 29, 23)), "2026-11-23"); // Sunday → that week's Monday
});

test("paths: first three distinct pages of each session", () => {
  const sessions = C.sessionize([
    ev("A", "$pageview", 0, { path: "/" }),
    ev("A", "$pageview", 1000, { path: "/" }),
    ev("A", "$pageview", 2000, { path: "/landing/" }),
    ev("A", "$pageview", 3000, { path: "/M5/" }),
    ev("A", "$pageview", 4000, { path: "/analytics/" }),
    ev("B", "$pageview", 0, { path: "/" }),
    ev("B", "$pageview", 1000, { path: "/landing/" }),
    ev("B", "$pageview", 2000, { path: "/M5/" }),
  ]);
  assert.deepEqual(C.topPaths(sessions), [{ key: "/ → /landing/ → /M5/", count: 2 }]);
});

test("statsFor: lead rate per visitor and behaviour block present", () => {
  const st = C.statsFor([ev("A", "$pageview", 0), ev("A", "updates_form_submitted", 100), ev("B", "$pageview", 0), ev("B", "survey_submitted", 100)], []);
  assert.equal(st.leads, 1);
  assert.equal(st.lead_rate, 0.5);
  assert.ok(st.behaviour && Array.isArray(st.behaviour.heatmaps) && st.behaviour.retention.visitors === 2);
});

test("public stats: the M5 story only; regions, devices detail, clicks, heatmaps, answers, test stats stay private", () => {
  const events = [
    ev("A", "$pageview", 0, { props: {} }),
    { ...ev("A", "$autocapture", 100, { label: "Hero CTA private", props: { x: 5, y: 5 } }), utm_source: "whatsapp", utm_campaign: "m5_launch", utm_content: "group-1", referrer_host: "l.facebook.com", region: "Bucharest", country: "RO", os: "android", browser: "chrome" },
    ev("A", "updates_form_submitted", 200),
    { ...ev("T", "$pageview", 0), test: true },
  ];
  const forms = [{ ts: T, version: "v1.20", form: "survey", anon: "A", path: "/landing/", data: { role: "Teacher", guarded: "A guard on site", comment: "private text" } }];
  const full = C.aggregate(events, forms, T);
  full.integrity = { collector: "1.4", events: { rows: 4, chain_ok: true, chain_head: "abc" }, forms: { rows: 1, chain_ok: true, chain_head: "def" } };
  const pub = C.publicStats(full);
  const s = JSON.stringify(pub);
  // M5 keys present
  const a = pub.versions.all;
  for (const key of ["visitors", "sessions", "pageviews", "avg_session_s", "lead_rate", "leads", "daily", "sources", "funnel", "forms", "game_summary"]) assert.ok(key in a, key);
  assert.ok(Array.isArray(a.who.devices) && Array.isArray(a.who.countries));
  assert.equal(pub.integrity.events.chain_ok, true);
  assert.deepEqual(Object.keys(pub.versions), ["all"]);
  assert.ok(pub.version_list.includes("v1.20"));
  assert.ok("campaigns" in a.sources[0] && "conversion_rate" in a.sources[0]);
  // private keys absent
  for (const key of ["regions", "os", "browsers", "in_app", "screens", "langs", "referrer_hosts", "landing_pages", "contents", "top_pages", "clicks", "behaviour", "heatmaps", "survey_free_text", "hours", "bounce_rate"]) {
    assert.equal(s.includes(`"${key}"`), false, `public stats leak "${key}"`);
  }
  for (const value of ["Bucharest", "l.facebook.com", "group-1", "Hero CTA private", "A guard on site", "private text"]) assert.equal(s.includes(value), false, value);
  assert.equal(a.survey, undefined); // answer distributions stay private (form counts are public)
  assert.equal(pub.test, undefined);
  assert.equal("test_visitors" in pub, false);
});

test("inbox: spam hint, duplicates, newest status wins, newest first, token never returned", () => {
  const forms = [
    { row_id: "r1", received_at: String(T), form: "updates", data: { email: "Ana@School.ro", elapsed_ms: "1200" }, test: false },
    { row_id: "r2", received_at: String(T + 1000), form: "updates", data: { email: "ana@school.ro" }, test: false },
    { row_id: "r3", received_at: String(T + 2000), form: "pilot", data: { email: "x@mailinator.com", school: "see http://spam.example", id_token: "secret", verified: "true" }, test: false },
  ];
  const status = [
    ["r2", "handled", "called back", String(T + 5000), "owner@example.com"],
    ["r2", "archived", "", String(T + 9000), "owner@example.com"],
    ["r1", "bogus", "", String(T), "x"],
  ];
  const out = I.inboxItems(forms, status);
  assert.deepEqual(out.items.map((i) => i.row_id), ["r3", "r2", "r1"]);
  assert.equal(out.items[1].status, "archived");
  assert.equal(out.items[2].status, "new");
  assert.equal(out.items[1].seen, 2);
  assert.equal(out.items[0].verified, true);
  assert.deepEqual(out.items[0].spam.reasons.sort(), ["disposable e-mail", "link in text"]);
  assert.equal(out.items[2].spam.reasons[0], "sent 1.2 s after page load");
  assert.equal(JSON.stringify(out).includes("secret"), false);
  assert.deepEqual(out.counts, { new: 2, handled: 0, spam: 0, archived: 1 });
});

test("digest: one Romanian day of real submissions; nothing to send when empty", () => {
  const d0 = Date.UTC(2026, 10, 25, 10);
  const forms = [
    { received_at: String(d0), form: "updates", data: { email: "a@b.ro", role: "Teacher" }, test: false },
    { received_at: String(d0 + 1000), form: "pilot", data: { email: "c@d.ro", school: "Școala 7" }, test: false },
    { received_at: String(d0 + 2000), form: "survey", data: {}, test: false },
    { received_at: String(d0), form: "updates", data: { email: "t@t.ro" }, test: true },
  ];
  const d = I.digestText(forms, "2026-11-25");
  assert.match(d.subject, /1 sign-ups, 1 pilots, 1 surveys/);
  assert.match(d.body, /a@b\.ro \(Teacher\)/);
  assert.equal(d.body.includes("t@t.ro"), false);
  assert.equal(I.digestText(forms, "2026-11-20"), null);
});
