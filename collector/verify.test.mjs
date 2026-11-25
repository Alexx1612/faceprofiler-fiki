/**
 * Tests for source classification, the hash chain and verify.mjs. Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

import { buildCsv } from "./fixtures/make.mjs";
import { parseCsv, toCsvLine, verify } from "./verify.mjs";

const require = createRequire(import.meta.url);
const C = require("./Code.gs");
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const relines = (rows) => rows.map(toCsvLine).join("\r\n") + "\r\n";

test("classifySource: utm first, then referrer host, else direct", () => {
  const cases = [
    [{ utm_source: "facebook", utm_medium: "social", referrer_host: "l.facebook.com" }, ["facebook", "social", "utm"]],
    [{ utm_source: "FB" }, ["facebook", "social", "utm"]],
    [{ utm_source: "newsletter", utm_medium: "Email" }, ["newsletter", "email", "utm"]],
    [{ utm_source: "linkedin", referrer_host: "www.google.ro" }, ["linkedin", "social", "utm"]], // the shared link wins
    [{ referrer_host: "l.facebook.com" }, ["facebook", "social", "referrer"]],
    [{ referrer_host: "lm.facebook.com" }, ["facebook", "social", "referrer"]],
    [{ referrer_host: "www.google.ro" }, ["google", "search", "referrer"]],
    [{ referrer_host: "android-app://com.google.android.gm" }, ["gmail", "email", "referrer"]],
    [{ referrer_host: "t.co" }, ["x / twitter", "social", "referrer"]],
    [{ referrer_host: "some-blog.ro" }, ["some-blog.ro", "referral", "referrer"]],
    [{ referrer: "https://out.reddit.com/t3_x?url=y" }, ["reddit", "social", "referrer"]], // old field, full URL
    [{}, ["direct / unknown", "direct", "none"]],
  ];
  for (const [input, [source, medium, how]] of cases) assert.deepEqual(C.classifySource(input), { source, medium, how }, JSON.stringify(input));
});

test("only the referrer host is kept, never its path or query", () => {
  assert.equal(C.hostOnly("https://l.facebook.com/l.php?u=https%3A%2F%2Fsite&h=secret"), "l.facebook.com");
  assert.equal(C.hostOnly("android-app://com.linkedin.android/path"), "android-app://com.linkedin.android");
  const [e] = C.cleanEvents([{ event: "$pageview", anon: "a", referrer: "https://www.google.ro/search?q=nau-ino" }], Date.now());
  assert.equal(e.referrer_host, "www.google.ro");
});

test("cells are text; a leading = + @ cannot become a formula", () => {
  assert.equal(C.cell(true), "true");
  assert.equal(C.cell(12), "12");
  assert.equal(C.cell("=HYPERLINK(1)"), " =HYPERLINK(1)");
  assert.equal(C.cell("+40 7xx"), " +40 7xx");
});

test("the fixture CSVs are what the web app's own functions produce", () => {
  const { events, forms } = buildCsv();
  assert.equal(fixture("events.csv"), events, "run: node collector/fixtures/make.mjs");
  assert.equal(fixture("forms.csv"), forms);
  const head = parseCsv(events)[0];
  assert.equal(parseCsv(events)[2][head.indexOf("props")], '{"tag":"a","href":"#pilot"}'); // quotes and commas survive the CSV
});

test("verify: an untouched download passes and recomputes the dashboard numbers", () => {
  const r = verify(fixture("events.csv"), fixture("forms.csv"));
  assert.equal(r.ok, true);
  assert.equal(r.events.count, 12);
  assert.equal(r.forms.count, 2);
  const all = r.stats.versions.all;
  assert.equal(all.visitors, 5);
  assert.equal(r.stats.test_events, 1);
  const fb = all.sources.find((s) => s.source === "facebook");
  assert.equal(fb.visitors, 2);
  assert.deepEqual(fb.how.map((h) => h.key).sort(), ["referrer", "utm"]);
  assert.deepEqual(fb.referrer_hosts.map((h) => h.key).sort(), ["l.facebook.com", "m.facebook.com"]);
  assert.equal(fb.mediums[0].key, "social");
  // the linkedin visitor only answered the survey: feedback, not a lead
  const li = all.sources.find((s) => s.source === "linkedin");
  assert.equal(li.conversions, 0);
  assert.equal(li.by_form.survey, 1);
  assert.equal(JSON.stringify(r.stats).includes("free text"), false);
});

test("verify: editing a cell breaks the chain at that row", () => {
  const rows = parseCsv(fixture("events.csv")).filter((r) => r.length > 1);
  rows[3][20] = "Book a pilot!!"; // sheet row 4: change a label
  const r = verify(relines(rows), fixture("forms.csv"));
  assert.equal(r.ok, false);
  assert.equal(r.events.brokenSheetRow, 4);
});

test("verify: deleting, inserting or reordering rows is detected", () => {
  const base = parseCsv(fixture("events.csv")).filter((r) => r.length > 1);
  const del = base.filter((_, i) => i !== 5);
  assert.equal(verify(relines(del)).events.brokenSheetRow, 6);
  const ins = [...base.slice(0, 3), [...base[2]], ...base.slice(3)];
  assert.equal(verify(relines(ins)).events.brokenSheetRow, 4);
  const swap = [base[0], base[2], base[1], ...base.slice(3)];
  assert.equal(verify(relines(swap)).events.brokenSheetRow, 2);
});

test("verify: a re-hashed chain with a faked source is still caught by re-classifying", () => {
  const rows = parseCsv(fixture("events.csv")).filter((r) => r.length > 1);
  const [head, ...data] = rows;
  const iSource = head.indexOf("source");
  data[5][iSource] = "linkedin"; // claim the google visit came from linkedin...
  const rechained = C.chainRows(C.GENESIS, data.map((r) => C.hashedCells(r, C.EVENT_CHAIN_IDX)), C.EVENT_CHAIN_IDX); // ...and recompute every hash
  const r = verify(relines([head, ...rechained]));
  assert.equal(r.events.ok, true);
  assert.equal(r.ok, false);
  assert.equal(r.mismatches[0].sheetRow, 7);
});

test("chainSummary reports the sheet row where the chain breaks", () => {
  const rows = parseCsv(fixture("events.csv")).filter((r) => r.length > 1).slice(1);
  assert.deepEqual(C.chainSummary(rows, C.EVENT_CHAIN_IDX), { rows: 12, chain_head: rows[11][C.EVENT_CHAIN_IDX], chain_ok: true, first_broken_row: null });
  rows[7][8] = "$pageleave";
  assert.equal(C.chainSummary(rows, C.EVENT_CHAIN_IDX).first_broken_row, 9);
  assert.deepEqual(C.chainSummary([]), { rows: 0, chain_head: "", chain_ok: true, first_broken_row: null });
});

test("wrong columns are refused instead of guessed", () => {
  const r = verify("a,b,c\r\n1,2,3\r\n");
  assert.equal(r.ok, false);
  assert.match(r.error, /Unexpected columns/);
});

test("survey free text (comment, *_other, *_note) is only counted, never returned", () => {
  const forms = [
    { form: "survey", version: "v1", data: { role: "Other", role_other: "bus driver Ion", safe: "3", safe_note: "my secret note", comment: "private words" } },
    { form: "survey", version: "v1", data: { role: "Teacher", role_other: "", comment: "  " } },
  ];
  const s = C.statsFor([], forms);
  const json = JSON.stringify(s);
  for (const secret of ["bus driver", "secret note", "private words"]) assert.equal(json.includes(secret), false, secret);
  assert.deepEqual(Object.keys(s.survey).sort(), ["role", "safe"]);
  assert.deepEqual(Object.fromEntries(s.survey_free_text.map((x) => [x.key, x.count])), { comment: 1, role_other: 1, safe_note: 1 });
});

test("game: players, finished all rounds, score 0-5 per player (5 rounds), best times, scenarios", () => {
  const T = Date.UTC(2026, 10, 25);
  let k = 0;
  const g = (anon, round, correct, human_ms, extra = {}) => ({
    id: `g${k++}`, anon, event: "game_round_finished", ts: T + k * 1000, version: "v1",
    props: { round, people: [4, 15, 10, 10, 10][round - 1], correct, human_ms, machine_ms: 0.02 * round, ...extra },
  });
  const events = [
    // P1: all five right (one retry on round 2) → score 5, finished
    g("P1", 1, true, 2500, { scenario: "yard-night" }), g("P1", 2, false, 4000), g("P1", 2, true, 3500), g("P1", 3, true, 6000), g("P1", 4, true, 12000), g("P1", 5, true, 9000),
    // P2: round 1 right, round 2 wrong, never played 3-5 → score 1, not finished
    g("P2", 1, true, 1800, { scenario: "yard-night" }), g("P2", 2, false, 9000),
    // P3: played all five, all wrong → score 0, finished
    g("P3", 1, false, 7000, { scenario: "Corridor" }), g("P3", 2, false, 8000), g("P3", 3, false, 9000, { scenario: "free text, with spaces!" }), g("P3", 4, false, 20000), g("P3", 5, false, 15000),
    // test traffic must not count
    { ...g("T", 1, true, 100), test: true },
    { id: "x", anon: "P4", event: "$pageview", ts: T, version: "v1", props: {} },
  ];
  const out = C.aggregate(events, [], T).versions.all;
  const s = out.game_summary;
  assert.equal(s.players, 3);
  assert.equal(s.finished_all, 2);
  assert.equal(s.avg_score, (5 + 1 + 0) / 3);
  assert.deepEqual(s.score_distribution, [{ score: 0, players: 1 }, { score: 1, players: 1 }, { score: 2, players: 0 }, { score: 3, players: 0 }, { score: 4, players: 0 }, { score: 5, players: 1 }]);
  assert.deepEqual(s.scenarios, [{ key: "yard-night", count: 2 }, { key: "corridor", count: 1 }]);
  const r = Object.fromEntries(out.game.map((x) => [x.round, x]));
  assert.equal(r["1"].plays, 3);
  assert.equal(r["1"].correct_pct, 2 / 3);
  assert.equal(r["1"].best_human_ms, 1800); // fastest correct play
  assert.equal(r["1"].median_human_ms, 2500);
  assert.equal(r["2"].best_human_ms, 3500);
  assert.equal(r["3"].best_human_ms, 6000);
  assert.equal(r["3"].people, 10);
  assert.equal(r["4"].best_human_ms, 12000);
  assert.equal(r["4"].people, 10);
  assert.equal(r["5"].best_human_ms, 9000);
  assert.equal(JSON.stringify(out).includes("free text"), false);
});

test("a download made before collector 1.3 still verifies, and old and new rows chain together", () => {
  const legacy = verify(fixture("events-legacy.csv"), fixture("forms.csv"));
  assert.equal(legacy.ok, true);
  assert.equal(legacy.events.count, 12);
  assert.equal(legacy.stats.versions.all.visitors, 5);
  // a sheet whose first rows are old (24 cells) and later rows new: the chain runs on across the switch
  const old = parseCsv(fixture("events-legacy.csv")).filter((r) => r.length > 1).slice(1);
  const head = old[old.length - 1][C.EVENT_CHAIN_IDX];
  const [fresh] = C.cleanEvents([{ event: "$pageview", anon: "N", id: "n1", ts: 1795600000000, os: "ios", country: "RO", region: "Iasi", geo_how: "ip" }], 1795600000000);
  const newRows = C.chainRows(head, [C.eventRow(fresh, "row-n1", 1795600000001)], C.EVENT_CHAIN_IDX);
  const width = C.EVENT_HEADERS.length;
  const mixed = [...old.map((r) => r.concat(Array(width - r.length).fill(""))), ...newRows];
  assert.equal(C.chainSummary(mixed, C.EVENT_CHAIN_IDX).chain_ok, true);
  mixed[12][C.EVENT_HEADERS.indexOf("region")] = "Cluj"; // edit a new who-visits cell
  assert.equal(C.chainSummary(mixed, C.EVENT_CHAIN_IDX).first_broken_row, 14);
});
