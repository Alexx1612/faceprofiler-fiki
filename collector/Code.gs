/**
 * Nau-ino collector: our own small Formspree + PostHog, as a Google Apps Script web app on a Google Sheet.
 *
 * Methodology:
 * - doPost takes a text/plain JSON body (a "simple" request, so browsers send it without a CORS
 *   preflight): {type:"events", events:[...]} from lib/collect.ts, or {type:"form", form, data} from the
 *   site's forms. Bodies are size-checked, strings cut to fixed lengths, a per-visitor rate limit runs in
 *   CacheService, and rows are appended under LockService to the sheets "events" and "forms" (headers
 *   are created on first use). No IP address is ever read or stored (Apps Script does not expose it).
 * - Forms behave like Formspree: a filled `_gotcha` honeypot is accepted silently and dropped;
 *   success is {ok:true}, failure {errors:[{message}]} (Apps Script cannot set HTTP status codes).
 * - Source of a visit (who sent the visitor): the browser only reports raw facts, the referring host
 *   (never the full URL) and the utm_* tags of the landing URL. The server decides the channel with one
 *   pure function, classifySource(), and stores both the raw facts and the result in each row, so every
 *   number can be traced back to the row and the rule that produced it. A session's source is the source
 *   of its first event (first touch).
 * - Tamper evidence: every stored row gets a server row id, the server receive time and a hash chain
 *   value, chain = SHA-256(previous chain + "\n" + JSON of the row's other cells). Changing, deleting or
 *   inserting any row in the Sheet breaks the chain from that row on. All cells are stored as text, so a
 *   CSV download of the Sheet hashes to exactly the same values (collector/verify.mjs checks it).
 * - doGet?stats=1 returns aggregates only (never raw rows, e-mails or free text), per site version and
 *   for all versions merged ("all"), plus the chain facts (rows, head, intact or not). Metric definitions
 *   follow PostHog: visitors = distinct anonymous ids, session = events of one visitor with gaps under
 *   30 minutes, at most 24 h (the client also sends its session id), bounce = a session that is not
 *   engaged (engaged: more than one pageview, any click or custom event, or over 10 s), funnel = ordered
 *   steps per visitor within 14 days of step 1. Clicks are counted by a stable label (data-track, else
 *   aria-label or text), so totals add up across versions.
 * - Rows marked test (the owner's PC, localhost, automated browsers) are stored but excluded from all
 *   stats; only their count comes back as `test_events`.
 * - Rows carry the client event id; duplicates (a retried batch) are dropped when aggregating.
 * - The pure functions are exported for Node: aggregate.test.mjs and verify.mjs run the same code as the
 *   web app. The "@provenance" markers delimit the code that the /analytics/ page links to.
 */

var COLLECTOR_VERSION = "1.4";
/**
 * Sheet columns, in order. Every cell of a row except "chain" is hashed into "chain".
 * Rows written before collector 1.3 stop at "chain" (24 cells). From 1.3 the columns after "chain" hold who
 * visits; "schema" is always "2" there, so a row with an empty "schema" is an old row and is hashed as before.
 */
var LEGACY_EVENT_HEADERS = [
  "row_id", "received_at", "id", "ts", "version", "build", "anon", "session", "event", "path", "landing_path",
  "referrer_host", "utm_source", "utm_medium", "utm_campaign", "utm_content", "source", "medium", "source_how",
  "device", "label", "props", "test", "chain",
];
var WHO_FIELDS = ["os", "browser", "in_app", "screen", "lang", "tz", "country", "country_name", "region", "geo_how"];
var EVENT_HEADERS = LEGACY_EVENT_HEADERS.concat(["schema"], WHO_FIELDS);
var EVENT_CHAIN_IDX = EVENT_HEADERS.indexOf("chain");
var FORM_HEADERS = ["row_id", "received_at", "version", "form", "anon", "path", "data", "test", "chain"];
var GENESIS = "nau-ino:genesis";
/** Above this many rows the stats endpoint skips re-checking the chain (time limit); verify.mjs still can. */
var CHAIN_CHECK_MAX = 50000;
var MAX_BODY = 64 * 1024;
var MAX_EVENTS = 50;
var RATE_PER_MINUTE = 120;
var SESSION_GAP_MS = 30 * 60 * 1000;
var SESSION_MAX_MS = 24 * 3600 * 1000;
var ENGAGED_MS = 10 * 1000;
var FUNNEL_WINDOW_MS = 14 * 86400 * 1000;
/** Form fields never summarised in stats (personal or free text). */
var PRIVATE_FIELDS = { email: 1, phone: 1, name: 1, message: 1, comment: 1, school: 1, page: 1, _gotcha: 1 };

/** Free-text survey fields ("comment", "<question>_other", "<question>_note"): stats only count them. */
function isFreeText(k) {
  return k === "comment" || /_(other|note)$/.test(k);
}
var FUNNEL = [
  // path may carry the GitHub Pages base path ("/faceprofiler-fiki/landing/"), so match the segment anywhere
  { name: "Landing page", match: function (e) { return e.event === "$pageview" && /(^|\/)landing(\/|$)/.test(String(e.path)); } },
  { name: "Book a pilot or survey opened", match: function (e) { return e.event === "cta_book_pilot_click" || e.event === "survey_opened"; } },
  { name: "Form or survey sent", match: function (e) { return e.event === "pilot_form_submitted" || e.event === "pilot_requested" || e.event === "updates_form_submitted" || e.event === "survey_submitted"; } },
];

/* ---------------- web app entry points (Apps Script only) ---------------- */

// @provenance:store:start
/** Receive a batch of events or one form, clean it, classify the source and append it, hash-chained. */
function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || "";
    if (body.indexOf('{"type":"replay"') === 0 && typeof storeReplay_ === "function") return json_(storeReplay_(body)); // Replay.gs: larger chunks, own limit
    if (body.length > MAX_BODY) return json_({ errors: [{ message: "Too large." }] });
    var msg = JSON.parse(body);
    if (msg.type === "events") return json_(storeEvents_(msg.events));
    if (msg.type === "form") return json_(storeForm_(msg));
    return json_({ errors: [{ message: "Unknown type." }] });
  } catch (err) {
    return json_({ errors: [{ message: "Bad request." }] });
  }
}

function storeEvents_(events) {
  var now = new Date().getTime();
  var clean = cleanEvents(events, now);
  if (!clean.length) return { errors: [{ message: "No valid events." }] };
  if (!rateOk_(clean[0].anon, clean.length)) return { errors: [{ message: "Slow down." }] };
  append_("events", EVENT_HEADERS, clean.map(function (ev) { return eventRow(ev, Utilities.getUuid(), now); }));
  return { ok: true, stored: clean.length };
}

function storeForm_(msg) {
  var now = new Date().getTime();
  var f = cleanForm(msg, now);
  if (f.error) return { errors: [{ message: f.error }] };
  if (f.spam) return { ok: true };
  if (!rateOk_(f.anon || "form", 5)) return { errors: [{ message: "Slow down." }] };
  if (f.form === "pilot") f = typeof handlePilot_ === "function" ? handlePilot_(f) : (delete f.data.id_token, f); // Pilot.gs: verify Google sign-in, notify; never store the token
  append_("forms", FORM_HEADERS, [formRow(f, Utilities.getUuid(), now)]);
  if (f.form === "updates" && typeof afterNewsletter_ === "function") afterNewsletter_(f); // Inbox.gs: optional autoresponder
  return { ok: true };
}

/** Append rows under the script lock; the chain continues from the last row already in the sheet. */
function append_(name, headers, rows) {
  if (!rows.length) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_(name, headers);
    var last = sh.getLastRow();
    var idx = headers.indexOf("chain");
    var prev = last >= 2 ? String(sh.getRange(last, idx + 1).getValue()) : GENESIS;
    var chained = chainRows(prev, rows, idx);
    var range = sh.getRange(last + 1, 1, chained.length, headers.length);
    range.setNumberFormat("@"); // plain text: a CSV download then holds exactly the hashed strings
    range.setValues(chained);
  } finally {
    lock.releaseLock();
  }
}
// @provenance:store:end

function doGet(e) {
  if (e && e.parameter && e.parameter.token && typeof privateRoute_ === "function") return json_(privateRoute_(e.parameter)); // Owner.gs: owner-only views
  if (!e || !e.parameter || e.parameter.stats !== "1") return json_({ ok: true, service: "nau-ino collector", version: COLLECTOR_VERSION });
  // guests: the M5 public summary only (publicStats); everything finer goes through PRIVATE_ROUTES.stats
  return cachedJson_("stats_pub", function () { return publicStats(fullStats_()); });
}

/** Full aggregate with the chain facts (owner route and the public summary are both cut from this). */
function fullStats_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ev = readSheet_(ss, "events", EVENT_HEADERS);
  var fo = readSheet_(ss, "forms", FORM_HEADERS);
  var stats = aggregate(rowsToObjects(EVENT_HEADERS, ev), rowsToObjects(FORM_HEADERS, fo), new Date().getTime());
  stats.integrity = { collector: COLLECTOR_VERSION, events: chainSummary(ev, EVENT_CHAIN_IDX), forms: chainSummary(fo) };
  return stats;
}

/** JSON response cached for 5 minutes under `key` (skipped when over the 100 KB cache limit). */
function cachedJson_(key, build) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  var out = JSON.stringify(build());
  try { cache.put(key, out, 300); } catch (err) { /* over 100 KB: serve uncached */ }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/** Owner route (Owner.gs): the full aggregate, cached apart from the public summary. */
var PRIVATE_ROUTES = typeof PRIVATE_ROUTES !== "undefined" ? PRIVATE_ROUTES : {};
PRIVATE_ROUTES.stats = function () {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("stats_full");
  if (hit) return JSON.parse(hit);
  var full = fullStats_();
  try { cache.put("stats_full", JSON.stringify(full), 300); } catch (err) { /* too big to cache */ }
  return full;
};

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setNumberFormat("@").setValues([headers]);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < headers.length) {
    // collector update added columns after "chain": extend the header row; old rows keep their cells
    sh.getRange(1, 1, 1, headers.length).setNumberFormat("@").setValues([headers]);
  }
  return sh;
}

function rateOk_(anon, n) {
  var cache = CacheService.getScriptCache();
  var key = "rate:" + anon + ":" + Math.floor(new Date().getTime() / 60000);
  var used = Number(cache.get(key) || 0) + n;
  cache.put(key, String(used), 120);
  return used <= RATE_PER_MINUTE;
}

/** All data rows of a sheet as arrays of strings (header row skipped). */
function readSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().map(function (r) {
    return r.map(function (v) { return String(v); });
  });
}

/* ---------------- pure functions (also run in Node: tests and verify.mjs) ---------------- */

/** Test traffic (owner's PC, localhost, automated browsers): stored, but left out of every number. */
function isTest(v) {
  return v === true || v === "true" || v === "TRUE" || v === 1 || v === "1";
}

/** utm_source tags that mark a link as ours for testing ("?utm_source=selftest"); such visits are test traffic. */
var TEST_SOURCES = { probe: 1, selftest: 1, test: 1 };

function cut(v, n) {
  return v === undefined || v === null ? "" : String(v).slice(0, n);
}

/** A short lower-case token ("ios", "chrome", "facebook") or "". */
function word(v, n) {
  var s = String(v || "").toLowerCase();
  return /^[a-z0-9_-]+$/.test(s) ? s.slice(0, n) : "";
}

/** A sheet cell as text. A leading = + @ gets a space so Sheets never runs it as a formula. */
function cell(v) {
  var s = v === undefined || v === null ? "" : typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  return /^[=+@]/.test(s) ? " " + s : s;
}

/** The exact string hashed for one row: JSON of its cells (all text), without the chain cell. */
function canonical(cells) {
  return JSON.stringify(cells.map(cell));
}

/** Lower-case hex SHA-256 of a UTF-8 string, in Apps Script or in Node. */
function sha256Hex(str) {
  if (typeof Utilities !== "undefined") {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
    return bytes.map(function (b) { return ((b & 0xff) + 0x100).toString(16).slice(1); }).join("");
  }
  return require("crypto").createHash("sha256").update(str, "utf8").digest("hex");
}

/**
 * Add the chain cell to each row: chain = SHA-256(previous chain + "\n" + canonical(row)). `idx` is the
 * chain column (default: last); the cells after it are hashed too.
 */
function chainRows(prev, rows, idx) {
  return rows.map(function (r) {
    var cells = r.map(cell);
    prev = sha256Hex(prev + "\n" + canonical(cells));
    var at = idx === undefined || idx >= cells.length ? cells.length : idx;
    return cells.slice(0, at).concat([prev], cells.slice(at));
  });
}

/** The cells of a stored row that were hashed: all but the chain; old rows (empty "schema") stop at the chain. */
function hashedCells(r, idx) {
  if (idx === undefined || idx >= r.length - 1) return r.slice(0, -1);
  if (r[idx + 1] === "" || r[idx + 1] === undefined) return r.slice(0, idx);
  return r.slice(0, idx).concat(r.slice(idx + 1));
}

/**
 * Re-check a chain from the stored cells (arrays of strings, chain last). Returns the number of rows, the
 * last chain value and the first row (0-based) whose chain does not match, or -1 when all match.
 */
function verifyChain(rows, idx) {
  var prev = GENESIS;
  var at = function (r) { return idx === undefined ? r.length - 1 : idx; };
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var want = sha256Hex(prev + "\n" + canonical(hashedCells(r, idx)));
    if (want !== r[at(r)]) return { rows: rows.length, head: rows[rows.length - 1][at(rows[rows.length - 1])], broken: i };
    prev = want;
  }
  return { rows: rows.length, head: rows.length ? prev : "", broken: -1 };
}

/** Chain facts for the stats endpoint: rows, head and whether the chain still holds. */
function chainSummary(rows, idx) {
  if (!rows.length) return { rows: 0, chain_head: "", chain_ok: true, first_broken_row: null };
  var lastRow = rows[rows.length - 1];
  if (rows.length > CHAIN_CHECK_MAX) return { rows: rows.length, chain_head: lastRow[idx === undefined ? lastRow.length - 1 : idx], chain_ok: null, first_broken_row: null };
  var v = verifyChain(rows, idx);
  // first_broken_row is the Sheet row number (row 1 is the header)
  return { rows: v.rows, chain_head: v.head, chain_ok: v.broken === -1, first_broken_row: v.broken === -1 ? null : v.broken + 2 };
}

/** One events-sheet row (without chain) for a cleaned event; the source is classified here, on the server. */
function eventRow(ev, rowId, receivedAt) {
  var c = classifySource(ev);
  var o = {};
  Object.keys(ev).forEach(function (k) { o[k] = ev[k]; });
  o.row_id = rowId;
  o.received_at = receivedAt;
  o.source = c.source;
  o.medium = c.medium;
  o.source_how = c.how;
  o.props = JSON.stringify(ev.props || {});
  o.schema = "2";
  return EVENT_HEADERS.filter(function (h) { return h !== "chain"; }).map(function (h) { return o[h]; });
}

/** One forms-sheet row (without chain). */
function formRow(f, rowId, receivedAt) {
  var o = { row_id: rowId, received_at: receivedAt, version: f.version, form: f.form, anon: f.anon, path: f.path, data: JSON.stringify(f.data), test: f.test };
  return FORM_HEADERS.slice(0, -1).map(function (h) { return o[h]; });
}

/** Stored rows (arrays of strings, as in the Sheet or its CSV export) back to event / form objects. */
function rowsToObjects(headers, rows) {
  return rows.map(function (r) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = r[i] === undefined ? "" : String(r[i]); });
    try { o.props = o.props ? JSON.parse(o.props) : {}; } catch (err) { o.props = {}; }
    try { o.data = o.data ? JSON.parse(o.data) : {}; } catch (err) { o.data = {}; }
    o.ts = Number(o.ts || o.received_at);
    o.test = isTest(o.test);
    return o;
  });
}

/** Host part only of a referrer ("https://l.facebook.com/l.php?u=…" → "l.facebook.com"); app ids kept. */
function hostOnly(v) {
  var s = String(v || "").trim().toLowerCase();
  var app = /^android-app:\/\/([^/?#]+)/.exec(s);
  if (app) return "android-app://" + app[1].slice(0, 60);
  return s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").slice(0, 80);
}

/** Validate and trim a batch of client events; drops anything malformed. */
function cleanEvents(events, now) {
  if (!Array.isArray(events)) return [];
  var out = [];
  for (var i = 0; i < events.length && out.length < MAX_EVENTS; i++) {
    var e = events[i] || {};
    if (!e.event || !e.anon || !/^[A-Za-z0-9_$:-]{1,40}$/.test(String(e.event))) continue;
    var ts = Number(e.ts);
    if (!isFinite(ts) || ts > now + 60000 || ts < now - 7 * 86400000) ts = now;
    var props = {};
    var p = e.props && typeof e.props === "object" ? e.props : {};
    Object.keys(p).slice(0, 20).forEach(function (k) {
      var v = p[k];
      props[cut(k, 40)] = typeof v === "number" || typeof v === "boolean" ? v : cut(v, 120);
    });
    out.push({
      id: cut(e.id, 40),
      ts: ts,
      version: cut(e.version, 20) || "unknown",
      build: cut(e.build, 12),
      anon: cut(e.anon, 40),
      session: cut(e.session, 40),
      event: cut(e.event, 40),
      path: cut(e.path, 120),
      landing_path: cut(e.landing_path, 120),
      referrer_host: hostOnly(e.referrer_host || e.referrer),
      utm_source: cut(e.utm_source, 60),
      utm_medium: cut(e.utm_medium, 60),
      utm_campaign: cut(e.utm_campaign, 60),
      utm_content: cut(e.utm_content, 60),
      device: cut(e.device, 10),
      label: cut(e.label, 60),
      props: props,
      test: isTest(e.test),
      os: word(e.os, 12),
      browser: word(e.browser, 12),
      in_app: word(e.in_app, 12),
      screen: /^[0-9<+-]{2,10}$/.test(String(e.screen || "")) ? String(e.screen) : "",
      lang: /^[a-z]{2}$/.test(String(e.lang || "")) ? String(e.lang) : "",
      tz: /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/.test(String(e.tz || "")) ? cut(e.tz, 40) : "",
      country: /^[A-Z]{2}$/.test(String(e.country || "")) ? String(e.country) : "",
      country_name: cut(e.country_name, 40),
      region: cut(e.region, 60),
      geo_how: e.geo_how === "ip" || e.geo_how === "tz" ? e.geo_how : "",
    });
  }
  return out;
}

/** Validate a form post like Formspree: honeypot, name, field limits. */
function cleanForm(msg, now) {
  var data = msg && msg.data && typeof msg.data === "object" ? msg.data : null;
  var form = cut(msg && msg.form, 32);
  if (!data || !/^[a-z0-9_-]{1,32}$/.test(form)) return { error: "Invalid form." };
  if (data._gotcha) return { spam: true };
  var keys = Object.keys(data);
  if (keys.length > 40) return { error: "Too many fields." };
  var clean = {};
  keys.forEach(function (k) { clean[cut(k, 40)] = cut(data[k], 2000); });
  if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return { error: "Please enter a valid e-mail address." };
  return { ts: now, version: cut(msg.version, 20) || "unknown", form: form, anon: cut(msg.anon, 40), path: cut(msg.path || data.page, 120), data: clean, test: isTest(msg.test) };
}

function bump(map, key, n) {
  if (key === "" || key === undefined || key === null) return;
  map[key] = (map[key] || 0) + (n || 1);
}

function top(map, n) {
  return Object.keys(map)
    .map(function (k) { return { key: k, count: map[k] }; })
    .sort(function (a, b) { return b.count - a.count || (a.key < b.key ? -1 : 1); })
    .slice(0, n || 10);
}

function median(xs) {
  if (!xs.length) return null;
  var s = xs.slice().sort(function (a, b) { return a - b; });
  var m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function day(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Split one visitor's events into sessions: the client session id, or a new one after a 30-min gap. */
function sessionize(events) {
  var byAnon = {};
  events.forEach(function (e) { (byAnon[e.anon] = byAnon[e.anon] || []).push(e); });
  var sessions = [];
  Object.keys(byAnon).forEach(function (a) {
    var list = byAnon[a].sort(function (x, y) { return x.ts - y.ts; });
    var cur = null;
    list.forEach(function (e) {
      if (!cur || e.ts - cur.end > SESSION_GAP_MS || e.ts - cur.start > SESSION_MAX_MS || (e.session && cur.id && e.session !== cur.id)) {
        cur = { id: e.session, anon: a, start: e.ts, end: e.ts, events: [] };
        sessions.push(cur);
      }
      cur.end = Math.max(cur.end, e.ts);
      cur.events.push(e);
    });
  });
  return sessions;
}

var SUBMIT_EVENTS = { pilot_form_submitted: 1, pilot_requested: 1, updates_form_submitted: 1, survey_submitted: 1 };
/**
 * What a submit event counts as. Leads (someone left their contact) are the newsletter sign-up and the pilot
 * request; the survey is anonymous feedback, so it is counted on its own and never inflates the lead rate.
 */
var FORM_KIND = { updates_form_submitted: "newsletter", pilot_form_submitted: "pilot", pilot_requested: "pilot", survey_submitted: "survey" };
var LEAD_KINDS = { newsletter: 1, pilot: 1 };
var DIRECT = "direct / unknown";

// @provenance:classify:start
/**
 * Known referrer hosts and app ids → [pattern, channel, kind]. Checked in order; a host matches by its
 * end ("l.facebook.com" ends in "facebook.com"), an Android app id by its start ("com.linkedin.android").
 */
var SOURCE_RULES = [
  [/(^|\.)facebook\.com$|^fb\.me$|^com\.facebook\./, "facebook", "social"],
  [/(^|\.)instagram\.com$|^com\.instagram\./, "instagram", "social"],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, "x / twitter", "social"],
  [/(^|\.)reddit\.com$|^redd\.it$|^com\.reddit\./, "reddit", "social"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\./, "linkedin", "social"],
  [/(^|\.)whatsapp\.com$|^wa\.me$|^com\.whatsapp/, "whatsapp", "social"],
  [/^com\.google\.android\.gm$|^mail\.google\.com$/, "gmail", "email"],
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/, "google", "search"],
  [/(^|\.)bing\.com$/, "bing", "search"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo", "search"],
  [/(^|\.)yahoo\.com$/, "yahoo", "search"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube", "social"],
  [/(^|\.)tiktok\.com$/, "tiktok", "social"],
  [/(^|\.)discord(app)?\.com$|^discord\.gg$/, "discord", "social"],
  [/^teams\.microsoft\.com$|(^|\.)outlook\.(live|office)\.com$/, "microsoft (teams / outlook)", "email"],
  [/(^|\.)github\.com$|(^|\.)github\.io$/, "github", "referral"],
];

/** Channel name for a raw utm_source or referrer host ("l.facebook.com", "android-app://com.linkedin.android"). */
function normalizeSource(raw) {
  var s = String(raw || "").trim().toLowerCase();
  if (!s) return DIRECT;
  s = s.replace(/^android-app:\/\//, "").replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/^www\./, "");
  if (s === "fb" || s === "ig") return s === "fb" ? "facebook" : "instagram";
  for (var i = 0; i < SOURCE_RULES.length; i++) if (SOURCE_RULES[i][0].test(s)) return SOURCE_RULES[i][1];
  return s;
}

/** social / search / email for a known channel, else referral. */
function kindOf(channel) {
  for (var i = 0; i < SOURCE_RULES.length; i++) if (SOURCE_RULES[i][1] === channel) return SOURCE_RULES[i][2];
  return "referral";
}

/**
 * Who sent this visit. Rules, in order:
 * 1. utm_source in the landing URL (a link we shared) → source = that tag, normalised; medium = utm_medium,
 *    else the kind of channel; how = "utm".
 * 2. else a referring host reported by the browser → source = host mapped by SOURCE_RULES (or the host
 *    itself); medium = social / search / email / referral; how = "referrer".
 * 3. else → "direct / unknown", medium "direct", how "none".
 */
function classifySource(e) {
  var tag = String(e.utm_source || "").trim();
  if (tag) {
    var src = normalizeSource(tag);
    return { source: src, medium: String(e.utm_medium || "").trim().toLowerCase() || kindOf(src), how: "utm" };
  }
  var host = hostOnly(e.referrer_host || e.referrer);
  if (host) {
    var ch = normalizeSource(host);
    return { source: ch, medium: kindOf(ch), how: "referrer" };
  }
  return { source: DIRECT, medium: "direct", how: "none" };
}
// @provenance:classify:end

/** Per source: visitors, sessions, conversions, medium, how it was known, referrer hosts, campaigns, landings. */
function referrals(sessions) {
  var by = {};
  sessions.forEach(function (s) {
    var first = s.events[0]; // first touch: the session's first event decides its source
    var c = classifySource(first);
    var r = by[c.source] = by[c.source] || { source: c.source, anons: {}, sessions: 0, leads: {}, kinds: { newsletter: {}, pilot: {}, survey: {} }, campaigns: {}, contents: {}, landing: {}, mediums: {}, how: {}, hosts: {} };
    r.anons[s.anon] = 1;
    r.sessions++;
    // per visitor, not per session: one person who signs up twice (or in two tabs) counts once
    s.events.forEach(function (e) {
      var kind = FORM_KIND[e.event];
      if (!kind) return;
      r.kinds[kind][s.anon] = 1;
      if (LEAD_KINDS[kind]) r.leads[s.anon] = 1;
    });
    bump(r.campaigns, first.utm_campaign);
    bump(r.contents, first.utm_content);
    bump(r.mediums, c.medium);
    bump(r.how, c.how);
    bump(r.hosts, hostOnly(first.referrer_host || first.referrer));
    var land = first.landing_path || (s.events.filter(function (e) { return e.event === "$pageview"; })[0] || first).path;
    bump(r.landing, land);
  });
  return Object.keys(by)
    .map(function (k) {
      var r = by[k];
      return {
        source: r.source,
        visitors: Object.keys(r.anons).length,
        sessions: r.sessions,
        // conversions = visitors who left their contact (newsletter or pilot); rate = of this source's visitors
        conversions: Object.keys(r.leads).length,
        conversion_rate: Object.keys(r.anons).length ? Object.keys(r.leads).length / Object.keys(r.anons).length : 0,
        by_form: {
          newsletter: Object.keys(r.kinds.newsletter).length,
          pilot: Object.keys(r.kinds.pilot).length,
          survey: Object.keys(r.kinds.survey).length,
        },
        mediums: top(r.mediums, 4),
        how: top(r.how, 3),
        referrer_hosts: top(r.hosts, 8),
        campaigns: top(r.campaigns, 8),
        contents: top(r.contents, 8),
        landing_pages: top(r.landing, 5),
      };
    })
    .sort(function (a, b) { return b.visitors - a.visitors || b.sessions - a.sessions || (a.source < b.source ? -1 : 1); });
}

var GAME_ROUNDS = ["1", "2", "3", "4", "5"]; // 3+1 and 14+1 people, then three harmful-action scenarios

/**
 * "Spot the stranger" game, from game_round_finished events.
 * Per round: plays, correct share, median human time (all plays), best human time (fastest correct play)
 * and median machine time. Per player (anonymous id): score = how many of the 3 rounds they got right at
 * least once (0-3); "finished all" = played all 3 rounds. Scenario is a short id chosen by the game; only
 * ids like "yard-night" are counted, anything else is dropped (no free text).
 */
function gameStats(events) {
  var rounds = {}, players = {}, scenarios = {};
  events.forEach(function (e) {
    if (e.event !== "game_round_finished") return;
    var p = e.props || {};
    var r = String(p.round || "?");
    var ok = p.correct === true || p.correct === "true";
    var human = Number(p.human_ms), machine = Number(p.machine_ms);
    var g = rounds[r] = rounds[r] || { round: r, people: p.people || null, plays: 0, correct: 0, human: [], best: null, machine: [] };
    g.plays++;
    if (ok) g.correct++;
    if (p.human_ms !== "" && p.human_ms !== undefined && isFinite(human)) {
      g.human.push(human);
      if (ok && (g.best === null || human < g.best)) g.best = human;
    }
    if (p.machine_ms !== "" && p.machine_ms !== undefined && isFinite(machine)) g.machine.push(machine);
    var pl = players[e.anon] = players[e.anon] || { played: {}, won: {} };
    pl.played[r] = 1;
    if (ok) pl.won[r] = 1;
    var sc = String(p.scenario || "");
    if (/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(sc)) bump(scenarios, sc.toLowerCase());
  });
  var list = Object.keys(players).map(function (a) { return players[a]; });
  var dist = GAME_ROUNDS.map(function () { return 0; }).concat([0]);
  var finished = 0, total = 0;
  list.forEach(function (pl) {
    var score = GAME_ROUNDS.filter(function (r) { return pl.won[r]; }).length;
    dist[score]++;
    total += score;
    if (GAME_ROUNDS.every(function (r) { return pl.played[r]; })) finished++;
  });
  return {
    rounds: Object.keys(rounds).sort().map(function (k) {
      var g = rounds[k];
      return {
        round: g.round, people: g.people, plays: g.plays, correct_pct: g.plays ? g.correct / g.plays : 0,
        median_human_ms: median(g.human), best_human_ms: g.best, median_machine_ms: median(g.machine),
      };
    }),
    summary: {
      players: list.length,
      finished_all: finished,
      avg_score: list.length ? total / list.length : 0,
      score_distribution: dist.map(function (n, i) { return { score: i, players: n }; }),
      scenarios: top(scenarios, 10),
    },
  };
}

/** All metrics for one set of events and form rows. */
var WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var LOCAL_TZ = "Europe/Bucharest";
var localFmt = null;

/** Weekday (0 = Monday) and hour of a timestamp in Romanian time. */
function localSlot(ts) {
  if (!localFmt) localFmt = new Intl.DateTimeFormat("en-GB", { timeZone: LOCAL_TZ, weekday: "short", hour: "2-digit", hour12: false });
  var parts = localFmt.formatToParts(new Date(ts));
  var wd = "", hr = 0;
  parts.forEach(function (p) {
    if (p.type === "weekday") wd = p.value;
    if (p.type === "hour") hr = Number(p.value) % 24;
  });
  return { weekday: Math.max(0, WEEKDAYS.indexOf(wd)), hour: hr };
}

/**
 * Who visits, counted once per visitor: the last non-empty value each visitor reported (the country from the
 * IP lookup arrives after consent, so it replaces the time-zone guess). Countries keep how they were found.
 */
function whoVisits(events) {
  var byAnon = {};
  events.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) {
    var v = (byAnon[e.anon] = byAnon[e.anon] || {});
    ["device"].concat(WHO_FIELDS).forEach(function (k) {
      if (e[k]) v[k] = e[k];
    });
    if (!v.browser && e.props && e.props.browser) v.browser = String(e.props.browser).toLowerCase();
  });
  var m = { device: {}, os: {}, browser: {}, in_app: {}, screen: {}, lang: {} };
  var countries = {}, names = {}, how = {}, regions = {};
  Object.keys(byAnon).forEach(function (a) {
    var v = byAnon[a];
    Object.keys(m).forEach(function (k) { bump(m[k], v[k] || (k === "in_app" ? "" : "unknown")); });
    var cc = v.country || "??";
    bump(countries, cc);
    if (v.country_name) names[cc] = v.country_name;
    how[cc] = how[cc] || {};
    bump(how[cc], v.geo_how || "none");
    if (v.region && v.country) bump(regions, v.country + "|" + v.region);
  });
  return {
    devices: top(m.device, 5),
    os: top(m.os, 8),
    browsers: top(m.browser, 8),
    in_app: top(m.in_app, 8),
    screens: top(m.screen, 8),
    langs: top(m.lang, 8),
    countries: top(countries, 20).map(function (c) {
      return { key: c.key, name: names[c.key] || (c.key === "??" ? "Unknown" : c.key), visitors: c.count, how: top(how[c.key] || {}, 3) };
    }),
    regions: top(regions, 25).map(function (r) {
      var parts = r.key.split("|");
      return { country: parts[0], region: parts[1], visitors: r.count };
    }),
  };
}

/** Sessions started per weekday × hour (Romanian time): a 7 × 24 grid. */
function hourGrid(sessions) {
  var grid = WEEKDAYS.map(function () { return Array(24).fill(0); });
  sessions.forEach(function (s) {
    var slot = localSlot(s.start);
    grid[slot.weekday][slot.hour]++;
  });
  return { tz: LOCAL_TZ, weekdays: WEEKDAYS, grid: grid };
}

/* ---------------- PostHog-style extras (pure): heatmap, frustration, scroll, retention, paths ---------------- */

var HEAT_COLS = 50; // 2 % of the page width per cell
var HEAT_ROWS = 50; // 2 % of the page height per cell
var HEAT_MAX_CELLS = 600;
var CLICK_EVENTS = { $autocapture: 1, $deadclick: 1, $rageclick: 1 };

/** 0-100 → cell index 0..n-1 (clamped); null for non-numbers. */
function heatCell(v, n) {
  var x = Number(v);
  if (!isFinite(x)) return null;
  return Math.max(0, Math.min(n - 1, Math.floor((Math.max(0, Math.min(100, x)) / 100) * n)));
}

/**
 * Click heatmaps: one grid per page + device (phone / tablet / desktop), from clicks that carry the
 * position the client sends (x, y in % of the document, rounded to 1 %). Cells are [col, row, clicks].
 */
function heatmaps(events) {
  var by = {};
  events.forEach(function (e) {
    if (!CLICK_EVENTS[e.event] || !e.props) return;
    var cx = heatCell(e.props.x, HEAT_COLS), cy = heatCell(e.props.y, HEAT_ROWS);
    if (cx === null || cy === null) return;
    var dev = String(e.props.vp || e.device || "unknown");
    var k = e.path + "|" + dev;
    var h = (by[k] = by[k] || { path: e.path, device: dev, clicks: 0, cells: {}, labels: {} });
    h.clicks++;
    bump(h.cells, cx + "," + cy);
    if (e.label) bump(h.labels, e.label);
  });
  return Object.keys(by)
    .map(function (k) {
      var h = by[k];
      var cells = Object.keys(h.cells)
        .map(function (c) { var p = c.split(","); return [Number(p[0]), Number(p[1]), h.cells[c]]; })
        .sort(function (a, b) { return b[2] - a[2]; })
        .slice(0, HEAT_MAX_CELLS);
      return { path: h.path, device: h.device, clicks: h.clicks, cols: HEAT_COLS, rows: HEAT_ROWS, cells: cells, top: top(h.labels, 10) };
    })
    .sort(function (a, b) { return b.clicks - a.clicks; })
    .slice(0, 30);
}

/** Rage and dead clicks per page + element label (the client detects them; here they are counted). */
function frustration(events) {
  var rage = {}, dead = {};
  events.forEach(function (e) {
    if (e.event !== "$rageclick" && e.event !== "$deadclick") return;
    bump(e.event === "$rageclick" ? rage : dead, e.path + " | " + (e.label || "(no label)"));
  });
  var split = function (c) {
    var i = c.key.indexOf(" | ");
    return { path: c.key.slice(0, i), label: c.key.slice(i + 3), count: c.count };
  };
  return { rage: top(rage, 20).map(split), dead: top(dead, 20).map(split) };
}

/** Scroll depth: per page, the share of visitors whose deepest scroll reached 25 / 50 / 75 / 100 %. */
function scrollDepth(events) {
  var best = {};
  events.forEach(function (e) {
    if (e.event !== "$pageleave" || !e.props) return;
    var d = Number(e.props.scroll_pct);
    if (!isFinite(d)) return;
    var p = (best[e.path] = best[e.path] || {});
    p[e.anon] = Math.max(p[e.anon] || 0, Math.max(0, Math.min(100, d)));
  });
  return Object.keys(best)
    .map(function (path) {
      var depths = Object.keys(best[path]).map(function (a) { return best[path][a]; });
      var n = depths.length;
      var reach = function (t) { return depths.filter(function (d) { return d >= t; }).length / n; };
      return { path: path, visitors: n, r25: reach(25), r50: reach(50), r75: reach(75), r100: reach(98), median: median(depths) };
    })
    .sort(function (a, b) { return b.visitors - a.visitors; })
    .slice(0, 15);
}

/** Monday (UTC) of the week a timestamp falls in, as YYYY-MM-DD. */
function weekStart(ts) {
  var d = new Date(ts);
  var wd = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - wd)).toISOString().slice(0, 10);
}

/**
 * Retention: returning visitors (sessions on two or more different days) and weekly cohorts by the week of
 * the first visit: how many came back 1, 2 and 3 weeks later.
 */
function retention(sessions) {
  var by = {};
  sessions.forEach(function (s) {
    var v = (by[s.anon] = by[s.anon] || { first: s.start, days: {}, weeks: {} });
    v.first = Math.min(v.first, s.start);
    v.days[day(s.start)] = 1;
    v.weeks[weekStart(s.start)] = 1;
  });
  var anons = Object.keys(by);
  var returning = anons.filter(function (a) { return Object.keys(by[a].days).length >= 2; }).length;
  var cohorts = {};
  anons.forEach(function (a) {
    var w0 = weekStart(by[a].first);
    var c = (cohorts[w0] = cohorts[w0] || { week: w0, size: 0, w1: 0, w2: 0, w3: 0 });
    c.size++;
    [1, 2, 3].forEach(function (k) {
      var wk = new Date(Date.parse(w0 + "T00:00:00Z") + k * 7 * 86400000).toISOString().slice(0, 10);
      if (by[a].weeks[wk]) c["w" + k]++;
    });
  });
  return {
    visitors: anons.length,
    returning: returning,
    returning_rate: anons.length ? returning / anons.length : 0,
    cohorts: Object.keys(cohorts).sort().map(function (k) { return cohorts[k]; }),
  };
}

/** Most common first three pages of a session (repeats of the same page collapse into one step). */
function topPaths(sessions) {
  var paths = {};
  sessions.forEach(function (s) {
    var seq = [];
    s.events.forEach(function (e) {
      if (e.event !== "$pageview" || !e.path) return;
      if (seq[seq.length - 1] !== e.path) seq.push(e.path);
    });
    if (seq.length) bump(paths, seq.slice(0, 3).join(" → "));
  });
  return top(paths, 12);
}

/** All PostHog-style extras for one set of events (the test split gets its own via statsFor). */
function behaviourStats(events, sessions) {
  return {
    heatmaps: heatmaps(events),
    frustration: frustration(events),
    scroll: scrollDepth(events),
    retention: retention(sessions),
    paths: topPaths(sessions),
  };
}

/**
 * What guests see on /analytics/: the M5 lead-generation story. Totals, daily trend, where visitors came
 * from (visitors, leads, conversion %, medium, how we know, utm_campaign), the funnel, device types,
 * countries, form counts, the game summary and the chain facts. Everything finer or personal (regions,
 * OS / browser / in-app / screen / language, referrer hosts, landing paths, utm_content, pages & clicks,
 * heatmaps, frustration, scroll, retention, paths, survey answers, per-version detail, test-traffic
 * stats) stays behind the owner route.
 */
function publicStats(full) {
  var a = (full.versions && full.versions.all) || {};
  var who = a.who || {};
  var pub = {
    visitors: a.visitors || 0,
    sessions: a.sessions || 0,
    pageviews: a.pageviews || 0,
    avg_session_s: a.avg_session_s || 0,
    leads: a.leads || 0,
    lead_rate: a.lead_rate || 0,
    daily: a.daily || [],
    sources: (a.sources || []).map(function (r) {
      return {
        source: r.source,
        visitors: r.visitors,
        sessions: r.sessions,
        conversions: r.conversions,
        conversion_rate: r.conversion_rate,
        by_form: r.by_form,
        mediums: r.mediums,
        how: r.how,
        campaigns: r.campaigns,
      };
    }),
    funnel: a.funnel || [],
    forms: a.forms || [],
    who: {
      devices: who.devices || [],
      countries: (who.countries || []).map(function (c) { return { key: c.key, name: c.name, visitors: c.visitors, how: c.how }; }),
    },
    game: (a.game || []).map(function (r) {
      return { round: r.round, people: r.people, plays: r.plays, correct_pct: r.correct_pct, median_human_ms: r.median_human_ms, median_machine_ms: r.median_machine_ms };
    }),
    game_summary: a.game_summary
      ? { players: a.game_summary.players, finished_all: a.game_summary.finished_all, avg_score: a.game_summary.avg_score, score_distribution: a.game_summary.score_distribution }
      : null,
  };
  return {
    public: true,
    generated: full.generated,
    collector: full.collector,
    events: full.events,
    test_events: full.test_events,
    integrity: full.integrity,
    version_list: Object.keys(full.versions || {}).filter(function (v) { return v !== "all"; }),
    versions: { all: pub },
  };
}

function statsFor(events, forms) {
  var anons = {}, pages = {}, devices = {}, clicks = {}, daily = {};
  var pageviews = 0;
  events.forEach(function (e) {
    anons[e.anon] = 1;
    if (e.event === "$pageview") {
      pageviews++;
      bump(pages, e.path);
      var d = daily[day(e.ts)] = daily[day(e.ts)] || { date: day(e.ts), pageviews: 0, v: {} };
      d.pageviews++;
      d.v[e.anon] = 1;
    }
    if (e.event === "$autocapture" && e.label) bump(clicks, e.label);
  });
  var sessions = sessionize(events);
  var bounced = 0, durations = [];
  sessions.forEach(function (s) {
    var first = s.events[0];
    bump(devices, first.device || "unknown");
    // PostHog web analytics: engaged = more than 1 pageview, or any click / custom event, or over 10 s
    var views = s.events.filter(function (e) { return e.event === "$pageview"; }).length;
    var others = s.events.filter(function (e) { return e.event !== "$pageview" && e.event !== "$pageleave"; }).length;
    if (!(views > 1 || others > 0 || s.end - s.start > ENGAGED_MS)) bounced++;
    durations.push(s.end - s.start);
  });

  // funnel: ordered steps per visitor
  var byAnon = {};
  events.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) { (byAnon[e.anon] = byAnon[e.anon] || []).push(e); });
  var reached = FUNNEL.map(function () { return 0; });
  Object.keys(byAnon).forEach(function (a) {
    // ordered steps, all within FUNNEL_WINDOW_MS of step 1; the best start wins (like windowFunnel)
    var best = 0, list = byAnon[a];
    for (var i0 = 0; i0 < list.length && best < FUNNEL.length; i0++) {
      if (!FUNNEL[0].match(list[i0])) continue;
      var step = 1;
      for (var j = i0 + 1; j < list.length && step < FUNNEL.length; j++) {
        if (list[j].ts - list[i0].ts > FUNNEL_WINDOW_MS) break;
        if (FUNNEL[step].match(list[j])) step++;
      }
      best = Math.max(best, step);
    }
    for (var i = 0; i < best; i++) reached[i]++;
  });
  var funnel = FUNNEL.map(function (f, i) {
    return { step: f.name, visitors: reached[i], conversion: i === 0 || !reached[0] ? (i === 0 ? 1 : 0) : reached[i] / reached[0] };
  });

  // forms and survey answers: closed questions as counts per answer; free text only as "how many wrote one"
  var formCounts = {}, survey = {}, freeText = {};
  forms.forEach(function (f) {
    bump(formCounts, f.form);
    if (f.form !== "survey") return;
    Object.keys(f.data || {}).forEach(function (k) {
      var v = String(f.data[k]).trim();
      if (isFreeText(k)) {
        if (v) bump(freeText, k);
        return;
      }
      if (PRIVATE_FIELDS[k] || /^game_r/.test(k)) return;
      if (!v || v.length > 60) return;
      survey[k] = survey[k] || {};
      bump(survey[k], v);
    });
  });
  var surveyOut = {};
  Object.keys(survey).forEach(function (k) { surveyOut[k] = top(survey[k], 12); });

  var gameOut = gameStats(events);

  // leads: visitors who left their contact (newsletter or pilot), the M5 headline number
  var leadAnons = {};
  events.forEach(function (e) {
    if (LEAD_KINDS[FORM_KIND[e.event]]) leadAnons[e.anon] = 1;
  });
  var nVisitors = Object.keys(anons).length;

  return {
    leads: Object.keys(leadAnons).length,
    lead_rate: nVisitors ? Object.keys(leadAnons).length / nVisitors : 0,
    behaviour: behaviourStats(events, sessions),
    visitors: Object.keys(anons).length,
    sessions: sessions.length,
    pageviews: pageviews,
    bounce_rate: sessions.length ? bounced / sessions.length : 0,
    avg_session_s: durations.length ? Math.round(durations.reduce(function (a, b) { return a + b; }, 0) / durations.length / 1000) : 0,
    top_pages: top(pages, 10),
    sources: referrals(sessions),
    devices: top(devices, 5),
    clicks: top(clicks, 15),
    funnel: funnel,
    forms: top(formCounts, 10),
    survey: surveyOut,
    survey_free_text: top(freeText, 30),
    game: gameOut.rounds,
    game_summary: gameOut.summary,
    who: whoVisits(events),
    hours: hourGrid(sessions),
    daily: Object.keys(daily).sort().map(function (k) {
      return { date: k, pageviews: daily[k].pageviews, visitors: Object.keys(daily[k].v).length };
    }),
  };
}

// @provenance:aggregate:start
/** Stats for all versions merged ("all") and for each version on its own. Test rows and duplicate ids out. */
function aggregate(events, forms, now) {
  // Visitors who arrived through a test-tagged link (utm_source probe / selftest / test) count as test
  // traffic too, with every event and form of theirs; the rows themselves are never changed.
  var testAnon = {};
  events.forEach(function (e) {
    var tag = String(e.utm_source || "").toLowerCase();
    if (TEST_SOURCES[tag] && e.anon) testAnon[e.anon] = 1;
  });
  var isTestRow = function (r) { return isTest(r.test) || Boolean(r.anon && testAnon[r.anon]); };
  var testEvRows = events.filter(isTestRow), testFoRows = forms.filter(isTestRow);
  var testEvents = testEvRows.length + testFoRows.length;
  events = events.filter(function (e) { return !isTestRow(e); });
  forms = forms.filter(function (f) { return !isTestRow(f); });
  var seen = {};
  events = events.filter(function (e) {
    if (!e.id) return true;
    if (seen[e.id]) return false;
    return (seen[e.id] = true);
  });
  var versions = {};
  events.forEach(function (e) { versions[e.version || "unknown"] = 1; });
  forms.forEach(function (f) { versions[f.version || "unknown"] = 1; });
  var out = { generated: now, collector: COLLECTOR_VERSION, events: events.length, test_events: testEvents, versions: {} };
  out.versions.all = statsFor(events, forms);
  // the team's own test traffic, counted the same way but kept apart (the dashboard's "Test" view)
  out.test = statsFor(testEvRows, testFoRows);
  out.test_visitors = out.test.visitors;
  Object.keys(versions).forEach(function (v) {
    out.versions[v] = statsFor(
      events.filter(function (e) { return (e.version || "unknown") === v; }),
      forms.filter(function (f) { return (f.version || "unknown") === v; })
    );
  });
  return out;
}
// @provenance:aggregate:end

if (typeof module !== "undefined") {
  module.exports = {
    COLLECTOR_VERSION: COLLECTOR_VERSION, TEST_SOURCES: TEST_SOURCES, EVENT_HEADERS: EVENT_HEADERS, FORM_HEADERS: FORM_HEADERS, GENESIS: GENESIS,
    LEGACY_EVENT_HEADERS: LEGACY_EVENT_HEADERS, EVENT_CHAIN_IDX: EVENT_CHAIN_IDX, WHO_FIELDS: WHO_FIELDS, hashedCells: hashedCells,
    whoVisits: whoVisits, hourGrid: hourGrid, localSlot: localSlot,
    isTest: isTest, cleanEvents: cleanEvents, cleanForm: cleanForm, normalizeSource: normalizeSource, classifySource: classifySource,
    hostOnly: hostOnly, cell: cell, canonical: canonical, sha256Hex: sha256Hex, chainRows: chainRows, verifyChain: verifyChain,
    chainSummary: chainSummary, eventRow: eventRow, formRow: formRow, rowsToObjects: rowsToObjects,
    referrals: referrals, sessionize: sessionize, statsFor: statsFor, gameStats: gameStats, aggregate: aggregate, median: median,
    heatmaps: heatmaps, heatCell: heatCell, frustration: frustration, scrollDepth: scrollDepth, retention: retention, weekStart: weekStart,
    topPaths: topPaths, behaviourStats: behaviourStats, publicStats: publicStats, FORM_HEADERS_LIST: FORM_HEADERS,
  };
}
