/**
 * Owner-only access for private views (session replays, the form inbox).
 *
 * Methodology: the dashboard signs the owner in with Google (the same OAuth client as the pilot form) and
 * sends the ID token; `ownerFromToken_` checks it with Google's tokeninfo endpoint and `checkClaims`
 * (Pilot.gs: audience, issuer, verified e-mail, expiry), then accepts only e-mails listed in the Script
 * Property OWNER_EMAILS (comma-separated). No address is written in this file. Verified owners are cached
 * for 10 minutes by token hash so each page of a replay does not call Google again.
 *
 * Scripts (the owner's local database, tools/analytics_db.py) use the Script Property EXPORT_KEY instead of a
 * Google token: `privateRoute_` accepts it in `token=` (or `key=`), compared in constant time.
 *
 * Contract for other files: `ownerFromToken_(token)` → lower-case e-mail or null;
 * `privateJson_(token, fn)` → runs fn(email) for an owner, else returns {ok:false, error:"not owner"}.
 */

/** E-mail of the signed-in owner, or null (missing/invalid token, or not in OWNER_EMAILS). */
function ownerFromToken_(token) {
  token = String(token || "");
  if (!token) return null;
  var props = PropertiesService.getScriptProperties();
  var owners = ownerList(props.getProperty("OWNER_EMAILS"));
  if (!owners.length) return null;
  var cache = CacheService.getScriptCache();
  var key = "own_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  var hit = cache.get(key);
  if (hit) return owners.indexOf(sameMailbox(hit)) >= 0 ? hit : null;
  try {
    var res = UrlFetchApp.fetch(TOKENINFO_URL + encodeURIComponent(token), { muteHttpExceptions: true });
    var claims = res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : {};
    var c = checkClaims(claims, props.getProperty("GOOGLE_CLIENT_ID"), new Date().getTime());
    if (!c.ok || owners.indexOf(sameMailbox(c.email)) < 0) return null;
    cache.put(key, c.email, 600);
    return c.email;
  } catch (err) {
    return null;
  }
}

/** Run fn(ownerEmail) and return its JSON when the token belongs to an owner. */
function privateJson_(token, fn) {
  var email = ownerFromToken_(token);
  if (!email) return { ok: false, error: "not owner" };
  return fn(email);
}

/** "a@x.ro, B@y.com" → ["a@x.ro", "b@y.com"] (pure; tested in Node). */
function ownerList(raw) {
  return String(raw || "")
    .split(",")
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); })
    .map(sameMailbox);
}

/** Gmail ignores dots and "+tags" in the name part: "a.b+x@gmail.com" and "ab@gmail.com" are one mailbox. */
function sameMailbox(email) {
  var e = String(email || "").trim().toLowerCase();
  var at = e.lastIndexOf("@");
  if (at < 0) return e;
  var name = e.slice(0, at), domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") return name.split("+")[0].replace(/\./g, "") + "@gmail.com";
  return e;
}

if (typeof module !== "undefined") {
  module.exports = { ownerList: ownerList, sameMailbox: sameMailbox, keyMatches: keyMatches, exportPage: exportPage };
}

/**
 * Private GET routes, registered by other files: PRIVATE_ROUTES.replays = function (params, email) {...}.
 * doGet sends any request with `token=` here; `route=` picks the handler.
 */
var PRIVATE_ROUTES = typeof PRIVATE_ROUTES !== "undefined" ? PRIVATE_ROUTES : {};

function privateRoute_(params) {
  var fn = PRIVATE_ROUTES[String(params.route || "")];
  var run = function (who) { return fn ? fn(params, who) : { ok: false, error: "unknown route" }; };
  // scripts (tools/analytics_db.py) authenticate with the EXPORT_KEY Script Property instead of a Google token;
  // doGet only routes requests that carry `token=`, so a script sends the key there (or in `key=` as well)
  var exportKey = PropertiesService.getScriptProperties().getProperty("EXPORT_KEY");
  if (keyMatches(params.key || params.token, exportKey)) return run("export-key");
  return privateJson_(params.token, run);
}

/**
 * True when `given` equals the EXPORT_KEY. Constant time over the key's length (no early exit on the first
 * differing character); false when the property is unset or shorter than 32 characters (pure; Node-tested).
 */
function keyMatches(given, expected) {
  given = String(given || "");
  expected = String(expected || "");
  if (expected.length < EXPORT_KEY_MIN || !given) return false;
  var diff = given.length ^ expected.length;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i % given.length);
  return diff === 0;
}

var EXPORT_KEY_MIN = 32;
/** Sheets the export route may read, raw (test rows included: the local database decides what to count). */
var EXPORT_SHEETS = { events: 1, forms: 1, replays: 1, inbox_status: 1 };
var EXPORT_MAX = 5000;
var EXPORT_DEFAULT = 2000;

/** Which rows one export page covers: clamps offset/limit; `next` is the offset of the following page or null. */
function exportPage(total, offset, limit) {
  total = Math.max(0, Math.floor(Number(total) || 0));
  offset = Math.min(total, Math.max(0, Math.floor(Number(offset) || 0)));
  limit = Math.min(EXPORT_MAX, Math.max(1, Math.floor(Number(limit) || EXPORT_DEFAULT)));
  var count = Math.min(limit, total - offset);
  return { offset: offset, count: count, next: offset + count < total ? offset + count : null };
}

/**
 * Raw rows of one sheet for the owner's local database (tools/analytics_db.py): `sheet`, `offset`, `limit`.
 * Rows come in sheet order as {_row: sheet row number, header: value, ...}, with the sheet's own header row,
 * so the caller can re-check the hash chain cell by cell.
 */
PRIVATE_ROUTES.export = function (params) {
  var name = String(params.sheet || "");
  if (!EXPORT_SHEETS[name]) return { ok: false, error: "unknown sheet" };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return { ok: true, sheet: name, headers: [], total: 0, offset: 0, next: null, rows: [] };
  var width = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h, j) { return String(h) || "col" + (j + 1); });
  var total = Math.max(0, sh.getLastRow() - 1);
  var page = exportPage(total, params.offset, params.limit);
  var values = page.count ? sh.getRange(2 + page.offset, 1, page.count, width).getValues() : [];
  return {
    ok: true,
    sheet: name,
    headers: headers,
    total: total,
    offset: page.offset,
    next: page.next,
    rows: values.map(function (r, i) {
      var o = { _row: 2 + page.offset + i };
      headers.forEach(function (h, j) { o[h] = String(r[j]); });
      return o;
    }),
  };
};
