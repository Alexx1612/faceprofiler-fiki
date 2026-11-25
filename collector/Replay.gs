/**
 * Session replays and "live now" for the owner (PostHog-style, our own).
 *
 * Methodology: the browser records the page with rrweb only after the visitor accepts the consent bar,
 * with every input masked (lib/replay.ts). Chunks of about 10 s arrive as `{type:"replay", ...}` posts and
 * are saved as JSON files in the Drive folder "Nau-ino replays/<day>/<session>_<seq>.json"; one row per
 * session in the sheet `replays` keeps the summary (times, chunks, bytes, first page, device, source,
 * clicks, rage clicks). Nothing about replays is ever part of the public `?stats=1` answer: the list, the
 * recordings and the live view are private routes (Owner.gs) that need a Google sign-in listed in
 * OWNER_EMAILS. `pruneReplays_` deletes sessions older than RETENTION_DAYS (run it from a daily trigger).
 */

var REPLAY_ROOT = "Nau-ino replays";
var REPLAY_MAX_BYTES = 1024 * 1024; // one chunk (the first full snapshot carries the page CSS, ~300 KB)
var REPLAY_MAX_CHUNKS = 120; // 15 min at one chunk per ~8-10 s, with margin
var REPLAY_PAGE_BYTES = 1500 * 1024; // one `get` answer
var RETENTION_DAYS = 30;
var LIVE_WINDOW_MS = 2 * 60 * 1000;
var REPLAY_HEADERS = [
  "session", "anon", "version", "test", "day", "started_at", "last_at", "duration_ms", "chunks", "bytes",
  "first_path", "pages", "device", "source", "country", "clicks", "rage_clicks",
];

/** doPost hook: store one replay chunk (body is the raw JSON text, up to REPLAY_MAX_BYTES). */
function storeReplay_(body) {
  if (body.length > REPLAY_MAX_BYTES) return { errors: [{ message: "Chunk too large." }] };
  var msg;
  try {
    msg = JSON.parse(body);
  } catch (err) {
    return { errors: [{ message: "Bad chunk." }] };
  }
  var c = cleanChunk(msg, new Date().getTime());
  if (c.error) return { errors: [{ message: c.error }] };
  if (!rateOk_("replay:" + c.session, 1)) return { errors: [{ message: "Slow down." }] };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_("replays", REPLAY_HEADERS);
    var found = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(c.session).matchEntireCell(true).findNext() : null;
    var old = found ? rowToReplay(sh.getRange(found.getRow(), 1, 1, REPLAY_HEADERS.length).getValues()[0].map(String)) : null;
    if (old && Number(old.chunks) >= REPLAY_MAX_CHUNKS) return { errors: [{ message: "Session too long." }] };
    var row = mergeReplayRow(old, c, body.length);
    dayFolder_(row.day).createFile(c.session + "_" + pad3(c.seq) + ".json", JSON.stringify({ session: c.session, seq: c.seq, t0: c.t0, events: c.events }), "application/json");
    var values = [REPLAY_HEADERS.map(function (h) { return row[h] === undefined ? "" : String(row[h]); })];
    if (found) sh.getRange(found.getRow(), 1, 1, REPLAY_HEADERS.length).setValues(values);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, REPLAY_HEADERS.length).setNumberFormat("@").setValues(values);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function rootFolder_() {
  var it = DriveApp.getFoldersByName(REPLAY_ROOT);
  return it.hasNext() ? it.next() : DriveApp.createFolder(REPLAY_ROOT);
}

function dayFolder_(day) {
  var root = rootFolder_();
  var it = root.getFoldersByName(day);
  return it.hasNext() ? it.next() : root.createFolder(day);
}

/** Delete replay folders and rows older than RETENTION_DAYS. Add a daily time trigger for this. */
function pruneReplays_() {
  var cutoff = new Date().getTime() - RETENTION_DAYS * 86400000;
  var root = rootFolder_();
  var days = root.getFolders();
  while (days.hasNext()) {
    var f = days.next();
    var t = Date.parse(f.getName() + "T00:00:00Z");
    if (isFinite(t) && t < cutoff) f.setTrashed(true);
  }
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("replays");
  if (!sh || sh.getLastRow() < 2) return;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, REPLAY_HEADERS.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (Number(rows[i][REPLAY_HEADERS.indexOf("last_at")]) < cutoff) sh.deleteRow(i + 2);
  }
}

/** Run once from the editor to add the daily clean-up (Triggers → it appears as pruneReplays_). */
function installReplayPruneTrigger() {
  ScriptApp.newTrigger("pruneReplays_").timeBased().everyDays(1).atHour(4).create();
}

/* ---------------- owner-only routes (Owner.gs checks the Google token first) ---------------- */

var PRIVATE_ROUTES = typeof PRIVATE_ROUTES !== "undefined" ? PRIVATE_ROUTES : {};

PRIVATE_ROUTES.replays = function (params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("replays");
  var rows = !sh || sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, REPLAY_HEADERS.length).getValues().map(function (r) {
    return rowToReplay(r.map(String));
  });
  if (params.op === "get") return replayGet_(rows, String(params.session || ""), Number(params.part || 0));
  return { ok: true, sessions: filterReplays(rows, params, new Date().getTime()) };
};

PRIVATE_ROUTES.live = function () {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("events");
  var now = new Date().getTime();
  if (!sh || sh.getLastRow() < 2) return { ok: true, now: now, sessions: [] };
  var n = Math.min(600, sh.getLastRow() - 1);
  var raw = sh.getRange(sh.getLastRow() - n + 1, 1, n, EVENT_HEADERS.length).getValues().map(function (r) { return r.map(String); });
  return { ok: true, now: now, sessions: liveSessions(rowsToObjects(EVENT_HEADERS, raw), now, LIVE_WINDOW_MS) };
};

/** One session's chunks in order, paged by size; part 0 also carries the session's analytics events. */
function replayGet_(rows, session, part) {
  var row = rows.filter(function (r) { return r.session === session; })[0];
  if (!row) return { ok: false, error: "no such session" };
  var folder = dayFolder_(row.day);
  var files = [];
  var it = folder.searchFiles("title contains '" + session.replace(/'/g, "") + "_'");
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  var pages = pageBySize(files.map(function (f) { return f.getSize(); }), REPLAY_PAGE_BYTES);
  var mine = pages[part] || [];
  var chunks = mine.map(function (i) { return JSON.parse(files[i].getBlob().getDataAsString()); });
  var out = { ok: true, session: session, row: row, part: part, parts: pages.length, chunks: chunks };
  if (part === 0) {
    var ev = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("events");
    if (ev && ev.getLastRow() >= 2) {
      var col = EVENT_HEADERS.indexOf("session") + 1;
      var hits = ev.getRange(2, col, ev.getLastRow() - 1, 1).createTextFinder(session).matchEntireCell(true).findAll();
      out.events = hits.slice(0, 400).map(function (h) {
        var o = rowsToObjects(EVENT_HEADERS, [ev.getRange(h.getRow(), 1, 1, EVENT_HEADERS.length).getValues()[0].map(String)])[0];
        return { ts: o.ts, event: o.event, path: o.path, label: o.label };
      });
    }
  }
  return out;
}

/* ---------------- pure functions (also run in Node: collector/replay.test.mjs) ---------------- */

function pad3(n) {
  return ("00" + n).slice(-3);
}

/** Validate one posted chunk; returns the clean chunk or {error}. */
function cleanChunk(msg, now) {
  if (!msg || msg.type !== "replay") return { error: "Not a replay." };
  var id = /^[A-Za-z0-9_-]{4,64}$/;
  if (!id.test(String(msg.session || "")) || !id.test(String(msg.anon || ""))) return { error: "Bad ids." };
  var seq = Number(msg.seq);
  if (!(seq >= 0 && seq < REPLAY_MAX_CHUNKS && Math.floor(seq) === seq)) return { error: "Bad sequence." };
  if (!Array.isArray(msg.events) || !msg.events.length) return { error: "No events." };
  var t0 = Number(msg.t0);
  if (!isFinite(t0) || t0 > now + 60000 || t0 < now - 86400000) t0 = now;
  var meta = msg.meta && typeof msg.meta === "object" ? msg.meta : {};
  return {
    session: String(msg.session),
    anon: String(msg.anon),
    seq: seq,
    t0: t0,
    events: msg.events,
    version: cut(msg.version, 20),
    test: isTest(msg.test),
    meta: {
      path: cut(meta.path, 120),
      device: word(meta.device, 10),
      country: cut(meta.country, 2).toUpperCase(),
      source: classifySource({ utm_source: cut(meta.utm_source, 60), referrer_host: hostOnly(meta.referrer_host) }).source,
    },
    stats: chunkStats(msg.events),
  };
}

/** Clicks, rage clicks, pages and time span of one chunk of rrweb events. */
function chunkStats(events) {
  var clicks = [];
  var pages = 0;
  var first = Infinity;
  var last = 0;
  events.forEach(function (e) {
    var t = Number(e && e.timestamp);
    if (isFinite(t)) {
      first = Math.min(first, t);
      last = Math.max(last, t);
    }
    if (!e) return;
    if (e.type === 4) pages++; // Meta: a page load or navigation
    if (e.type === 3 && e.data && e.data.source === 2 && e.data.type === 2) clicks.push({ t: t, x: Number(e.data.x), y: Number(e.data.y) });
  });
  return { clicks: clicks.length, rage: rageClicks(clicks).length, pages: pages, first: isFinite(first) ? first : 0, last: last };
}

/** Rage clicks (PostHog's rule): 3 or more clicks within 1 s and 30 px of the first. Returns their start times. */
function rageClicks(clicks) {
  var out = [];
  for (var i = 0; i < clicks.length; i++) {
    var n = 1;
    for (var j = i + 1; j < clicks.length && clicks[j].t - clicks[i].t <= 1000; j++) {
      if (Math.abs(clicks[j].x - clicks[i].x) <= 30 && Math.abs(clicks[j].y - clicks[i].y) <= 30) n++;
    }
    if (n >= 3) {
      out.push(clicks[i].t);
      while (i + 1 < clicks.length && clicks[i + 1].t - clicks[i].t <= 1000) i++;
    }
  }
  return out;
}

/** Fold one chunk into the session row (idempotent per seq only in the sense that counts add up per chunk). */
function mergeReplayRow(old, c, bytes) {
  var s = c.stats;
  if (!old) {
    var start = s.first || c.t0;
    return {
      session: c.session, anon: c.anon, version: c.version, test: c.test ? "true" : "false",
      day: new Date(start).toISOString().slice(0, 10), started_at: start, last_at: s.last || start,
      duration_ms: Math.max(0, (s.last || start) - start), chunks: 1, bytes: bytes,
      first_path: c.meta.path, pages: s.pages, device: c.meta.device, source: c.meta.source,
      country: c.meta.country, clicks: s.clicks, rage_clicks: s.rage,
    };
  }
  var r = {};
  REPLAY_HEADERS.forEach(function (h) { r[h] = old[h]; });
  var startedAt = Number(old.started_at);
  var lastAt = Math.max(Number(old.last_at) || 0, s.last || c.t0);
  r.last_at = lastAt;
  r.duration_ms = Math.max(0, lastAt - startedAt);
  r.chunks = Number(old.chunks || 0) + 1;
  r.bytes = Number(old.bytes || 0) + bytes;
  r.pages = Number(old.pages || 0) + s.pages;
  r.clicks = Number(old.clicks || 0) + s.clicks;
  r.rage_clicks = Number(old.rage_clicks || 0) + s.rage;
  if (!r.first_path && c.meta.path) r.first_path = c.meta.path;
  if (!r.country && c.meta.country) r.country = c.meta.country;
  if (c.test) r.test = "true";
  return r;
}

function rowToReplay(cells) {
  var o = {};
  REPLAY_HEADERS.forEach(function (h, i) { o[h] = cells[i] === undefined ? "" : cells[i]; });
  return o;
}

/** List filter: test=real|test|all (default real), days (default 7), min_s, path substring; newest first, max 100. */
function filterReplays(rows, params, now) {
  var which = String(params.test || "real");
  var days = Number(params.days || 7);
  var minMs = Number(params.min_s || 0) * 1000;
  var path = String(params.path || "").toLowerCase();
  return rows
    .filter(function (r) {
      var t = isTest(r.test);
      if (which === "real" && t) return false;
      if (which === "test" && !t) return false;
      if (Number(r.last_at) < now - days * 86400000) return false;
      if (Number(r.duration_ms) < minMs) return false;
      return !path || String(r.first_path).toLowerCase().indexOf(path) >= 0;
    })
    .sort(function (a, b) { return Number(b.started_at) - Number(a.started_at); })
    .slice(0, 100)
    .map(function (r) {
      return {
        session: r.session, anon: String(r.anon).slice(0, 6), version: r.version, test: isTest(r.test),
        started_at: Number(r.started_at), duration_ms: Number(r.duration_ms), chunks: Number(r.chunks),
        pages: Number(r.pages), first_path: r.first_path, device: r.device, source: r.source, country: r.country,
        clicks: Number(r.clicks), rage_clicks: Number(r.rage_clicks),
      };
    });
}

/** Sessions with an event in the last windowMs: short anon, current page, device, country, source, seconds active. */
function liveSessions(events, now, windowMs) {
  var by = {};
  events.forEach(function (e) {
    var t = Number(e.ts);
    if (!e.session || !isFinite(t) || t < now - windowMs || t > now + 60000) return;
    var s = by[e.session] = by[e.session] || { session: e.session, anon: String(e.anon || "").slice(0, 6), first: t, last: t, path: "", device: e.device, country: e.country || "", source: "", test: false };
    s.first = Math.min(s.first, t);
    if (t >= s.last) {
      s.last = t;
      if (e.path) s.path = e.path;
    }
    if (!s.source && e.source) s.source = e.source;
    if (!s.country && e.country) s.country = e.country;
    if (isTest(e.test)) s.test = true;
  });
  return Object.keys(by)
    .map(function (k) {
      var s = by[k];
      return { anon: s.anon, path: s.path, device: s.device || "", country: s.country, source: s.source || DIRECT, test: s.test, seconds_active: Math.round((s.last - s.first) / 1000), last_seen_s: Math.max(0, Math.round((now - s.last) / 1000)) };
    })
    .sort(function (a, b) { return a.last_seen_s - b.last_seen_s; });
}

/** Group file sizes into pages of at most maxBytes (a single larger file gets its own page). */
function pageBySize(sizes, maxBytes) {
  var pages = [];
  var cur = [];
  var used = 0;
  sizes.forEach(function (n, i) {
    if (cur.length && used + n > maxBytes) {
      pages.push(cur);
      cur = [];
      used = 0;
    }
    cur.push(i);
    used += n;
  });
  if (cur.length) pages.push(cur);
  return pages;
}

if (typeof module !== "undefined") {
  module.exports = {
    cleanChunk: cleanChunk, chunkStats: chunkStats, rageClicks: rageClicks, mergeReplayRow: mergeReplayRow,
    filterReplays: filterReplays, liveSessions: liveSessions, pageBySize: pageBySize, REPLAY_HEADERS: REPLAY_HEADERS,
  };
}
