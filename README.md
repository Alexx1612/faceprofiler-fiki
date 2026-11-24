# Nau-ino — project fiki

One-page project overview for possible buyers, structured like the startup fundamentals: problem,
solution and market; then seven tabs (customers, interviews, channels, competition and USP, operations
and partners, business model, financials); then technology tabs (components, neuromorphic edge with
SNN / liquid-network results, mall analytics, forecasts, system lifetime); key metrics; team.
Built with Next.js, Tailwind and components from [Cult UI](https://www.cult-ui.com) and
[Watermelon UI](https://ui.watermelon.sh). Exported as a static site (`out/`).

## Edit the content

Everything shown on the page lives in `lib/content.ts`: text, numbers, team, prices, costs,
interview results, chart data. Charts are hand-made SVG in `components/site/charts.tsx`.

Data honesty: the mall report, forecast and 7-year cost charts use **illustrative** data and are
labelled so on the page; the neuromorphic numbers come from the `neuromorphic-gestures` lessons
(energy = 45 nm per-operation estimates, not measured on a chip); interview results are the team's own.

- **Team photos:** put portrait photos (4:5) in `public/team/` (for example `public/team/ana.jpg`)
  and point `photo:` at them in `lib/content.ts`. The current `member-*.svg` files are placeholders.
- **Emails, names, roles:** the `team` list in `lib/content.ts`.
- **Demo clips:** `public/clips/*.mp4` with a `.jpg` poster each.

## Run locally

```
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
```

On this machine, the user-level npm config has an `allow-scripts` entry that blocks installs in
projects. If `npm install` fails with `EALLOWSCRIPTS`, run it with a clean user config:
`$env:npm_config_userconfig="$env:TEMP\empty-npmrc"` (PowerShell) after creating that file with a
single `cafile=C:/Users/alexandru.mirea/.m2/corp-ca-bundle.pem` line.

## Lead forms and analytics (Milestone 5)

The landing page forms and PostHog read public keys at build time from `.env.local` (git-ignored):

```
NEXT_PUBLIC_FORMSPREE_ID=<id from formspree.io/f/<id>>
NEXT_PUBLIC_FORMSPREE_SURVEY_ID=<optional: a second Formspree form only for the landing quick survey; falls back to FORMSPREE_ID>
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

Without them the forms fall back to `mailto:` and no analytics loads. In PostHog, switch on cookieless
mode in the project settings (visitors who decline cookies are counted that way). The campaign log and
channel numbers shown on `/M5/` are in `lib/m5.ts`; screenshots go in `public/campaign/`.

## User manuals

`public/manuals/` (PDFs, covers, `manifest.json`) is generated in the Nau-ino repo by
`tools/make_manuals.py --out ../faceprofiler-fiki/public/manuals`; edit the sources there, not the PDFs.

## Publish on GitHub Pages (free)

Live at https://alexx1612.github.io/faceprofiler-fiki/

```
npm run deploy
```

builds the site with the `/<repo-name>` base path and force-pushes `out/` to the `gh-pages` branch.
Pages is set to **Deploy from a branch: gh-pages / (root)**; the page updates a minute after each deploy.
Commit and push your source changes to `main` as usual; `main` is not what Pages serves.

Vercel or Netlify also work (no base path needed there): import the repository and keep the defaults.
