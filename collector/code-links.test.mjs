/**
 * The /analytics/ "How these numbers are made" links must point at the right code. Run: npm run test:collector
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { computeLinks } from "../scripts/code-links.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("lib/code-links.json is up to date (npm run build regenerates it)", () => {
  assert.deepEqual(JSON.parse(read("lib/code-links.json")), computeLinks());
});

test("each linked range contains the function it names", () => {
  for (const s of computeLinks().steps) {
    const lines = read(s.file).split(/\r?\n/).slice(s.from - 1, s.to);
    assert.ok(lines.length > 3, s.id);
    assert.ok(lines.some((l) => new RegExp(`function ${s.fn}\\b`).test(l)), `${s.id}: ${s.fn} not in ${s.file}#L${s.from}-L${s.to}`);
    assert.ok(!lines.some((l) => l.includes("@provenance")), `${s.id}: range includes a marker`);
  }
});

test("the site expects the collector version that collector/Code.gs reports", async () => {
  const { readFileSync } = await import("node:fs");
  const gs = readFileSync(new URL("./Code.gs", import.meta.url), "utf8").match(/var COLLECTOR_VERSION = "([^"]+)"/)[1];
  const site = readFileSync(new URL("../lib/collect.ts", import.meta.url), "utf8").match(/EXPECTED_COLLECTOR = "([^"]+)"/)[1];
  assert.equal(site, gs);
});
