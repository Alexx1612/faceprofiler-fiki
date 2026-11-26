/**
 * Tests for collector/Pilot.gs (Google ID token checks and the notification e-mails). Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const P = require("./Pilot.gs");

const CLIENT = "123-abc.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 10, 26, 10, 0, 0);
const good = { aud: CLIENT, iss: "https://accounts.google.com", email: "Teacher@School.ro", email_verified: "true", name: "Ana Pop", exp: String(NOW / 1000 + 600) };

test("a valid Google token gives the verified e-mail (lower case) and name", () => {
  assert.deepEqual(P.checkClaims(good, CLIENT, NOW), { ok: true, email: "teacher@school.ro", name: "Ana Pop" });
  assert.equal(P.checkClaims({ ...good, iss: "accounts.google.com", email_verified: true }, CLIENT, NOW).ok, true);
});

test("tokens for another app, another issuer, unverified, expired or empty are refused", () => {
  assert.equal(P.checkClaims(good, "", NOW).reason, "GOOGLE_CLIENT_ID not set");
  assert.equal(P.checkClaims({}, CLIENT, NOW).reason, "token rejected by Google");
  assert.equal(P.checkClaims({ ...good, aud: "other.apps.googleusercontent.com" }, CLIENT, NOW).reason, "wrong audience");
  assert.equal(P.checkClaims({ ...good, iss: "evil.example" }, CLIENT, NOW).reason, "wrong issuer");
  assert.equal(P.checkClaims({ ...good, email_verified: "false" }, CLIENT, NOW).reason, "e-mail not verified");
  assert.equal(P.checkClaims({ ...good, exp: String(NOW / 1000 - 1) }, CLIENT, NOW).reason, "token expired");
  assert.equal(P.checkClaims({ ...good, email: "not-an-email" }, CLIENT, NOW).reason, "no e-mail in token");
});

test("team e-mail: subject names the school (else the contact), body has the sign-up, [TEST] for test traffic", () => {
  const f = {
    path: "/faceprofiler-fiki/landing/",
    version: "v1.19",
    data: { name: "Ana Pop", email: "teacher@school.ro", verified: "true", school: "School no. 7", role: "Principal or director", call: "yes", phone: "0712 345 678", call_time: "Morning", signin: "google" },
  };
  const m = P.pilotMail(f, new Date(NOW));
  assert.equal(m.subject, "Nau-ino: new newsletter sign-up — School no. 7");
  assert.match(m.body, /teacher@school\.ro {2}\(verified by Google\)/);
  assert.match(m.body, /Phone call: {2}Yes, 0712 345 678, Morning/);
  assert.match(m.body, /2026-11-26 10:00 UTC/);
  assert.equal(P.pilotMail({ ...f, test: true }, new Date(NOW)).subject.startsWith("[TEST] "), true);
  const plain = P.pilotMail({ data: { email: "x@y.ro", verified: "false", call: "no", verify_error: "wrong audience" } }, new Date(NOW));
  assert.match(plain.subject, /sign-up — x@y\.ro$/);
  assert.match(plain.body, /School: {6}\(no school given\)/);
  const phoneOnly = P.pilotMail({ data: { phone: "0722 123 456", call: "yes", call_time: "Morning", signin: "phone", verified: "false" } }, new Date(NOW));
  assert.match(phoneOnly.subject, /sign-up — 0722 123 456$/);
  assert.match(phoneOnly.body, /Signed up: {3}phone number only/);
  assert.match(plain.body, /\(not verified\)/);
  assert.match(plain.body, /Check: {7}wrong audience/);
  assert.doesNotMatch(plain.body + m.body, /id_token|eyJ/);
});

test("confirmation e-mail and the daily counter key", () => {
  const c = P.confirmationMail({ data: { name: "Ana Pop", school: "School no. 7", call: "yes", call_time: "Afternoon" } });
  assert.match(c.body, /^Hello Ana,/);
  assert.match(c.body, /call you in the afternoon/);
  assert.match(c.body, /subscribing to the Nau-ino newsletter for School no\. 7/);
  assert.equal(c.subject, "You're subscribed to Nau-ino");
  assert.equal(P.mailDayKey(new Date(NOW)), "pilot_mails_2026-11-26");
  assert.equal(P.MAX_MAILS_PER_DAY, 20);
});
