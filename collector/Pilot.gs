/**
 * Nau-ino collector, pilot requests (a second file next to Code.gs in the same Apps Script project).
 *
 * Methodology: the landing page's "Book a free 30-day pilot" form sends the Google ID token of the signed-in
 * visitor with the request (field `id_token`). Code.gs calls handlePilot_(form) before it stores the row:
 *   1. the token is removed from the row at once (tokens are never written to the sheet);
 *   2. it is checked with Google's tokeninfo endpoint: audience = our OAuth client ID (Script Property
 *      GOOGLE_CLIENT_ID), issuer = accounts.google.com, e-mail verified, not expired; only then the name
 *      and e-mail from Google replace whatever the browser sent, and the row gets verified = "true";
 *   3. the team is notified by e-mail at the address in Script Property NOTIFY_EMAIL (nothing personal is
 *      hard-coded here), at most MAX_MAILS_PER_DAY per day; with SEND_CONFIRMATION = "true" a short
 *      confirmation also goes to the requester, but only to a Google-verified address.
 * Test-mode requests (?test=1, automated browsers) are stored and mailed with "[TEST]" in the subject.
 * The pure parts (checkClaims, pilotMail, mailDayKey) are exported for Node tests (collector/pilot.test.mjs).
 */

var TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
var GOOGLE_ISSUERS = { "accounts.google.com": 1, "https://accounts.google.com": 1 };
var MAX_MAILS_PER_DAY = 20;

/** Called by Code.gs storeForm_ for form "pilot"; returns the form with the token removed and the e-mail checked. */
function handlePilot_(f) {
  var data = f.data || {};
  var token = String(data.id_token || "");
  delete data.id_token;
  var props = PropertiesService.getScriptProperties();
  var verified = false;
  if (token) {
    try {
      var res = UrlFetchApp.fetch(TOKENINFO_URL + encodeURIComponent(token), { muteHttpExceptions: true });
      var claims = res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : {};
      var c = checkClaims(claims, props.getProperty("GOOGLE_CLIENT_ID"), new Date().getTime());
      if (c.ok) {
        data.email = c.email;
        data.name = c.name;
        verified = true;
      } else {
        data.verify_error = c.reason;
      }
    } catch (err) {
      data.verify_error = "tokeninfo unreachable";
    }
  }
  data.verified = verified ? "true" : "false";
  f.data = data;
  try {
    notifyPilot_(f, props, verified);
  } catch (err) {
    data.mail_error = String(err && err.message ? err.message : err).slice(0, 120);
  }
  return f;
}

/** E-mail the team (and, if switched on, the verified requester); never more than MAX_MAILS_PER_DAY a day. */
function notifyPilot_(f, props, verified) {
  var to = props.getProperty("NOTIFY_EMAIL");
  if (!to) return;
  var key = mailDayKey(new Date());
  var sent = Number(props.getProperty(key) || 0);
  if (sent >= MAX_MAILS_PER_DAY) {
    f.data.mail_error = "daily mail limit reached";
    return;
  }
  var m = pilotMail(f, new Date(f.ts || new Date().getTime()));
  var opts = { to: to, subject: m.subject, body: m.body, name: "Nau-ino site" };
  if (verified && f.data.email) opts.replyTo = f.data.email;
  MailApp.sendEmail(opts);
  sent++;
  if (verified && f.data.email && props.getProperty("SEND_CONFIRMATION") === "true" && sent < MAX_MAILS_PER_DAY) {
    var c = confirmationMail(f);
    MailApp.sendEmail({ to: f.data.email, subject: c.subject, body: c.body, name: "Nau-ino", replyTo: to });
    sent++;
  }
  props.setProperty(key, String(sent));
  f.data.notified = "true";
}

// ---------- pure functions (tested in Node) ----------

/** Check the claims Google's tokeninfo returned for an ID token. */
function checkClaims(claims, clientId, nowMs) {
  if (!clientId) return { ok: false, reason: "GOOGLE_CLIENT_ID not set" };
  if (!claims || typeof claims !== "object" || !claims.aud) return { ok: false, reason: "token rejected by Google" };
  if (String(claims.aud) !== String(clientId)) return { ok: false, reason: "wrong audience" };
  if (!GOOGLE_ISSUERS[String(claims.iss)]) return { ok: false, reason: "wrong issuer" };
  if (!(claims.email_verified === true || claims.email_verified === "true")) return { ok: false, reason: "e-mail not verified" };
  var exp = Number(claims.exp) * 1000;
  if (!exp || exp < nowMs) return { ok: false, reason: "token expired" };
  var email = String(claims.email || "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "no e-mail in token" };
  return { ok: true, email: email, name: String(claims.name || claims.given_name || email).slice(0, 120) };
}

/** Subject and plain-text body of the team notification. */
function pilotMail(f, when) {
  var d = f.data || {};
  var school = d.school || "(no school given)";
  var call = d.call === "yes" ? "Yes, " + (d.phone || "(no number)") + (d.call_time ? ", " + d.call_time : "") : "No";
  var lines = [
    "New pilot request from the Nau-ino landing page.",
    "",
    "Name:        " + (d.name || "-"),
    "E-mail:      " + (d.email || "-") + (d.verified === "true" ? "  (verified by Google)" : "  (not verified)"),
    "School:      " + school,
    "Role:        " + (d.role || "-"),
    "Phone call:  " + call,
    "Signed in:   " + (d.signin === "google" ? "Google" : "e-mail field"),
    "Page:        " + (f.path || "-"),
    "Site:        " + (f.version || "-"),
    "Time:        " + when.toISOString().replace("T", " ").slice(0, 16) + " UTC",
  ];
  if (d.verify_error) lines.push("Check:       " + d.verify_error);
  lines.push("", "Reply to this e-mail to answer the requester (only when the e-mail was verified).");
  return { subject: (f.test ? "[TEST] " : "") + "Nau-ino: new pilot request — " + school, body: lines.join("\n") };
}

/** Short confirmation for the requester (only sent when SEND_CONFIRMATION is "true" and the e-mail is verified). */
function confirmationMail(f) {
  var d = f.data || {};
  var hi = d.name ? "Hello " + d.name.split(" ")[0] + "," : "Hello,";
  return {
    subject: "Your Nau-ino pilot request",
    body: [
      hi,
      "",
      "Thank you for asking for a free 30-day Nau-ino pilot" + (d.school ? " for " + d.school : "") + ".",
      d.call === "yes" ? "We will call you" + (d.call_time ? " in the " + d.call_time.toLowerCase() : "") + " and e-mail you within 2 working days." : "We will e-mail you within 2 working days.",
      "",
      "Nau-ino team",
    ].join("\n"),
  };
}

/** Script Property key that counts notification e-mails per UTC day. */
function mailDayKey(date) {
  return "pilot_mails_" + date.toISOString().slice(0, 10);
}

if (typeof module !== "undefined") {
  module.exports = { checkClaims: checkClaims, pilotMail: pilotMail, confirmationMail: confirmationMail, mailDayKey: mailDayKey, MAX_MAILS_PER_DAY: MAX_MAILS_PER_DAY };
}
