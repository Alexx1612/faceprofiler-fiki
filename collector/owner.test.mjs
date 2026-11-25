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
