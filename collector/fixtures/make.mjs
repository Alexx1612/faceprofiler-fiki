/**
 * Writes collector/fixtures/events.csv and forms.csv: a small, fictional data set shaped exactly like a
 * CSV download of the collector's Google Sheet (same columns, same hash chain), for verify.mjs tests.
 * Run: node collector/fixtures/make.mjs
 *
 * Methodology: rows go through the same functions the web app uses (cleanEvents → eventRow → chainRows),
 * with fixed row ids and receive times so the file is reproducible.
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { toCsvLine } from "../verify.mjs";

const require = createRequire(import.meta.url);
const C = require("../Code.gs");
const here = dirname(fileURLToPath(import.meta.url));

const T0 = Date.UTC(2026, 10, 25, 9, 0, 0);
const MIN = 60_000;
let n = 0;
const ev = (anon, event, min, extra = {}) => ({
  id: `f${n++}`, anon, session: `${anon}-s1`, event, ts: T0 + min * MIN, version: "v1.12", build: "abc1234",
  path: "/landing/", landing_path: "/landing/", device: "phone", ...extra,
});

export const rawEvents = [
  // facebook group post with a UTM link; converts
  ev("A", "$pageview", 0, { referrer_host: "l.facebook.com", utm_source: "facebook", utm_medium: "social", utm_campaign: "launch", utm_content: "parents-group" }),
  ev("A", "$autocapture", 1, { referrer_host: "l.facebook.com", utm_source: "facebook", utm_medium: "social", utm_campaign: "launch", utm_content: "parents-group", label: "Book a pilot", props: { tag: "a", href: "#pilot" } }),
  ev("A", "pilot_form_submitted", 3, { referrer_host: "l.facebook.com", utm_source: "facebook", utm_medium: "social", utm_campaign: "launch", utm_content: "parents-group" }),
  // facebook app, no UTM: known only from the referrer host
  ev("B", "$pageview", 5, { referrer_host: "m.facebook.com" }),
  ev("B", "$pageleave", 5.2, { referrer_host: "m.facebook.com", props: { duration_ms: 12000 } }),
  // google search
  ev("C", "$pageview", 6, { referrer_host: "www.google.ro", path: "/", landing_path: "/", device: "desktop" }),
  // linkedin app
  ev("D", "$pageview", 7, { referrer_host: "android-app://com.linkedin.android" }),
  ev("D", "survey_opened", 8, { referrer_host: "android-app://com.linkedin.android" }),
  ev("D", "survey_submitted", 9, { referrer_host: "android-app://com.linkedin.android", props: { role: "Teacher", note: 'has "quotes", commas' } }),
  // direct / unknown (WhatsApp in-app browser hid the referrer)
  ev("E", "$pageview", 10),
  ev("E", "$autocapture", 10.5, { label: "=SUM(A1)", props: { tag: "button" } }),
  // the owner's own test visit: stored, excluded from stats
  ev("T", "$pageview", 11, { referrer_host: "l.facebook.com", test: true }),
];

export const rawForms = [
  { form: "pilot", version: "v1.12", anon: "A", path: "/landing/", data: { email: "someone@example.org", school: "Fictional School", role: "Teacher" } },
  { form: "survey", version: "v1.12", anon: "D", path: "/landing/", data: { role: "Teacher", safe: "4", comment: "free text, never in stats" } },
];

export function buildCsv() {
  const clean = C.cleanEvents(rawEvents, T0 + 60 * MIN);
  const evRows = C.chainRows(C.GENESIS, clean.map((e, i) => C.eventRow(e, `row-e${i}`, T0 + 60 * MIN + i)));
  const foRows = C.chainRows(
    C.GENESIS,
    rawForms.map((f, i) => C.formRow(C.cleanForm(f, T0 + 61 * MIN), `row-f${i}`, T0 + 61 * MIN + i)),
  );
  const csv = (headers, rows) => [headers, ...rows].map(toCsvLine).join("\r\n") + "\r\n";
  return { events: csv(C.EVENT_HEADERS, evRows), forms: csv(C.FORM_HEADERS, foRows) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { events, forms } = buildCsv();
  writeFileSync(join(here, "events.csv"), events);
  writeFileSync(join(here, "forms.csv"), forms);
  console.log("[SUCCESS] wrote collector/fixtures/events.csv and forms.csv");
}
