# Nau-ino collector (our own Formspree + PostHog)

`Code.gs` is a Google Apps Script web app that stores the site's events and form answers in a Google
Sheet, and serves aggregated numbers to the `/analytics/` page. It is free and needs only a Google account.

It stores:
- **`events` sheet:** pageviews, page leaves, clicks and the site's own events (survey, game, forms). Each row has an anonymous id, a session id, the site version, the path, the referring domain, UTM tags and the device type.
- **`forms` sheet:** the pilot, updates and survey answers.

It never stores an IP address, a user-agent string or a full referrer URL.

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

`npm run test:collector` runs the aggregation in Node on fixture events.
