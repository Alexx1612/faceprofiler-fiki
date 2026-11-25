/**
 * Guard: the names of the two real people in the main repo's examples/ must never appear in the site's
 * source (they once slipped into the game's cast). Only short hashes are stored here, like the main repo's
 * tests/test_make_manuals.py. Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// First 16 hex digits of sha256 of the lower-case first names (same values as the main repo's guard).
const REAL_NAME_HASHES = new Set(["0a92efb1b91ac02c", "15acfdc75fdb8885"]);
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIRS = ["app", "components", "lib", "collector", "scripts", "public"];
const EXT = /\.(tsx?|mjs|js|gs|json|md|txt|css|html)$/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (EXT.test(name)) yield p;
  }
}

test("no real example people's names in the site source", () => {
  const hits = [];
  for (const d of DIRS) {
    for (const f of files(join(ROOT, d))) {
      const words = new Set(readFileSync(f, "utf8").toLowerCase().match(/[a-zăâîșțé]+/g) ?? []);
      for (const w of words) {
        if (REAL_NAME_HASHES.has(createHash("sha256").update(w).digest("hex").slice(0, 16))) hits.push(f);
      }
    }
  }
  assert.deepEqual(hits, []);
});
