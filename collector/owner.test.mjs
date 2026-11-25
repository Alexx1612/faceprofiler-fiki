/** Tests for Owner.gs pure parts (owner list parsing, Gmail address equivalence). Run: npm run test:collector */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const O = require("./Owner.gs");

test("owner list: trims, lower-cases, drops junk, treats Gmail dots as the same mailbox", () => {
  assert.deepEqual(O.ownerList(" A.B.C@Gmail.com, x@school.ro ,nonsense"), ["abc@gmail.com", "x@school.ro"]);
  assert.equal(O.sameMailbox("first.last+news@gmail.com"), O.sameMailbox("firstlast@googlemail.com"));
  assert.notEqual(O.sameMailbox("a.b@school.ro"), O.sameMailbox("ab@school.ro")); // only Gmail ignores dots
});

test("export key: matches only the exact key, and only a key of 32+ characters", () => {
  const key = "k".repeat(16) + "0123456789abcdefABCDEF";
  assert.equal(O.keyMatches(key, key), true);
  assert.equal(O.keyMatches(key.slice(0, -1) + "X", key), false); // last character differs
  assert.equal(O.keyMatches(key + "x", key), false); // longer
  assert.equal(O.keyMatches(key.slice(0, 10), key), false); // prefix
  assert.equal(O.keyMatches("", key), false);
  assert.equal(O.keyMatches(undefined, key), false);
  assert.equal(O.keyMatches("short-key", "short-key"), false); // property too short: never accepted
  assert.equal(O.keyMatches("anything", ""), false); // property unset
});

test("export paging: clamps offset and limit and says where the next page starts", () => {
  assert.deepEqual(O.exportPage(12, 0, 5), { offset: 0, count: 5, next: 5 });
  assert.deepEqual(O.exportPage(12, 10, 5), { offset: 10, count: 2, next: null });
  assert.deepEqual(O.exportPage(12, 50, 5), { offset: 12, count: 0, next: null });
  assert.deepEqual(O.exportPage(3, -4, "x"), { offset: 0, count: 3, next: null }); // default limit 2000
  assert.equal(O.exportPage(20000, 0, 999999).count, 5000); // hard cap
  assert.deepEqual(O.exportPage(0, 0, 10), { offset: 0, count: 0, next: null });
});
