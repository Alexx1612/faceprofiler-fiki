/**
 * Builds the site for GitHub Pages and pushes out/ to the gh-pages branch of origin.
 * Pages must be set to "Deploy from a branch: gh-pages / (root)".
 * The build is stamped with the site version (first `version:` in lib/versions.ts) and the short git
 * commit, so analytics can be shown per version and merged. Add a lib/versions.ts entry before deploying.
 * Usage: npm run deploy
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const origin = execSync("git remote get-url origin").toString().trim();
const repo = path.basename(origin).replace(/\.git$/, "");

const version = readFileSync("lib/versions.ts", "utf8").match(/version:\s*"([^"]+)"/)?.[1] ?? "unknown";
const build = execSync("git rev-parse --short HEAD").toString().trim();
const dirty = execSync("git status --porcelain").toString().trim() ? "+dirty" : "";

console.log(`[INFO] Building ${version} (${build}${dirty}) for https://<user>.github.io/${repo}/`);
run("npm run build", {
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: `/${repo}`, NEXT_PUBLIC_SITE_VERSION: version, NEXT_PUBLIC_SITE_BUILD: build + dirty },
});
writeFileSync("out/.nojekyll", ""); // keep the _next/ folder (Jekyll would hide it)

const git = (cmd) => run(`git ${cmd}`, { cwd: "out" });
git("init -q -b gh-pages");
git("add -A");
git('-c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "Deploy site"');
git(`push -f ${origin} gh-pages`);
console.log("[SUCCESS] Pushed out/ to gh-pages");
