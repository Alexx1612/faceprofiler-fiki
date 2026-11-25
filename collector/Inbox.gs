/**
 * Form inbox (Formspree-like), owner-only: every submission from the `forms` sheet with filters, detail,
 * status (new / handled / spam / archived), notes, duplicates and a spam hint; plus an optional daily digest
 * and an optional autoresponder for newsletter sign-ups.
 *
 * Methodology: the hash-chained `forms` sheet is never edited. Status changes and notes are appended to a
 * separate `inbox_status` sheet (row_id, status, note, updated_at, by); the newest line per row_id wins.
 * The inbox is served only through PRIVATE_ROUTES.inbox (Owner.gs checks the Google token and OWNER_EMAILS).
 * Spam scoring is a suggestion only ("spam?"), never an automatic action: links in text, a submit faster
 * than 3 s after page load (the client sends elapsed_ms), a disposable e-mail domain.
 *
 * Script Properties: NOTIFY_EMAIL (digest recipient, shared with Pilot.gs), DAILY_DIGEST ("false" turns the
 * digest off), NEWSLETTER_AUTOREPLY ("true" turns the autoresponder on). Trigger: dailyDigest_, time-driven,
 * every day 08:00-09:00 (Apps Script → Triggers → Add trigger).
 */

var INBOX_STATUS_HEADERS = ["row_id", "status", "note", "updated_at", "by"];
var INBOX_STATUSES = { new: 1, handled: 1, spam: 1, archived: 1 };
var INBOX_MAX = 2000;
var AUTOREPLY_MAX_PER_DAY = 50;
var DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com",
];

var PRIVATE_ROUTES = typeof PRIVATE_ROUTES !== "undefined" ? PRIVATE_ROUTES : {};

/** GET ?token=…&route=inbox[&action=status&row_id=…&status=…&note=…] */
PRIVATE_ROUTES.inbox = function (params, ownerEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (params.action === "status") {
    var st = String(params.status || "");
    if (!INBOX_STATUSES[st] || !params.row_id) return { ok: false, error: "bad status" };
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = ss.getSheetByName("inbox_status") || ss.insertSheet("inbox_status");
      if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, INBOX_STATUS_HEADERS.length).setValues([INBOX_STATUS_HEADERS]);
      sh.appendRow([cut(params.row_id, 40), st, cut(params.note, 500), String(new Date().getTime()), ownerEmail]);
    } finally {
      lock.releaseLock();
    }
    CacheService.getScriptCache().remove("stats_full");
  }
  var forms = rowsToObjects(FORM_HEADERS, readSheet_(ss, "forms", FORM_HEADERS));
  var statusSheet = ss.getSheetByName("inbox_status");
  var statusRows = statusSheet && statusSheet.getLastRow() > 1
    ? statusSheet.getRange(2, 1, statusSheet.getLastRow() - 1, INBOX_STATUS_HEADERS.length).getValues()
    : [];
  return inboxItems(forms, statusRows);
};

/* ---------------- pure functions (Node tests: collector/inbox.test.mjs) ---------------- */

/** Spam hint: score 0-3 with reasons. Never acted on automatically. */
function spamScore(data, path) {
  var reasons = [];
  var text = Object.keys(data || {})
    .filter(function (k) { return k !== "email" && k !== "elapsed_ms" && k !== "id_token"; })
    .map(function (k) { return String(data[k]); })
    .join(" ");
  if (/https?:\/\/|www\.|\[url|<a\s/i.test(text)) reasons.push("link in text");
  var ms = Number(data && data.elapsed_ms);
  if (isFinite(ms) && ms > 0 && ms < 3000) reasons.push("sent " + Math.round(ms / 100) / 10 + " s after page load");
  var domain = String((data && data.email) || "").toLowerCase().split("@")[1] || "";
  if (domain && DISPOSABLE_DOMAINS.indexOf(domain) >= 0) reasons.push("disposable e-mail");
  return { score: reasons.length, reasons: reasons, suggest: reasons.length >= 1 ? "spam?" : "" };
}

/** How many submissions share each e-mail (lower-case). */
function duplicateCounts(forms) {
  var n = {};
  forms.forEach(function (f) {
    var em = String((f.data && f.data.email) || "").trim().toLowerCase();
    if (em) n[em] = (n[em] || 0) + 1;
  });
  return n;
}

/** Newest status line per row_id from inbox_status rows ([row_id, status, note, updated_at, by]). */
function mergeStatus(statusRows) {
  var by = {};
  statusRows.forEach(function (r) {
    var id = String(r[0] || ""), at = Number(r[3]) || 0;
    if (!id || !INBOX_STATUSES[String(r[1])]) return;
    if (!by[id] || at >= by[id].updated_at) by[id] = { status: String(r[1]), note: String(r[2] || ""), updated_at: at, by: String(r[4] || "") };
  });
  return by;
}

/** Inbox JSON: newest first, with status, note, duplicates ("seen N times") and the spam hint. */
function inboxItems(forms, statusRows) {
  var status = mergeStatus(statusRows);
  var dups = duplicateCounts(forms);
  var items = forms
    .slice()
    .sort(function (a, b) { return Number(b.received_at) - Number(a.received_at); })
    .slice(0, INBOX_MAX)
    .map(function (f) {
      var data = {};
      Object.keys(f.data || {}).forEach(function (k) { if (k !== "id_token") data[k] = f.data[k]; });
      var em = String(data.email || "").trim().toLowerCase();
      var st = status[f.row_id] || { status: "new", note: "", updated_at: 0, by: "" };
      return {
        row_id: f.row_id,
        received_at: Number(f.received_at),
        form: f.form,
        version: f.version,
        path: f.path,
        test: Boolean(f.test),
        verified: data.verified === "true",
        data: data,
        status: st.status,
        note: st.note,
        status_by: st.by,
        status_at: st.updated_at,
        seen: em ? dups[em] : 1,
        spam: spamScore(data, f.path),
      };
    });
  var counts = { new: 0, handled: 0, spam: 0, archived: 0 };
  items.forEach(function (i) { counts[i.status]++; });
  return { ok: true, total: forms.length, counts: counts, items: items };
}

/** "YYYY-MM-DD" in Romanian time. */
function roDay(ts) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
}

/** Daily digest for one Romanian day: newsletter sign-ups (with e-mails), survey count, pilot requests. */
function digestText(forms, dayStr) {
  var real = forms.filter(function (f) { return !f.test && roDay(Number(f.received_at)) === dayStr; });
  var news = real.filter(function (f) { return f.form === "updates"; });
  var pilots = real.filter(function (f) { return f.form === "pilot"; });
  var surveys = real.filter(function (f) { return f.form === "survey"; });
  if (!real.length) return null;
  var lines = [
    "Nau-ino, " + dayStr + ":",
    "",
    "Newsletter sign-ups: " + news.length,
  ];
  news.forEach(function (f) { lines.push("  - " + String((f.data && f.data.email) || "(no e-mail)") + (f.data && f.data.role ? " (" + f.data.role + ")" : "")); });
  lines.push("Pilot requests: " + pilots.length);
  pilots.forEach(function (f) { lines.push("  - " + String((f.data && f.data.school) || "?") + " · " + String((f.data && f.data.email) || "?")); });
  lines.push("Survey responses: " + surveys.length, "", "Open the inbox on /analytics/ (sign in as the owner) for details.");
  return { subject: "Nau-ino daily digest — " + dayStr + ": " + news.length + " sign-ups, " + pilots.length + " pilots, " + surveys.length + " surveys", body: lines.join("\n") };
}

/** Plain-text autoreply for a newsletter sign-up. */
function autoreplyText() {
  return {
    subject: "You're on the Nau-ino list",
    body: "Thank you for signing up. We'll send one e-mail when the free pilot starts near you.\n\nTo unsubscribe, just reply \"unsubscribe\".\n\n— The Nau-ino team",
  };
}

/* ---------------- Apps Script side effects ---------------- */

/** Time trigger (daily, 08:00-09:00): yesterday's digest to NOTIFY_EMAIL, unless DAILY_DIGEST is "false". */
function dailyDigest_() {
  var props = PropertiesService.getScriptProperties();
  var to = props.getProperty("NOTIFY_EMAIL");
  if (!to || props.getProperty("DAILY_DIGEST") === "false") return;
  var forms = rowsToObjects(FORM_HEADERS, readSheet_(SpreadsheetApp.getActiveSpreadsheet(), "forms", FORM_HEADERS));
  var d = digestText(forms, roDay(new Date().getTime() - 86400000));
  if (d) MailApp.sendEmail(to, d.subject, d.body);
}

/** Called by storeForm_ after a newsletter sign-up: autoreply when NEWSLETTER_AUTOREPLY is "true". */
function afterNewsletter_(f) {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty("NEWSLETTER_AUTOREPLY") !== "true") return;
    var to = String((f.data && f.data.email) || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || spamScore(f.data, f.path).score) return;
    var key = "autoreply_" + roDay(new Date().getTime());
    var n = Number(props.getProperty(key) || 0);
    if (n >= AUTOREPLY_MAX_PER_DAY) return;
    props.setProperty(key, String(n + 1));
    var m = autoreplyText();
    MailApp.sendEmail(to, (f.test ? "[TEST] " : "") + m.subject, m.body);
  } catch (err) {
    /* never block a sign-up on e-mail */
  }
}

if (typeof module !== "undefined") {
  module.exports = { spamScore: spamScore, duplicateCounts: duplicateCounts, mergeStatus: mergeStatus, inboxItems: inboxItems, digestText: digestText, roDay: roDay, autoreplyText: autoreplyText };
}
