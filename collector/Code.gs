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
 * - doGet?stats=1 returns aggregates only (never raw rows, e-mails or free text), per site version and
 *   for all versions merged ("all"). Metric definitions follow PostHog: visitors = distinct anonymous
 *   ids, session = events of one visitor with gaps under 30 minutes, at most 24 h (the client also sends
 *   its session id), bounce = a session that is not engaged (engaged: more than one pageview, any click or
 *   custom event, or over 10 s), funnel = ordered steps per visitor within 14 days of step 1. Clicks are
 *   counted by a stable label (data-track, else aria-label or text), so totals add up across versions.
 * - Rows marked test (the owner's PC, localhost, automated browsers) are stored but excluded from all
 *   stats; only their count comes back as `test_events`.
 * - Rows carry the client event id; duplicates (a retried batch) are dropped when aggregating.
 * - The aggregation functions are pure and exported for Node tests (aggregate.test.mjs).
 */

var EVENT_HEADERS = ["id", "ts", "version", "build", "anon", "session", "event", "path", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content", "device", "label", "props", "test"];
var FORM_HEADERS = ["ts", "version", "form", "anon", "path", "data", "test"];
var MAX_BODY = 64 * 1024;
var MAX_EVENTS = 50;
var RATE_PER_MINUTE = 120;
var SESSION_GAP_MS = 30 * 60 * 1000;
var SESSION_MAX_MS = 24 * 3600 * 1000;
var ENGAGED_MS = 10 * 1000;
var FUNNEL_WINDOW_MS = 14 * 86400 * 1000;
/** Form fields never summarised in stats (personal or free text). */
var PRIVATE_FIELDS = { email: 1, phone: 1, name: 1, message: 1, comment: 1, school: 1, page: 1, _gotcha: 1 };
var FUNNEL = [
  { name: "Landing page", match: function (e) { return e.event === "$pageview" && String(e.path).indexOf("/landing") === 0; } },
  { name: "Book a pilot or survey opened", match: function (e) { return e.event === "cta_book_pilot_click" || e.event === "survey_opened"; } },
  { name: "Form or survey sent", match: function (e) { return e.event === "pilot_form_submitted" || e.event === "updates_form_submitted" || e.event === "survey_submitted"; } },
];

/* ---------------- web app entry points (Apps Script only) ---------------- */

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || "";
    if (body.length > MAX_BODY) return json_({ errors: [{ message: "Too large." }] });
    var msg = JSON.parse(body);
    if (msg.type === "events") return json_(storeEvents_(msg.events));
    if (msg.type === "form") return json_(storeForm_(msg));
    return json_({ errors: [{ message: "Unknown type." }] });
  } catch (err) {
    return json_({ errors: [{ message: "Bad request." }] });
  }
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.stats !== "1") return json_({ ok: true, service: "nau-ino collector" });
  var cache = CacheService.getScriptCache();
  var hit = cache.get("stats");
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = aggregate(readRows_(ss, "events", EVENT_HEADERS), readRows_(ss, "forms", FORM_HEADERS), new Date().getTime());
  var out = JSON.stringify(stats);
  try { cache.put("stats", out, 300); } catch (err) { /* over 100 KB: serve uncached */ }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

function rateOk_(anon, n) {
  var cache = CacheService.getScriptCache();
  var key = "rate:" + anon + ":" + Math.floor(new Date().getTime() / 60000);
  var used = Number(cache.get(key) || 0) + n;
  cache.put(key, String(used), 120);
  return used <= RATE_PER_MINUTE;
}

function append_(name, headers, rows) {
  if (!rows.length) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_(name, headers);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
}

function storeEvents_(events) {
  var clean = cleanEvents(events, new Date().getTime());
  if (!clean.length) return { errors: [{ message: "No valid events." }] };
  if (!rateOk_(clean[0].anon, clean.length)) return { errors: [{ message: "Slow down." }] };
  append_("events", EVENT_HEADERS, clean.map(function (ev) {
    return EVENT_HEADERS.map(function (h) { return h === "props" ? JSON.stringify(ev.props) : ev[h]; });
  }));
  return { ok: true, stored: clean.length };
}

function storeForm_(msg) {
  var f = cleanForm(msg, new Date().getTime());
  if (f.error) return { errors: [{ message: f.error }] };
  if (f.spam) return { ok: true };
  if (!rateOk_(f.anon || "form", 5)) return { errors: [{ message: "Slow down." }] };
  append_("forms", FORM_HEADERS, [[f.ts, f.version, f.form, f.anon, f.path, JSON.stringify(f.data), f.test]]);
  return { ok: true };
}

function readRows_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  return values.map(function (r) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = r[i]; });
    try { o.props = o.props ? JSON.parse(o.props) : {}; } catch (err) { o.props = {}; }
    try { o.data = o.data ? JSON.parse(o.data) : {}; } catch (err) { o.data = {}; }
    o.ts = Number(o.ts);
    o.test = isTest(o.test);
    return o;
  });
}

/* ---------------- pure functions (also run in Node tests) ---------------- */

/** Test traffic (owner's PC, localhost, automated browsers): stored, but left out of every number. */
function isTest(v) {
  return v === true || v === "true" || v === "TRUE" || v === 1 || v === "1";
}

function cut(v, n) {
  return v === undefined || v === null ? "" : String(v).slice(0, n);
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
      referrer: cut(e.referrer, 80),
      utm_source: cut(e.utm_source, 60),
      utm_medium: cut(e.utm_medium, 60),
      utm_campaign: cut(e.utm_campaign, 60),
      utm_content: cut(e.utm_content, 60),
      device: cut(e.device, 10),
      label: cut(e.label, 60),
      props: props,
      test: isTest(e.test),
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

var SUBMIT_EVENTS = { pilot_form_submitted: 1, updates_form_submitted: 1, survey_submitted: 1 };
var DIRECT = "direct / unknown";
/** Known referrer hosts and app ids mapped to one channel name. Checked in order, by suffix or prefix. */
var SOURCE_RULES = [
  [/(^|\.)facebook\.com$|^fb\.me$|^com\.facebook\./, "facebook"],
  [/(^|\.)instagram\.com$|^com\.instagram\./, "instagram"],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, "x / twitter"],
  [/(^|\.)reddit\.com$|^redd\.it$|^com\.reddit\./, "reddit"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\./, "linkedin"],
  [/(^|\.)whatsapp\.com$|^wa\.me$|^com\.whatsapp/, "whatsapp"],
  [/^com\.google\.android\.gm$|^mail\.google\.com$/, "gmail"],
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.com$/, "yahoo"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)discord(app)?\.com$|^discord\.gg$/, "discord"],
  [/^teams\.microsoft\.com$|(^|\.)outlook\.(live|office)\.com$/, "microsoft (teams / outlook)"],
  [/(^|\.)github\.com$|(^|\.)github\.io$/, "github"],
];

/** One channel name for a raw utm_source or referrer ("l.facebook.com", "android-app://com.linkedin.android"). */
function normalizeSource(raw) {
  var s = String(raw || "").trim().toLowerCase();
  if (!s) return DIRECT;
  s = s.replace(/^android-app:\/\//, "").replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/^www\./, "");
  if (s === "fb" || s === "ig") return s === "fb" ? "facebook" : "instagram";
  for (var i = 0; i < SOURCE_RULES.length; i++) if (SOURCE_RULES[i][0].test(s)) return SOURCE_RULES[i][1];
  return s;
}

function source(e) {
  return normalizeSource(e.utm_source || e.referrer);
}

/** Per source: visitors, sessions, sessions that sent a form or the survey, campaigns and landing paths. */
function referrals(sessions) {
  var by = {};
  sessions.forEach(function (s) {
    var first = s.events[0];
    var src = source(first);
    var r = by[src] = by[src] || { source: src, anons: {}, sessions: 0, conversions: 0, campaigns: {}, contents: {}, landing: {} };
    r.anons[s.anon] = 1;
    r.sessions++;
    if (s.events.some(function (e) { return SUBMIT_EVENTS[e.event]; })) r.conversions++;
    bump(r.campaigns, first.utm_campaign);
    bump(r.contents, first.utm_content);
    var land = s.events.filter(function (e) { return e.event === "$pageview"; })[0] || first;
    bump(r.landing, land.path);
  });
  return Object.keys(by)
    .map(function (k) {
      var r = by[k];
      return {
        source: r.source,
        visitors: Object.keys(r.anons).length,
        sessions: r.sessions,
        conversions: r.conversions,
        conversion_rate: r.sessions ? r.conversions / r.sessions : 0,
        campaigns: top(r.campaigns, 8),
        contents: top(r.contents, 8),
        landing_pages: top(r.landing, 5),
      };
    })
    .sort(function (a, b) { return b.visitors - a.visitors || b.sessions - a.sessions || (a.source < b.source ? -1 : 1); });
}

/** All metrics for one set of events and form rows. */
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
    var step = best;
    for (var i = 0; i < step; i++) reached[i]++;
  });
  var funnel = FUNNEL.map(function (f, i) {
    return { step: f.name, visitors: reached[i], conversion: i === 0 || !reached[0] ? (i === 0 ? 1 : 0) : reached[i] / reached[0] };
  });

  // forms and survey answers (closed questions only)
  var formCounts = {}, survey = {};
  forms.forEach(function (f) {
    bump(formCounts, f.form);
    if (f.form !== "survey") return;
    Object.keys(f.data || {}).forEach(function (k) {
      if (PRIVATE_FIELDS[k] || /^game_r/.test(k)) return;
      var v = String(f.data[k]);
      if (!v || v.length > 60) return;
      survey[k] = survey[k] || {};
      bump(survey[k], v);
    });
  });
  var surveyOut = {};
  Object.keys(survey).forEach(function (k) { surveyOut[k] = top(survey[k], 12); });

  // game
  var rounds = {};
  events.forEach(function (e) {
    if (e.event !== "game_round_finished") return;
    var r = String(e.props.round || "?");
    var g = rounds[r] = rounds[r] || { round: r, people: e.props.people || null, plays: 0, correct: 0, human: [], machine: [] };
    g.plays++;
    if (e.props.correct === true || e.props.correct === "true") g.correct++;
    if (isFinite(Number(e.props.human_ms))) g.human.push(Number(e.props.human_ms));
    if (isFinite(Number(e.props.machine_ms))) g.machine.push(Number(e.props.machine_ms));
  });
  var game = Object.keys(rounds).sort().map(function (k) {
    var g = rounds[k];
    return { round: g.round, people: g.people, plays: g.plays, correct_pct: g.plays ? g.correct / g.plays : 0, median_human_ms: median(g.human), median_machine_ms: median(g.machine) };
  });

  return {
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
    game: game,
    daily: Object.keys(daily).sort().map(function (k) {
      return { date: k, pageviews: daily[k].pageviews, visitors: Object.keys(daily[k].v).length };
    }),
  };
}

/** Stats for all versions merged ("all") and for each version on its own. */
function aggregate(events, forms, now) {
  var testEvents = events.filter(function (e) { return isTest(e.test); }).length + forms.filter(function (f) { return isTest(f.test); }).length;
  events = events.filter(function (e) { return !isTest(e.test); });
  forms = forms.filter(function (f) { return !isTest(f.test); });
  var seen = {};
  events = events.filter(function (e) {
    if (!e.id) return true;
    if (seen[e.id]) return false;
    return (seen[e.id] = true);
  });
  var versions = {};
  events.forEach(function (e) { versions[e.version || "unknown"] = 1; });
  forms.forEach(function (f) { versions[f.version || "unknown"] = 1; });
  var out = { generated: now, events: events.length, test_events: testEvents, versions: {} };
  out.versions.all = statsFor(events, forms);
  Object.keys(versions).forEach(function (v) {
    out.versions[v] = statsFor(
      events.filter(function (e) { return (e.version || "unknown") === v; }),
      forms.filter(function (f) { return (f.version || "unknown") === v; })
    );
  });
  return out;
}

if (typeof module !== "undefined") {
  module.exports = { isTest: isTest, cleanEvents: cleanEvents, cleanForm: cleanForm, normalizeSource: normalizeSource, referrals: referrals, sessionize: sessionize, statsFor: statsFor, aggregate: aggregate, median: median };
}
