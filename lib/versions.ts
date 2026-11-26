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
  { version: "v1.41", date: "2026-11-26", changes: ["Wide screens: the project pages scale up (text and width), 112.5% from 1700 px and 125% from 2100 px"] },
  { version: "v1.40", date: "2026-11-26", changes: ["Landing: the newsletter form (Google, or e-mail and/or phone; school and role optional) is the sign-up again after a parallel v1.38 had put back the older \"Get notified\" card"] },
  { version: "v1.39", date: "2026-11-26", changes: ["Newsletter form accepts phone numbers with dashes, dots or brackets; collector e-mails (Pilot.gs) use the newsletter wording"] },
  { version: "v1.38 (Petrec)", date: "2026-11-26", changes: ["Landing: the \"Get notified\" card (e-mail, optional role) is the only sign-up again; hero, nav and home buttons say \"Get notified\"; no pilot form or 30-day pilot link"] },
  { version: "v1.38", date: "2026-11-26", changes: ["Newsletter form as one panel: \"How we reach you\" and \"About you · optional\" groups, consent box, wide centred Subscribe button"] },
  { version: "v1.37", date: "2026-11-26", changes: ["Newsletter form: school and role are optional; only an e-mail or a phone number (or Google) and consent are needed"] },
  { version: "v1.36", date: "2026-11-26", changes: ["Newsletter wording everywhere: M3 landing description, M5 event notes, analytics funnel step \"Subscribe or survey opened\""] },
  { version: "v1.35", date: "2026-11-26", changes: ["The sign-up is now \"Subscribe to newsletter (to be invited for a pilot)\" on the home and landing pages", "Game intro explains the three steps in plain words", "Team accounts can record a showcase of the site (red record button next to the e-mail; REC pill with Stop); recordings include the game and the videos and appear under Showcase in Analytics → Replays"] },
  { version: "v1.34", date: "2026-11-26", changes: ["Landing: one \"Book a pilot\" form replaces the separate \"Get notified\" card: continue with Google, or leave an e-mail and/or a phone number"] },
  { version: "v1.33", date: "2026-11-26", changes: ["New prices in USD: $5-8 per camera per month, and a Whole school plan at $40 a month for schools with more than 10 cameras; business model, pitch, cost and lifetime figures updated"] },
  { version: "v1.32", date: "2026-11-26", changes: ["M2: Mom Test check for the second series", "M5: link to the Reddit account used for the campaign"] },
  { version: "v1.31", date: "2026-11-26", changes: ["M2: second series of interviews (school night guard G1, production-hall owner H1), matching M4"] },
  { version: "v1.30", date: "2026-11-26", changes: ["\"Continue with Google\" button no longer cut off on the pilot form (phone and desktop)"] },
  {
    version: "v1.29",
    date: "2026-11-26",
    changes: [
      "Landing: \"Book a pilot\" with Google sign-in is back above the \"Get notified\" card; hero and nav say \"Book a pilot\", hero also has \"Get notified\"",
      "Top bars show who is signed in (Google account, sign out) or \"Guest\"; one sign-in per tab is shared by the pilot form and analytics",
    ],
  },
  {
    version: "v1.28",
    date: "2026-11-26",
    changes: ["M5: the campaign as it ran (WhatsApp, Discord, Reddit) with permalinks and screenshots, results from PostHog and our collector, channel comparison and verdict"],
  },
  {
    version: "v1.27",
    date: "2026-11-26",
    changes: ["Landing: the \"Get notified\" sign-up (e-mail, optional role) is the only form again; hero, nav and home buttons say \"Get notified\"; the pilot form and the 30-day pilot link are removed"],
  },
  {
    version: "v1.26",
    date: "2026-11-26",
    changes: ["Home button and pilot section now say \"Book a pilot\"; the home button goes straight to the pilot form"],
  },
  {
    version: "v1.25",
    date: "2026-11-26",
    changes: ["M4: Wireframe v2 redesigned as product-style mockups (guard phone alert with countdown, morning report, privacy settings, schedule, escalation ladder)"],
  },
  {
    version: "v1.24",
    date: "2026-11-26",
    changes: ["M4: interview notes (G1 night guard, H1 hall owner; P1 and T1-T3 from M2 and the survey), conclusions, A1-A7 results with evidence, personas based on the notes"],
  },
  {
    version: "v1.23",
    date: "2026-11-26",
    changes: ["M4: Online survey tab (n=14, real answers to the landing quick survey, kept apart from the interviews)"],
  },
  {
    version: "v1.22",
    date: "2026-11-26",
    changes: [
      "The team's own Google accounts switch their browser to test mode on sign-in (only an e-mail hash ships)",
      "Analytics owner tabs wrap instead of running off the edge; clearer TEST MODE label",
      "Deploys keep the previous version's chunks, so pages cached before a deploy no longer crash",
    ],
  },
  {
    version: "v1.21",
    date: "2026-11-26",
    changes: [
      "Analytics: public M5 summary for guests; full view for the owner after Google sign-in (collector 1.4)",
      "Owner: form inbox (filters, statuses, notes, CSV, daily digest), heatmaps, rage and dead clicks, scroll depth, retention, paths",
      "Owner: session replays (after Accept, inputs hidden, 30 days) and Live now",
    ],
  },
  {
    version: "v1.20",
    date: "2026-11-26",
    changes: ["Home: glowing button to the school landing page", "Privacy page (what the site collects, why, how long, your rights), linked from footers and the pilot form"],
  },
  {
    version: "v1.19",
    date: "2026-11-26",
    changes: [
      "Book a free 30-day pilot again: Google sign-in, optional phone call, e-mail notification to the team; \"Just want updates?\" below",
      "Analytics: who visits (device, OS, browser, in-app, country and region after consent), real vs test numbers, clearer charts",
      "Lead rate per visitor and only for newsletter / pilot; the survey is counted apart (collector 1.3)",
    ],
  },
  {
    version: "v1.18",
    date: "2026-11-26",
    changes: [
      "Analytics: funnel counts the landing page under the GitHub Pages path (was always 0)",
      "Analytics: visits through test-tagged links (utm_source selftest / probe / test) count as test traffic",
    ],
  },
  {
    version: "v1.17",
    date: "2026-11-25",
    changes: [
      "Landing on phones and tablets: no more jumping while scrolling; the live night card and the How it works stage keep a fixed height (desktop with a mouse unchanged)",
      "Cards without backdrop blur (smoother in Safari on iPhone); the game draws at 1.5x on touch screens",
    ],
  },
  {
    version: "v1.16",
    date: "2026-11-25",
    changes: [
      "Landing: one “Get notified” sign-up (e-mail, optional role) replaces the updates and pilot forms; hero and nav buttons say “Get notified”",
      "Pilot requests by an e-mail link under the sign-up",
      "PostHog counts visitors who have not answered the cookie bar, without cookies",
    ],
  },
  {
    version: "v1.15",
    date: "2026-11-25",
    changes: [
      "PostHog connected (EU cloud): web analytics, funnel and session replay for M5",
      "Pilot form asks for consent before sending",
    ],
  },
  {
    version: "v1.14",
    date: "2026-11-26",
    changes: [
      "Game in 5 rounds: 3+1 and 14+1 (find the unknown person), then three harmful-action scenarios",
      "System time modelled from Nau-ino measurements; cue timeline vs your pick",
      "Live collector connected (Google Sheet)",
    ],
  },
  {
    version: "v1.13",
    date: "2026-11-25",
    changes: [
      "Survey: questions rewritten to pass The Mom Test, \"Other\" answers, teachers-only labels, game progress and restart",
      "Analytics: source decided on the server, hash chain, verify script, code links, game players and scores",
    ],
  },
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
