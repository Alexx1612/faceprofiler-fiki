# Nau-ino collector (our own Formspree + PostHog)

`Code.gs` is a Google Apps Script web app that stores the site's events and form answers in a Google
Sheet, and serves aggregated numbers to the `/analytics/` page. It is free and needs only a Google account.

It stores:
- **`events` sheet:** pageviews, page leaves, clicks and the site's own events (survey, game, forms). Each row has an anonymous id, a session id, the site version, the path, the referring domain, UTM tags and the device type.
- **`forms` sheet:** the pilot, updates and survey answers.

It never stores an IP address, a user-agent string or a full referrer URL.

Every row also stores the source decided by the server (`source`, `medium`, `source_how`) next to the raw
facts it came from (`referrer_host`, `utm_*`), a server receive time, and a SHA-256 hash chain in the last
column. **How to prove the numbers are genuine** (rules, hash chain, re-checking a CSV download with
`node collector/verify.mjs events.csv forms.csv`, known limits): see [AUTHENTICITY.md](AUTHENTICITY.md).

If you deployed an older `Code.gs` (before collector 1.1), the column layout changed: rename or delete the old
`events` and `forms` tabs once, so the script creates them again with the new headers.

## Set it up (about 5 minutes)

1. Create a new Google Sheet (go to <https://sheets.new>) and name it "Nau-ino analytics".
2. In the Sheet, open **Extensions → Apps Script**.
3. Delete the sample code, paste in all of `collector/Code.gs`, then save (Ctrl+S).
4. Click **Deploy → New deployment**, pick the type **Web app**, and set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**

   Click **Deploy** and allow access when Google asks (only the first time).
5. Copy the **Web app URL** (it ends with `/exec`).
6. In the fiki repo, add `NEXT_PUBLIC_COLLECT_URL=<that URL>` to `.env.local`, then run `npm run deploy`.

To check it worked, open `<URL>?stats=1` in a browser. It should return JSON. Then open the site and
visit a page. Within a minute a row appears in the `events` sheet, and `/analytics/` shows the visit.
`/analytics/` caches the numbers for up to 5 minutes.

**Changing `Code.gs` later:** paste the new code, then go to **Deploy → Manage deployments → edit (pencil) →
Version: New version → Deploy**. This keeps the same URL, so the site does not need a rebuild.

## Leave your own visits out (test mode)

Open <https://alexx1612.github.io/faceprofiler-fiki/?test=1> once in each browser you use: Chrome and
Edge on your PC, and the browser on your phone. That browser's visits are then marked as test, and a small
**TEST MODE** pill shows bottom-left. Tap it, or open `?test=0`, to turn test mode off.

Localhost and automated browsers (Playwright) count as test automatically. Test rows are still saved in the
Sheet (column `test`), but they are left out of every number. `/analytics/` only says how many were ignored.
PostHog gets `is_test: true`; to hide those visits there, use Settings → "Filter out internal and test users".

## Definitions (same as PostHog web analytics)

| Number | Meaning |
|---|---|
| Visitors | distinct anonymous ids. Before cookie consent the id lasts for one tab only, so a returning visitor who declined counts again. |
| Session | events of one visitor with gaps under 30 minutes, at most 24 h |
| Bounce rate | share of sessions that were not engaged. Engaged means more than one pageview, any click or site event, or over 10 s. |
| Source | `utm_source` if the link had one, otherwise the referring site mapped to a name (l.facebook.com → facebook, t.co → x / twitter, …), otherwise "direct / unknown" |
| Conversion | a session in which the pilot, updates or survey form was sent |
| Funnel | visitors who did, in order and within 14 days: landing page → Book a pilot or survey opened → form or survey sent |
| Clicks | grouped by a stable label (`data-track`, else `aria-label`, else visible text), so totals add up across site versions |

Free-text answers (comments), e-mails and phone numbers stay in the Sheet. They are never returned by `?stats=1`.

## Tests

`npm run test:collector` runs the aggregation, source rules, hash chain, `verify.mjs` (on the fixture CSVs in `fixtures/`, made by `node collector/fixtures/make.mjs`) and checks that the /analytics/ code links (`lib/code-links.json`, rebuilt before every build) still point at the right functions.

## Collector 1.3: who visits

Collector 1.3 adds, per event: `schema` ("2"), `os`, `browser`, `in_app`, `screen`, `lang`, `tz`, `country`,
`country_name`, `region`, `geo_how`. These columns come **after** `chain`, so rows written before 1.3 keep
their cells and their hashes: a row with an empty `schema` is an old row and is hashed as before; new rows
hash every cell except `chain`. The header row of the `events` tab is extended automatically on the first
new event. `verify.mjs` reads both old and new downloads.

`?stats=1` also returns `test` (the same aggregate for test traffic only) and `test_visitors`, so
/analytics/ can show real and test numbers apart, plus `who` (devices, OS, browsers, in-app browsers,
screens, languages, countries with regions, counted once per visitor) and `hours` (sessions by weekday ×
hour, Romanian time).

## When to update the Apps Script

Only when `collector/Code.gs` changes (its `COLLECTOR_VERSION` goes up). `/analytics/` shows a yellow
"Update it" note when the Apps Script reports an older version than the site expects (`EXPECTED_COLLECTOR`
in `lib/collect.ts`, kept equal by a test). Site changes (pages, survey questions, the game) never need it.

To update: open the Sheet → Extensions → Apps Script → replace all the code with the new `Code.gs` → Save →
Deploy → Manage deployments → the pencil → Version: New version → Deploy. The /exec URL stays the same,
so nothing changes on the site.

**Test-tagged links.** A visit that arrives with `utm_source=selftest`, `probe` or `test` counts as test
traffic (all of that visitor's events and forms), the same as `?test=1`. Use e.g.
`…/landing/?utm_source=selftest` to try a link from a phone you haven't marked.

## Pilot requests with Google sign-in

The landing page's **Book a free 30-day pilot** section signs people in with Google, then sends school,
role, an optional phone-call request and consent. `collector/Pilot.gs` checks the Google sign-in with
Google itself, keeps the token out of the sheet, stores the request in the `forms` sheet (`verified` =
true/false) and e-mails you. Without a client ID (or if Google is blocked) the form asks for the e-mail
instead, and the request is stored with `verified = false`.

**1. Create the Google sign-in client (once, ~10 min)**
1. Open https://console.cloud.google.com → project menu (top left) → **New project** → name `Nau-ino` → Create, then select it.
2. **APIs & Services → OAuth consent screen** → **Get started** (or "Configure consent screen"):
   app name `Nau-ino`, user support e-mail = yours, audience **External**, contact e-mail = yours → Create.
   Under **Branding → Authorised domains** add `github.io` → Save.
3. **Audience** (or "Publishing status") → **Publish app** → Confirm. While it says "Testing", only the test
   users you list can sign in. The site asks only for name and e-mail (openid, email, profile), which needs
   no Google review.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Web
   application**, name `Nau-ino site` → **Authorised JavaScript origins**: `https://alexx1612.github.io`
   and `http://localhost:3000` → Create → copy the **Client ID** (ends in `.apps.googleusercontent.com`).
   No redirect URI and no client secret are needed.

**2. Give the Client ID to the site** — send it to whoever deploys: it goes in fiki `.env.local` as
`NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>`, then `npm run deploy`. It is a public ID, not a secret.

**3. Set the Script Properties** — open the Sheet → Extensions → Apps Script → ⚙ **Project Settings** →
**Script Properties** → Add:
- `GOOGLE_CLIENT_ID` = the same Client ID
- `NOTIFY_EMAIL` = the address that should receive new pilot requests
- `SEND_CONFIRMATION` = `true` (optional: also sends a short "we got your request" e-mail to a
  Google-verified requester)

**4. Add Pilot.gs and redeploy** — in the Apps Script editor: **+ → Script** → name it `Pilot` → replace
its contents with `collector/Pilot.gs` → Save. Also paste the current `collector/Code.gs` into `Code.gs`
(it has the one line that calls Pilot.gs) → Save. **Deploy → Manage deployments → ✏ → Version: New
version → Deploy**. Google asks for two new permissions — "Send email as you" and "Connect to an external
service" (Google's token check) → Allow. The `/exec` URL does not change.

**5. Try it** — on the live landing page with `?test=1`: sign in, fill the form, Book my pilot. You get an
e-mail titled `[TEST] Nau-ino: new pilot request — <school>`; the `forms` sheet gets a row with
`"verified":"true"`. If `verified` is false, the row says why in `verify_error` (e.g. `wrong audience` =
the Script Property and the site use different client IDs).

Limits: at most 20 notification e-mails a day (`MAX_MAILS_PER_DAY` in Pilot.gs; a consumer Google account
may send ~100 a day in total). Tokens are never written to the sheet; requests are rate-limited like all
forms, and the honeypot field drops bots.
