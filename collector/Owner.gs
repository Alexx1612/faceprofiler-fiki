/**
 * Owner-only access for private views (session replays, the form inbox).
 *
 * Methodology: the dashboard signs the owner in with Google (the same OAuth client as the pilot form) and
 * sends the ID token; `ownerFromToken_` checks it with Google's tokeninfo endpoint and `checkClaims`
 * (Pilot.gs: audience, issuer, verified e-mail, expiry), then accepts only e-mails listed in the Script
 * Property OWNER_EMAILS (comma-separated). No address is written in this file. Verified owners are cached
 * for 10 minutes by token hash so each page of a replay does not call Google again.
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
  if (hit) return owners.indexOf(hit) >= 0 ? hit : null;
  try {
    var res = UrlFetchApp.fetch(TOKENINFO_URL + encodeURIComponent(token), { muteHttpExceptions: true });
    var claims = res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : {};
    var c = checkClaims(claims, props.getProperty("GOOGLE_CLIENT_ID"), new Date().getTime());
    if (!c.ok || owners.indexOf(c.email) < 0) return null;
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
    .filter(function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); });
}

if (typeof module !== "undefined") {
  module.exports = { ownerList: ownerList };
}

/**
 * Private GET routes, registered by other files: PRIVATE_ROUTES.replays = function (params, email) {...}.
 * doGet sends any request with `token=` here; `route=` picks the handler.
 */
var PRIVATE_ROUTES = typeof PRIVATE_ROUTES !== "undefined" ? PRIVATE_ROUTES : {};

function privateRoute_(params) {
  return privateJson_(params.token, function (email) {
    var fn = PRIVATE_ROUTES[String(params.route || "")];
    return fn ? fn(params, email) : { ok: false, error: "unknown route" };
  });
}
