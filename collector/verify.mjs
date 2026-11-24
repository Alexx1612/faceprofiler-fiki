/**
 * Check the analytics numbers yourself, from the raw data.
 *
 * Usage:  node collector/verify.mjs events.csv [forms.csv]
 *   (in the Google Sheet: open the "events" tab, File → Download → Comma-separated values; same for "forms")
 *
 * Methodology: the CSV holds every stored row exactly as hashed (all cells are text). This script
 * 1. re-computes the hash chain row by row (chain = SHA-256(previous chain + "\n" + JSON of the row's other
 *    cells), starting from "nau-ino:genesis") and reports the first row that does not match: any edit,
 *    deleted or inserted row breaks the chain from there on;
 * 2. re-classifies the source of every event from its raw fields (referrer host, utm_*) and reports rows
 *    whose stored source differs;
 * 3. re-computes the statistics with the same code the web app runs (collector/Code.gs, loaded here as a
 *    module) and prints the KPIs and the "where visitors come from" table, to compare with /analytics/.
 * Exit code 0 when the chain holds and every source matches, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const C = require("./Code.gs");

/** RFC 4180 CSV → array of rows (arrays of strings). Handles quotes, doubled quotes, commas and newlines in cells. */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", i = 0, quoted = false;
  text = text.replace(/^﻿/, "");
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"') { quoted = true; i++; continue; }
    if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
    if (ch === "\r" && text[i + 1] === "\n") i++;
    if (ch === "\n" || ch === "\r") { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
    cell += ch; i++;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Cells → one CSV line (used by the tests to write fixtures the way Google Sheets does). */
export function toCsvLine(cells) {
  return cells.map((c) => (/[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
}

/** Check one sheet's CSV against the expected headers; returns chain facts and the rows. */
export function checkSheet(text, expected) {
  const all = parseCsv(text).filter((r) => r.some((c) => c !== ""));
  const [head, ...rows] = all;
  if (!head || head.join(",") !== expected.join(",")) {
    return { ok: false, error: `Unexpected columns. Expected: ${expected.join(",")}` };
  }
  const width = expected.length;
  const padded = rows.map((r) => (r.length < width ? r.concat(Array(width - r.length).fill("")) : r.slice(0, width)));
  const v = C.verifyChain(padded);
  return { ok: v.broken === -1, rows: padded, count: v.rows, head: v.head, brokenSheetRow: v.broken === -1 ? null : v.broken + 2 };
}

/** Rows whose stored source / medium / how differ from re-classifying their raw fields. */
export function sourceMismatches(objects) {
  return objects
    .map((o, i) => ({ i, o, c: C.classifySource(o) }))
    .filter(({ o, c }) => o.source !== c.source || o.medium !== c.medium || o.source_how !== c.how)
    .map(({ i, o, c }) => ({ sheetRow: i + 2, stored: `${o.source} / ${o.medium} / ${o.source_how}`, expected: `${c.source} / ${c.medium} / ${c.how}` }));
}

/** Full check of the downloaded CSVs. */
export function verify(eventsCsv, formsCsv = "") {
  const ev = checkSheet(eventsCsv, C.EVENT_HEADERS);
  if (ev.error) return { ok: false, error: `events: ${ev.error}` };
  const fo = formsCsv ? checkSheet(formsCsv, C.FORM_HEADERS) : { ok: true, rows: [], count: 0, head: "" };
  if (fo.error) return { ok: false, error: `forms: ${fo.error}` };
  const events = C.rowsToObjects(C.EVENT_HEADERS, ev.rows);
  const forms = C.rowsToObjects(C.FORM_HEADERS, fo.rows);
  const mismatches = sourceMismatches(events);
  const stats = C.aggregate(events, forms, Date.now());
  return { ok: ev.ok && fo.ok && !mismatches.length, events: ev, forms: fo, mismatches, stats };
}

const pct = (x) => `${Math.round(x * 100)}%`;

function report(r) {
  const out = [];
  if (r.error) return `[ERROR] ${r.error}`;
  const line = (name, s) =>
    s.ok
      ? `[OK]    ${name}: ${s.count} rows, chain intact, head ${s.head.slice(0, 12) || "(empty)"}`
      : `[ERROR] ${name}: chain broken at sheet row ${s.brokenSheetRow} (that row or one before it was edited, deleted or inserted)`;
  out.push(line("events", r.events));
  if (r.forms.count || r.forms.brokenSheetRow) out.push(line("forms", r.forms));
  out.push(r.mismatches.length ? `[ERROR] ${r.mismatches.length} rows with a stored source that the rules would not give, first: row ${r.mismatches[0].sheetRow} (${r.mismatches[0].stored} ≠ ${r.mismatches[0].expected})` : "[OK]    every stored source matches classifySource() on its raw fields");
  const a = r.stats.versions.all;
  out.push("", `All versions: ${a.visitors} visitors · ${a.sessions} sessions · ${a.pageviews} pageviews · bounce ${pct(a.bounce_rate)} · avg session ${a.avg_session_s} s · ${r.stats.test_events} test rows ignored`, "");
  out.push("Where visitors come from (first touch per session)");
  out.push(["source".padEnd(28), "visitors".padStart(8), "sessions".padStart(9), "forms".padStart(6), "conv".padStart(5), "  how / referrer hosts"].join(""));
  for (const s of a.sources) {
    const how = s.how.map((h) => `${h.key} ${h.count}`).join(", ");
    const hosts = s.referrer_hosts.map((h) => h.key).join(", ");
    out.push([s.source.padEnd(28), String(s.visitors).padStart(8), String(s.sessions).padStart(9), String(s.conversions).padStart(6), pct(s.conversion_rate).padStart(5), `  ${how}${hosts ? ` · ${hosts}` : ""}`].join(""));
  }
  return out.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [eventsPath, formsPath] = process.argv.slice(2);
  if (!eventsPath) {
    console.log("Usage: node collector/verify.mjs events.csv [forms.csv]");
    process.exit(2);
  }
  const r = verify(readFileSync(eventsPath, "utf8"), formsPath ? readFileSync(formsPath, "utf8") : "");
  console.log(report(r));
  process.exit(r.ok ? 0 : 1);
}
