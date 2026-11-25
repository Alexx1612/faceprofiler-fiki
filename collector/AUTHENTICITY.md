# Are the analytics numbers real? How to check

This page explains where every number on `/analytics/` comes from, how the source of a visit is decided, and how anyone can check that the stored data was not edited.

## Data flow

```
visitor's browser                    Google Apps Script (Code.gs)                 Google Sheet (owner's account)
lib/collect.ts                       doPost → cleanEvents → classifySource         "events" and "forms" tabs
  raw facts only:          ─POST─▶     → eventRow (+ server id, server time)  ─▶   one row per event, all text,
  referrer host, utm_*,                → chainRows (SHA-256 hash chain)            last column = chain hash
  landing page, event                                                                     │
                                     doGet?stats=1 → aggregate()  ◀───────────────────────┘
/analytics/ page  ◀── totals only ── (+ rows, chain head, chain intact?)
                                     collector/verify.mjs runs the same aggregate() on a CSV download
```

## What is stored, and what is not

| Stored | Not stored |
|---|---|
| Random anonymous id and session id | Name, account or login |
| Page path, landing page, event name, click label | IP address (Apps Script never sees it) |
| Referrer **host** only (`l.facebook.com`) | Full referrer URL, its path or query |
| utm_source / medium / campaign / content from our own links | User-agent string, fingerprint |
| Device bucket (phone / tablet / desktop), OS family, browser family, in-app browser (Facebook, Instagram, WhatsApp…), screen-width bucket, language, time zone | What people type into fields (except form answers they send) |
| Approximate location: country (from the time zone, or after Accept from one IP lookup) and region / county (only after Accept) | IP address, city, coordinates (the browser drops them from the lookup reply before sending) |
| Site version and git commit of the page | |
| Form answers (survey, pilot, updates) in the `forms` tab | Free-text answers in the public stats (only counted) |

Visitors with Do-Not-Track or Global Privacy Control switched on are not recorded at all. The owner's own visits (test mode, automated checks, links tagged `utm_source=selftest` / `probe` / `test`) are stored but kept out of every real number; /analytics/ shows them on their own under **Test**.

**Approximate location, in detail.** Without consent the country is guessed from the browser's time zone
(`Europe/Bucharest` → Romania), with no network call. Only after the visitor clicks **Accept** on the consent
bar, the browser asks a free geo-IP service once per session (`ipwho.is`, then `ipapi.co`, 3 s timeout) and
keeps three fields of the reply: country code, country name and region. The IP address, city and
coordinates in that reply are discarded in the browser and never reach the collector. Each country row on
/analytics/ says how it was found ("IP lookup" or "time zone"). Region is the first level below country
(county / județ in Romania, state elsewhere) as the service reports it.

## How the source of a visit is decided

The browser only reports raw facts. The server decides the source with one function, `classifySource()` in `Code.gs`. A session's source is the source of its first event (first touch).

| Rule (in order) | Example input | Source | Medium | "How we know" |
|---|---|---|---|---|
| 1. The landing URL has `utm_source` (a link we shared) | `?utm_source=facebook&utm_medium=social` | facebook | social | UTM link |
| 2. Otherwise the browser sent a referrer host, mapped by `SOURCE_RULES` | `l.facebook.com`, `m.facebook.com` | facebook | social | referrer |
| | `www.google.ro` | google | search | referrer |
| | `android-app://com.linkedin.android` | linkedin | social | referrer |
| | `android-app://com.google.android.gm` | gmail | email | referrer |
| | `some-blog.ro` (not in the rules) | some-blog.ro | referral | referrer |
| 3. Otherwise | nothing sent | direct / unknown | direct | not sent |

Each stored row keeps both the raw facts (`referrer_host`, `utm_*`) and the result (`source`, `medium`, `source_how`). `verify.mjs` re-runs the rules on every row and reports any row where they differ.

## How to show the numbers were not edited

1. **Hash chain.** Each row's last cell is `SHA-256(previous row's hash + "\n" + this row's other cells)`. The chain starts from `nau-ino:genesis`. Changing a cell, deleting a row, inserting a row or reordering rows breaks the chain from that row on. `/analytics/` shows the number of rows, whether the chain is intact, and the first 12 characters of the latest hash ("head").
2. **Re-compute it yourself.**
   - In the Sheet, open the `events` tab, then File → Download → Comma-separated values (.csv). Do the same for `forms`.
   - Run `node collector/verify.mjs events.csv forms.csv`.
   - It re-checks the chain row by row, re-classifies every source, and prints the same KPIs and "where visitors come from" table as `/analytics/`, using the same code (`Code.gs` loaded as a module).
3. **Google's own history.** In the Sheet, open File → Version history → See version history. Google keeps this record, and the owner cannot edit or fake it. It shows that rows were added by the script over time and not typed in by hand.
4. **Write down the head.** A hash chain alone cannot stop someone with full access from rebuilding the whole chain after an edit. Note the chain head and row count on a date, or take a screenshot of `/analytics/`. A later check must then contain the same head at that row, and Google's version history covers the gap between checks.

## How to cross-check with numbers from outside

- **Facebook / LinkedIn / Reddit post insights** give link clicks per post. Compare them with our sessions where `source` = that channel and `utm_content` = that post. Ours are usually a little lower: some people close the page before it loads, and some block scripts.
- **GitHub history.** The page links each step to the exact lines on GitHub at the deployed commit. That is the code that produced the numbers at that time.
- **Google Forms** (survey only): its own response count can be compared with the `survey` count in the `forms` tab.

## Known limits

- **Hidden referrers:** in-app browsers (WhatsApp, Instagram, sometimes the Facebook app) often send no referrer. Those visits show as "direct / unknown" unless the link had UTM tags, which is why every campaign link has them.
- **Lost visits:** ad blockers, Do-Not-Track and Global Privacy Control mean some real visits are never recorded. The numbers are a lower bound.
- **Returning visitors:** before cookie consent, the anonymous id lasts for one tab only, so a returning visitor who declined counts again.
- **Test traffic:** test visits (owner's browsers with `?test=1`, localhost, automated browsers) are excluded. `/analytics/` shows how many were ignored.
- **Large sheets:** above 50,000 rows, the stats endpoint stops re-checking the chain on every request to stay within the Apps Script time limit. `verify.mjs` still checks all rows.
