/**
 * Milestone 5 (lead generation) content: the lead tools, the analytics setup, the campaign kit,
 * the campaign log and the channel numbers.
 *
 * Methodology: the log and the numbers are filled only from what the team actually posted and measured
 * (screenshots, permalinks, PostHog and Formspree counts). Until then every entry is "planned" and every
 * number is `null`, and the page shows "waiting for data" instead of a figure.
 */
import { siteUrl } from "./seo";

export type ChannelId = "facebook" | "reddit" | "linkedin" | "instagram" | "whatsapp" | "email";

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
    { name: "Product analytics: funnel", what: "Landing page viewed → “Book a pilot” clicked → form sent. Shows where people drop off." },
    { name: "Session replay", what: "Recordings of real visits to see where people scroll, hesitate or rage-click. Every input is masked." },
  ],
  events: [
    ["$pageview", "Any page opened (automatic)"],
    ["cta_book_pilot_click", "“Get notified” clicked (nav or hero); the name is kept from v1.15 so older data still counts"],
    ["updates_form_submitted", "“Get notified” sign-up sent"],
    ["pilot_email_click", "“Ask for a free 30-day pilot” e-mail link clicked"],
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
  whatsapp: { name: "WhatsApp / Discord", effort: "low" },
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
    where: "r/SideProject (self-promotion allowed), r/Romania or a city subreddit (read the sidebar: some only allow it in a weekly thread)",
    medium: "social",
    en: `Title: We built face checks for the CCTV cameras schools already have. Would your school use this?

We're a student team. Schools here already have cameras, but at night nobody watches them. Nau-ino runs on a computer in the building, knows the staff who are allowed in at night, and flags anyone else in real time. No cloud, no emotion analysis (the EU AI Act bans it in schools anyway).

Landing page with a demo: ${utm("reddit", "social", "post")}

Honest feedback welcome: privacy worries, "schools will never pay for this", anything.`,
    ro: `Titlu: Am făcut un sistem care recunoaște fețe pe camerele pe care școlile le au deja. L-ar folosi școala voastră?

Suntem o echipă de studenți. Școlile au deja camere, dar noaptea nu le urmărește nimeni. Nau-ino rulează pe un calculator din clădire, știe cine are voie înăuntru noaptea și semnalează imediat pe oricine altcineva. Fără cloud, fără analiza emoțiilor (AI Act o interzice oricum în școli).

Pagina cu demo: ${utm("reddit", "social", "post")}

Vrem păreri sincere: grija pentru date, „școlile n-o să plătească niciodată”, orice.`,
    note: "Reply to every comment in the first two hours; Reddit ranks active threads higher.",
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
    where: "Class, family and student groups; the course Discord",
    medium: "chat",
    en: `Hi! Our student project, Nau-ino, flags strangers on a school's own cameras at night. If you know a teacher or a school director, could you send them this? Free 30-day pilot: ${utm("whatsapp", "chat", "share")}`,
    ro: `Salut! Proiectul nostru de la facultate, Nau-ino, semnalează noaptea străinii pe camerele pe care școala le are deja. Dacă știi un profesor sau un director de școală, i-ai putea trimite asta? Pilot gratuit de 30 de zile: ${utm("whatsapp", "chat", "share")}`,
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
};

export const m5Log: LogEntry[] = [
  { channel: "facebook", where: "Parents' group of the town", status: "planned" },
  { channel: "facebook", where: "Teachers' group", status: "planned" },
  { channel: "reddit", where: "r/SideProject", status: "planned" },
  { channel: "reddit", where: "r/Romania or a city subreddit", status: "planned" },
  { channel: "linkedin", where: "Team members' profiles", status: "planned" },
  { channel: "instagram", where: "Stories", status: "planned" },
  { channel: "whatsapp", where: "Class and family groups", status: "planned" },
  { channel: "email", where: "School secretariats", status: "planned" },
];

/** Measured per channel: visitors = PostHog unique visitors with that utm_source; leads = Formspree submissions from that source. */
export const m5Numbers: Record<ChannelId, { visitors: number | null; leads: number | null }> = {
  facebook: { visitors: null, leads: null },
  reddit: { visitors: null, leads: null },
  linkedin: { visitors: null, leads: null },
  instagram: { visitors: null, leads: null },
  whatsapp: { visitors: null, leads: null },
  email: { visitors: null, leads: null },
};

/** Google Forms results, added by the team (screenshot of the Responses summary). */
export const m5GoogleForms: { link?: string; responses?: number; screenshot?: { src: string; width: number; height: number; alt: string } } = {};

/** PostHog screenshots, added by the team (web analytics, funnel, a replay). */
export const m5PosthogShots: { src: string; width: number; height: number; alt: string; caption: string }[] = [];

/** Written once the numbers are in; empty until then. */
export const m5Verdict = "";

export const m5Method = {
  timeline: [
    ["Day 1", "Lead forms and analytics added to the landing page; posts written in English and Romanian."],
    ["Days 2-3", "Posts published channel by channel, each with its own UTM link."],
    ["Days 4-10", "Replies to every comment; e-mails to schools followed up once."],
    ["Day 11", "Numbers collected from PostHog, Formspree and Google Forms; channels compared."],
  ] as [string, string][],
  tools: [
    ["Formspree", "Form back end for a static site: no server of our own."],
    ["PostHog", "Web analytics, funnel and session replay, EU cloud, cookieless until consent."],
    ["Google Forms", "Survey for people who will not open a landing page."],
    ["UTM links", "One per channel, so every visit and lead can be traced back to the post."],
  ] as [string, string][],
};
