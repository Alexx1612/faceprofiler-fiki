/**
 * Site versions, newest first. Every analytics event carries the version it was collected on, so the
 * /analytics/ page can show one version or all versions merged.
 *
 * Methodology: versions before v1.12 were reconstructed from `git log` (one version per day with
 * commits). From now on: add an entry at the top before every `npm run deploy`; the deploy script reads
 * the first `version:` in this file and builds with it (NEXT_PUBLIC_SITE_VERSION).
 */

export type SiteVersion = { version: string; date: string; changes: string[] };

export const versions: SiteVersion[] = [
  {
    version: "v1.12",
    date: "2026-11-25",
    changes: ["Own analytics and form collector (Google Sheet) with the /analytics/ page", "Spot-the-stranger game with a moving crowd: 2, 5 and 20 people"],
  },
  {
    version: "v1.11",
    date: "2026-11-24",
    changes: ["Landing: quick survey (EN/RO) and Spot-the-stranger game", "M5 page, lead forms, PostHog, user manuals (PDF)"],
  },
  { version: "v1.10", date: "2026-11-21", changes: ["M3: 3D-face button label"] },
  { version: "v1.9", date: "2026-11-20", changes: ["SEO pass: canonicals, share tags, sitemap, robots, llms.txt", "Footer page links removed"] },
  { version: "v1.8", date: "2026-11-18", changes: ["M4 UX page, navy theme, 1440 px width", "M3 app demos with playable scenarios", "Free-licence demo clip"] },
  { version: "v1.7", date: "2026-11-17", changes: ["M3 hover cards and night tour", "Landing live night, tour and demo reel", "3D face page"] },
  { version: "v1.6", date: "2026-11-15", changes: ["Hero ASCII eyes"] },
  { version: "v1.5", date: "2026-11-13", changes: ["Pitch page"] },
  { version: "v1.4", date: "2026-11-12", changes: ["M3: wireframe, screen map, school landing page", "Design and chart pass"] },
  { version: "v1.3", date: "2026-11-02", changes: ["Milestones menu, M2 page, team photos, intro video"] },
  { version: "v1.2", date: "2026-10-21", changes: ["Buyer-ready page v3, pitch, distance proof"] },
  { version: "v1.0", date: "2026-10-19", changes: ["First fiki site (Nau-ino overview)"] },
];

/** Version this build reports: set by the deploy script, otherwise the newest entry above. */
export const siteVersion = process.env.NEXT_PUBLIC_SITE_VERSION || versions[0].version;
