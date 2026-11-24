/**
 * Writes lib/code-links.json: the exact file and line range of each step that produces the analytics
 * numbers, so /analytics/ can link to the code on GitHub. Runs before every build (npm "prebuild").
 *
 * Methodology: each step is delimited in the source by "@provenance:<step>:start" / ":end" comment markers;
 * the range is the lines between them. The file is committed and is only rewritten when the code moves,
 * and collector/code-links.test.mjs fails if it is stale or a range no longer contains the named function.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const STEPS = [
  { id: "capture", file: "lib/collect.ts", fn: "referrerHost" },
  { id: "classify", file: "collector/Code.gs", fn: "classifySource" },
  { id: "store", file: "collector/Code.gs", fn: "doPost" },
  { id: "aggregate", file: "collector/Code.gs", fn: "aggregate" },
];

/** Line ranges (1-based, inclusive) between the markers of each step. */
export function computeLinks() {
  return {
    repo: "https://github.com/Alexx1612/faceprofiler-fiki",
    steps: STEPS.map((s) => {
      const lines = readFileSync(join(root, s.file), "utf8").split(/\r?\n/);
      const start = lines.findIndex((l) => l.includes(`@provenance:${s.id}:start`));
      const end = lines.findIndex((l) => l.includes(`@provenance:${s.id}:end`));
      if (start < 0 || end <= start) throw new Error(`[ERROR] markers for ${s.id} missing in ${s.file}`);
      return { id: s.id, file: s.file, fn: s.fn, from: start + 2, to: end };
    }),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = JSON.stringify(computeLinks(), null, 2) + "\n";
  const path = join(root, "lib/code-links.json");
  let old = "";
  try {
    old = readFileSync(path, "utf8");
  } catch {
    /* first run */
  }
  if (old !== out) {
    writeFileSync(path, out);
    console.log("[INFO] lib/code-links.json updated");
  }
}
