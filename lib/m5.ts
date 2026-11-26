/**
 * Milestone 5 (lead generation) content: the lead tools, the analytics setup, the campaign kit,
 * the campaign log and the channel numbers.
 *
 * Methodology: the log and the numbers are filled only from what the team actually posted and measured
 * (screenshots, permalinks, PostHog and Formspree counts). Until then every entry is "planned" and every
 * number is `null`, and the page shows "waiting for data" instead of a figure.
 */
import { siteUrl } from "./seo";

export type ChannelId = "facebook" | "reddit" | "linkedin" | "instagram" | "whatsapp" | "discord" | "email";

/** Landing page link with UTM tags, so PostHog can split visits by channel (`utm_source`). */
export const utm = (source: ChannelId, medium: string, content?: string) =>
  `${siteUrl}/landing/?utm_source=${source}&utm_medium=${medium}&utm_campaign=m5_launch${content ? `&utm_content=${content}` : ""}`;

export const m5Lead = {
  why: "Before a school pays, we need people who said yes to hearing more: parents, teachers and school staff who leave an e-mail. They become pilot candidates and interviewees.",
  forms: [
    {
      name: "Get notified",
      tool: "Own collector (Google Sheet)",
      where: "Landing page, section “Hear first when Nau-ino opens”; the hero and nav buttons “Get notified” scroll to it",
      fields: "E-mail, plus an optional “I am…” (parent, teacher, school staff or director, security or IT, other)",
      goal: "Newsletter: one e-mail when the pilot opens. One required field, so signing up takes seconds; the optional role tells us which leads are schools.",
    },
    {
      name: "Quick survey",
      tool: "Own collector (Google Sheet)",
      where: "Landing page, “Quick survey · 1 min” button (EN/RO)",
      fields: "Role, then short questions about guarding and incidents in the last 3 months; no name or e-mail",
      goal: "Learn what teachers, staff and parents actually see, not just collect addresses.",
    },
  ],
  privacy: [
    "The sign-up says what we keep and why next to the button: one e-mail when the pilot opens, unsubscribe any time.",
    "Only the e-mail is asked. Nothing is sold or shared; the list is only used for Nau-ino news.",
    "A hidden honeypot field catches bots; no captcha is needed for the volume we expect.",
  ],
};

export const m5Analytics = {
  tool: "PostHog (EU cloud)",
  parts: [
    { name: "Web analytics", what: "Visitors, pages, referrers and UTM sources for every page of the site." },
    { name: "Product analytics: funnel", what: "Landing page viewed → “Get notified” clicked → sign-up sent. Shows where people drop off." },
    { name: "Session replay", what: "Recordings of real visits to see where people scroll, hesitate or rage-click. Every input is masked." },
  ],
  events: [
    ["$pageview", "Any page opened (automatic)"],
    ["cta_book_pilot_click", "“Get notified” clicked (nav or hero); the name is kept from v1.15 so older data still counts"],
    ["updates_form_submitted", "“Get notified” sign-up sent"],
    ["manual_downloaded", "A user manual PDF downloaded"],
  ] as [string, string][],
  consent: "A small bar asks for cookie consent. Until the visitor accepts, or after Decline, PostHog counts the visit without cookies (cookieless mode), so the numbers stay complete without tracking anyone who said no.",
};

export type Post = {
  channel: ChannelId;
  where: string;
  medium: string;
  en: string;
  ro: string;
  note?: string;
};

export const m5Channels: Record<ChannelId, { name: string; effort: "low" | "medium" | "high" }> = {
  facebook: { name: "Facebook groups", effort: "medium" },
  reddit: { name: "Reddit", effort: "medium" },
  linkedin: { name: "LinkedIn", effort: "low" },
  instagram: { name: "Instagram story", effort: "low" },
  whatsapp: { name: "WhatsApp", effort: "low" },
  discord: { name: "Discord", effort: "low" },
  email: { name: "E-mail to schools", effort: "high" },
};

export const m5Posts: Post[] = [
  {
    channel: "facebook",
    where: "Local parents' groups and teachers' groups of your town (ask the admin first if the rules require it)",
    medium: "social",
    en: `Parents and teachers: a quick question. 🏫
Most schools already have CCTV cameras, but nobody watches them at night, and the guard is usually on a round.
We are students building Nau-ino: software that runs on the school's own computer and flags a stranger the moment a camera sees one. Faces stay in the building; nothing goes to a cloud.
We are looking for schools for a free 30-day pilot, and for parents and teachers who want to hear when it opens.
👉 ${utm("facebook", "social", "group_post")}
Any feedback, even "this would never work at our school", helps us a lot.`,
    ro: `Părinți și profesori, o întrebare scurtă. 🏫
Majoritatea școlilor au deja camere video, dar noaptea nu se uită nimeni la ele, iar paznicul e de obicei în tură prin curte.
Suntem studenți și construim Nau-ino: un program care rulează pe calculatorul școlii și semnalează un străin în clipa în care îl vede o cameră. Fețele rămân în clădire, nimic nu pleacă în cloud.
Căutăm școli pentru un pilot gratuit de 30 de zile și părinți sau profesori care vor să afle când pornește.
👉 ${utm("facebook", "social", "group_post")}
Orice părere ne ajută, chiar și „la noi n-ar merge niciodată”.`,
    note: "Post with the campus photo or a 15-second screen recording of the demo; posts with a picture get more reach in groups.",
  },
  {
    channel: "reddit",
    where: "r/SideProject and r/ShowYourProduct. Text post without the link (posts with a github.io link are often removed); the link goes in a comment",
    medium: "social",
    en: `Title: Nau-ino - Night alerts on the CCTV cameras a school already has

We're two students building Nau-ino. Most schools already record 24/7, but at night nobody watches the footage and the guard is usually on a round.

Nau-ino runs on a computer inside the school, knows the staff who are allowed in at night, and alerts the guard's phone the moment anyone else walks in. Faces never leave the building, and pupils are never identified.

The idea came from an interview with a night guard: someone walked into the building at night, and the guard only found out afterwards, even though the cameras had recorded everything.

We'd love your feedback:
1. Would a school (or a parent) trust a system like this? What would worry you?
2. Who should get the alert first: the guard, a security company, or the principal?

Demo link in the comments. Thanks!

Comment: Demo page with a 30-second "Faster than a guard?" game: ${utm("reddit", "social")}`,
    ro: `Titlu: Am făcut un sistem care anunță paznicul când intră noaptea un străin în școală. L-ar folosi școala voastră?

Suntem doi studenți la master și construim Nau-ino. Școlile au deja camere, dar noaptea nu se uită nimeni la ele. Nau-ino rulează pe un calculator din școală, știe cine are voie înăuntru și anunță paznicul imediat ce intră altcineva. Fețele nu pleacă din clădire. Vrem păreri sincere, pun linkul cu demo-ul în comentarii.

Comentariu: ${utm("reddit", "social")}`,
    note: "Use one account and never a second one if it is filtered. Check each subreddit's rules first; r/SideProject asks for titles as “Name - short description”.",
  },
  {
    channel: "linkedin",
    where: "Each team member's own profile, plus the university's alumni or entrepreneurship group",
    medium: "social",
    en: `For our entrepreneurship course we are building Nau-ino: security and access control on the CCTV cameras a school already has, running locally at a low energy cost.
We have interviewed school staff and a night guard, built the prototype, and are now opening a free 30-day pilot for schools.
If you work in education, school safety or IT for schools, I'd value 10 minutes of your opinion.
${utm("linkedin", "social", "profile_post")}`,
    ro: `La cursul de antreprenoriat construim Nau-ino: securitate și control al accesului pe camerele video pe care o școală le are deja, rulând local, cu consum mic de energie.
Am vorbit cu personal din școli și cu un paznic de noapte, am construit prototipul și acum deschidem un pilot gratuit de 30 de zile pentru școli.
Dacă lucrați în educație, siguranța școlilor sau IT pentru școli, mi-ar prinde bine 10 minute din părerea voastră.
${utm("linkedin", "social", "profile_post")}`,
  },
  {
    channel: "instagram",
    where: "Story on each team member's account, with a link sticker",
    medium: "story",
    en: `Story text: "Who walks into your school at night? 👀 We built something for that." + link sticker "Try the demo" → ${utm("instagram", "story", "link_sticker")}`,
    ro: `Text story: „Cine intră noaptea în școala ta? 👀 Am construit ceva pentru asta.” + sticker link „Vezi demo-ul” → ${utm("instagram", "story", "link_sticker")}`,
    note: "Use a screen recording of the landing page hero; stories last 24 hours, so post on a weekday evening.",
  },
  {
    channel: "whatsapp",
    where: "Personal messages and groups of family, friends and colleagues",
    medium: "chat",
    en: `Hi! I'm working on a startup project for my master's: Nau-ino, a system that uses the cameras a school already has and alerts the guard when a stranger walks in at night. Faces never leave the building.

Could you help me with 1 minute? Open the page, try the game and leave your e-mail at “Get notified”. If you are a teacher or know a teacher or a school principal, please send them the link too 🙏

${utm("whatsapp", "chat")}`,
    ro: `Salut! Lucrez la un proiect de startup pentru master: Nau-ino, un sistem care folosește camerele pe care o școală le are deja și anunță paznicul când intră noaptea cineva străin. Fețele nu pleacă din clădire.

Mă ajuți cu 1 minut? Intră pe pagină, încearcă jocul și lasă-ți e-mailul la „Get notified”. Dacă ești profesor sau știi un profesor ori director de școală, trimite-i și lui linkul 🙏

${utm("whatsapp", "chat")}`,
  },
  {
    channel: "discord",
    where: "A private Discord server of about 20 members",
    medium: "chat",
    en: `Hi! A classmate and I are building a startup Nau-ino, a system that uses the cameras a school already has and alerts the guard when a stranger walks in at night.

It would really help us if you could spare a minute: open the page, try the "Faster than a guard?" game and, if you're interested, leave your e-mail at "Get notified". Any feedback is welcome, criticism too 🙏

If you have a parent who's a teacher, or know a teacher or school principal, please send them the link as well, since they're exactly who we're building this for!

${utm("discord", "chat")}`,
    ro: `Salut! Cu un coleg construim un startup, Nau-ino: un sistem care folosește camerele pe care o școală le are deja și anunță paznicul când intră noaptea un străin.

Ne-ar ajuta mult un minut: intrați pe pagină, încercați jocul „Faster than a guard?” și, dacă vă interesează, lăsați-vă e-mailul la „Get notified”. Orice părere e binevenită, și criticile 🙏

Dacă aveți un părinte profesor sau știți un profesor ori director de școală, trimiteți-i și lui linkul: pentru ei construim asta!

${utm("discord", "chat")}`,
  },
  {
    channel: "email",
    where: "School secretariats (public addresses from the schools' own sites)",
    medium: "email",
    en: `Subject: Free 30-day pilot: night alerts on your school's existing cameras

Dear Director,
We are a student team building Nau-ino, software that runs on a computer inside the school and flags anyone who is not on the night staff list, using the cameras you already have. Video and faces stay in the building.
We are offering a free 30-day pilot: we connect two or three cameras, you enrol the night staff, and after 30 days we show you what it flagged.
Details and a short demo: ${utm("email", "email", "school_letter")}
Would a 15-minute call next week suit you?
Kind regards,
The Nau-ino team`,
    ro: `Subiect: Pilot gratuit de 30 de zile: alerte de noapte pe camerele școlii

Stimată doamnă director / Stimate domnule director,
Suntem o echipă de studenți care construiește Nau-ino, un program care rulează pe un calculator din școală și semnalează pe oricine nu e pe lista personalului de noapte, folosind camerele pe care le aveți deja. Imaginile și fețele rămân în clădire.
Oferim un pilot gratuit de 30 de zile: conectăm două-trei camere, înrolați personalul de noapte, iar după 30 de zile vă arătăm ce a semnalat.
Detalii și un demo scurt: ${utm("email", "email", "school_letter")}
V-ar conveni o discuție de 15 minute săptămâna viitoare?
Cu stimă,
Echipa Nau-ino`,
    note: "Send from a team member's own address, one school per e-mail (no mass BCC). Follow up once after a week.",
  },
];

/** One entry per real post. Fill `date`, `permalink`, `screenshot` (file in public/campaign/) and the counts. */
export type LogEntry = {
  channel: ChannelId;
  where: string;
  status: "planned" | "posted";
  date?: string;
  permalink?: string;
  screenshot?: { src: string; width: number; height: number; alt: string };
  reactions?: number;
  comments?: number;
  /** What happened to the post (removed, still public, views). */
  note?: string;
};

export const m5Log: LogEntry[] = [
  {
    channel: "whatsapp",
    where: "Personal messages and groups",
    status: "posted",
    date: "25 Nov",
    screenshot: { src: "/campaign/whatsapp-mesaj.png", width: 553, height: 429, alt: "Our WhatsApp message with the landing page link and its preview card" },
    note: "Private chats, so there is no public permalink. 34 visitors and 12 sign-ups came through this link.",
  },
  {
    channel: "discord",
    where: "Private server, about 20 members",
    status: "posted",
    date: "26 Nov, 05:50",
    permalink: "https://discord.com/channels/1186272398404759603/1186277152962924636/1575358147755909164",
    screenshot: { src: "/campaign/discord-1.png", width: 900, height: 309, alt: "Our message with the landing page link on a private Discord server (name and picture blurred)" },
    note: "Private server: the permalink opens only for its members. 2 visitors in the first minutes, no sign-up.",
  },
  {
    channel: "reddit",
    where: "r/SideProject (new account)",
    status: "posted",
    date: "26 Nov, morning",
    permalink: "https://www.reddit.com/r/SideProject/comments/1y5rjxk/nauino_night_alerts_on_the_cctv_cameras_a_school/",
    screenshot: { src: "/campaign/reddit-sideproject-sters-de-filtru.png", width: 901, height: 945, alt: "Our r/SideProject post, removed by Reddit's filters although it had no link" },
    note: "Removed by Reddit's filters within minutes, although the post had no link: the account was new. We asked the moderators to review it.",
  },
  {
    channel: "reddit",
    where: "r/ShowYourProduct (same account)",
    status: "posted",
    date: "26 Nov, morning",
    permalink: "https://www.reddit.com/r/ShowYourProduct/comments/1y5rpup/nauino_night_alerts_on_the_cctv_cameras_a_school/",
    screenshot: { src: "/campaign/reddit-showyourproduct-public.png", width: 890, height: 1157, alt: "Our r/ShowYourProduct post, still public, with the landing page link in a comment" },
    note: "Stayed public with the link in a comment (checked from a logged-out window). 57 views, but no visit to the landing page.",
  },
  {
    channel: "reddit",
    where: "r/alphaandbetausers (crosspost)",
    status: "posted",
    date: "26 Nov, morning",
    screenshot: { src: "/campaign/reddit-alphaandbetausers-crosspost-public.png", width: 823, height: 475, alt: "Our crosspost on r/alphaandbetausers, still public" },
    note: "The crosspost stayed public (22 views), but our comment with the landing page link was removed by Reddit within minutes: the link was the trigger, as EasyFits also found.",
  },
  {
    channel: "reddit",
    where: "r/IMadeThis, r/Startup_Ideas, r/WeirdStartups, r/ProductHunters, r/EntrepreneurRideAlong, r/roastmystartup, r/Business_Ideas",
    status: "posted",
    date: "26 Nov, morning",
    screenshot: { src: "/campaign/reddit-profil-sterse-content-policy-1.png", width: 882, height: 1180, alt: "Our Reddit profile: posts removed by Reddit for the content policy" },
    note: "Four removed by Reddit itself (“content policy”: a new account posting in several places looks like spam), one by the subreddit's filter, two still awaiting moderator approval. r/indiehackers, r/edtech and r/AppIdeas did not let a new account post at all (r/AppIdeas: accounts under a month and 50 karma). We stopped there to avoid an account suspension.",
  },
];

/** Measured per channel (PostHog, 25-26 Nov, test traffic excluded): visitors = unique visitors whose first visit carried that utm_source; leads = "Get notified" sign-ups from those visitors. */
export const m5Numbers: Record<ChannelId, { visitors: number | null; leads: number | null }> = {
  facebook: { visitors: null, leads: null },
  reddit: { visitors: 0, leads: 0 },
  linkedin: { visitors: null, leads: null },
  instagram: { visitors: null, leads: null },
  whatsapp: { visitors: 34, leads: 12 },
  discord: { visitors: 2, leads: 0 },
  email: { visitors: null, leads: null },
};

/** Google Forms results, added by the team (screenshot of the Responses summary). */
export const m5GoogleForms: { link?: string; responses?: number; screenshot?: { src: string; width: number; height: number; alt: string } } = {};

/** PostHog screenshots, added by the team (web analytics, funnel, a replay). */
export const m5PosthogShots: { src: string; width: number; height: number; alt: string; caption: string }[] = [];

/** Written once the numbers are in; empty until then. */
export const m5Verdict =
  "WhatsApp, by a wide margin: 34 of the 55 visitors and all 12 attributed sign-ups (35% of its visitors signed up). Personal messages to people who know us, many of them parents and teachers, work far better than public posts at this stage. Discord brought 2 visitors and no sign-up from a small private server. Reddit brought none: we tried 13 subreddits from a new account; most posts were removed by the filters or by Reddit itself (one even without a link), the two that stayed public got about 80 views but no click, and a comment with our link was removed within minutes. Our own collector, counted independently, gives the same picture (WhatsApp 25 visitors and 12 sign-ups, Discord 2, Reddit 0). Next we would ask the people who signed up to share the link with a teacher or principal they know, since parents and teachers are the people who can bring Nau-ino into a school.";

/** Campaign results, 25-26 Nov 2026 (test traffic excluded in both sources). */
export const m5Results = {
  period: "25 Nov, 15:45 to 26 Nov, 06:30",
  posthog: [
    { value: "55", label: "visitors" },
    { value: "13", label: "“Get notified” sign-ups" },
    { value: "9", label: "surveys sent" },
    { value: "54", label: "game rounds played" },
  ],
  collector:
    "Our own collector (independent of PostHog, hash-chain verified): 46 visitors, 12 sign-ups (26%), 15 surveys. PostHog counts a few more visitors because a visitor who accepts cookies after a cookieless visit gets a new id; ad blockers hide some visits from PostHog.",
  funnel: [
    { step: "Saw the landing page", n: 30 },
    { step: "Clicked “Get notified”", n: 10 },
    { step: "Signed up", n: 13 },
  ],
  funnelNote: "More sign-ups than clicks: some visitors scrolled to the form without using the button.",
  roles: [
    ["Parent", 4],
    ["Teacher", 3],
    ["Security or IT", 2],
    ["Other or not given", 4],
  ] as [string, number][],
  devices: "21 visitors on a phone, 19 on a computer.",
};

/** Quick survey on the landing page (replaces the planned Google Form). */
export const m5Survey = {
  responses: 15,
  note: "15 answers so far through the “Quick survey · 1 min” button on the landing page (EN/RO, anonymous). The answers are summarised on the M4 page, in the Online survey tab.",
};

export const m5Method = {
  timeline: [
    ["25 Nov, afternoon", "PostHog (web analytics, funnel, session replay) and the “Get notified” sign-up live on the landing page; one tagged link per channel."],
    ["25 Nov, evening", "Personal WhatsApp messages and groups."],
    ["26 Nov, morning", "Reddit (r/SideProject, r/ShowYourProduct) and a Discord server."],
    ["26 Nov, 06:30", "Numbers taken from PostHog and our own collector; channels compared."],
  ] as [string, string][],
  tools: [
    ["Own collector", "A Google Apps Script on a Google Sheet stores sign-ups, survey answers and visits; a hash chain shows the numbers were not edited."],
    ["PostHog", "Web analytics, funnel and session replay, EU cloud, cookieless until consent."],
    ["Quick survey", "A 1-minute anonymous survey on the landing page itself, in English and Romanian."],
    ["UTM links", "One per channel, so every visit and lead can be traced back to the post."],
  ] as [string, string][],
};
