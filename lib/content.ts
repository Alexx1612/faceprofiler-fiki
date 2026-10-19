/**
 * All text, numbers and people shown on the fiki page.
 * Edit this file to change the content; the components only lay it out.
 * Values marked "estimate" or "target" are business assumptions, not measurements.
 */

/** Prefix for files in public/ when the site is served from a sub-path (GitHub Pages project site). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

export const project = {
  name: "FaceProfiler",
  tagline: "Security and access control for any site, on the CCTV cameras it already has.",
  description:
    "From kindergartens and offices to data centres and military bases: FaceProfiler checks who enters with face recognition on existing cameras, confirms the face is real by its pulse, and checks visitors in and out with keycards or single-use passes. Each organisation's data stays in its own isolated container, and a local LLM turns events and notes into reports anyone can read.",
  eyebrow: "Computer vision · Access control · Security",
};

export const nav = [
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "customers", label: "Customers" },
  { id: "competition", label: "Competition" },
  { id: "metrics", label: "Metrics" },
  { id: "costs", label: "Costs" },
  { id: "revenue", label: "Revenue" },
  { id: "team", label: "Team" },
];

/** Annotated demo clips (free Mixkit stock footage, fictional names). */
export const clips = [
  { id: "46446", title: "Three colleagues walking outside", people: ["Adrian", "Nora", "Ruby"] },
  { id: "315", title: "Two colleagues walking down a hall", people: ["Julia", "Thomas"] },
  { id: "4872", title: "Two coworkers talking at a desk", people: ["Lucas", "Irina"] },
];

export const team = [
  {
    name: "Alexandru-Mugurel Mirea",
    role: "CEO & AI Lead",
    email: "alexandru.mirea1612@stud.acs.upb.ro",
    photo: "/team/member-1.jpg",
    bio: "Built the recognition pipeline: face detection, face vectors, the 10-nearest-neighbour vote, video tracking, the pulse check and the demo app.",
    owns: ["Product vision", "Face recognition & ML models", "Liveness check (pulse)"],
  },
  {
    name: "Matei Teodor Petrec",
    role: "Business & Partnerships",
    email: "matei_teodor.petrec@stud.fils.upb.ro",
    photo: "/team/member-2.jpg",
    bio: "Finds the pilot sites, talks to customers and security integrators, and keeps the budget, pricing and contracts in order.",
    owns: ["Pilot customers & integrators", "Pricing & finance", "GDPR / AI Act paperwork"],
  },
  {
    name: "Damian Monea",
    role: "Platform & Security Engineer",
    email: "damian.monea@stud.acs.up.ro",
    photo: "/team/member-3.jpg",
    bio: "Builds the platform around the models: keycard and visitor-pass check-in, one isolated container per organisation, and the local LLM that writes the reports.",
    owns: ["Access control & visitor passes", "Isolated deployments (Docker)", "Local LLM reports"],
  },
];

export const problems = [
  {
    title: "Footage nobody watches",
    text: "Malls, shops, offices and care homes record 24/7. A guard watching a wall of screens misses most of what happens.",
  },
  {
    title: "Searching is manual",
    text: "Finding one person in a day of recordings means scrubbing through hours of video by hand.",
  },
  {
    title: "Alerts come too late",
    text: "After-hours break-ins, thefts, falls and fights are often found the next morning, not when they happen.",
  },
  {
    title: "The data goes unused",
    text: "The same video could show how people move through a space and where they stop. Nobody turns it into a report.",
  },
];

export const steps = [
  { n: "01", title: "Enrol", text: "Add one or two photos per staff member or authorised person." },
  { n: "02", title: "Watch", text: "Connect the site's video. Every face is detected, tracked and compared." },
  { n: "03", title: "Alert", text: "Staff are told only when a human is needed: an unknown person, the wrong place, the wrong hour." },
  { n: "04", title: "Report", text: "Every event is saved with evidence; the same video produces traffic reports." },
];

export type Status = "Current" | "Partial" | "Next";

export const components: { name: string; text: string; status: Status }[] = [
  { name: "Face check", text: "Name and match score for every face, or Unknown_N for strangers.", status: "Current" },
  { name: "Person search", text: "Every photo and video moment where a chosen person appears.", status: "Current" },
  { name: "Emotion log", text: "Facial expression (7 classes) per person over time.", status: "Current" },
  { name: "Traffic & occupancy", text: "People per frame and movement trails; heatmaps next.", status: "Partial" },
  { name: "Attention analysis", text: "Head direction per face; mapping it to shelves next.", status: "Partial" },
  { name: "Recording search", text: "Searchable log of every saved face; event search next.", status: "Partial" },
  { name: "Event reconstruction", text: "Timestamped crops per person; cross-camera timeline next.", status: "Partial" },
  { name: "After-hours alert", text: "Person and unknown-face detection work; schedules and SMS next.", status: "Partial" },
  { name: "Cross-camera tracking", text: "Tracks people within one camera; linking cameras next.", status: "Partial" },
  { name: "Liveness check", text: "Confirms a face is real from its pulse (rPPG), so a photo cannot pass.", status: "Partial" },
  { name: "Keycard & visitor passes", text: "Check-in/out by keycard or single-use pass for visitors.", status: "Next" },
  { name: "Isolated per organisation", text: "Each customer's data in its own container (pod/Docker).", status: "Next" },
  { name: "LLM reports", text: "A local LLM turns events and notes into readable reports.", status: "Next" },
  { name: "Gesture analysis", text: "Hand and body gestures from body pose.", status: "Next" },
  { name: "Object removal alert", text: "Alert when a marked object leaves its place.", status: "Next" },
  { name: "Camera tamper alert", text: "Covered, blurred, moved or disconnected cameras.", status: "Next" },
  { name: "Fall & fight alert", text: "Falls and altercations detected from body pose.", status: "Next" },
];

export const segments = [
  {
    label: "Retail",
    who: "Shopping centres, chain stores, showrooms",
    pain: "Theft and no idea which displays work.",
    gets: "Unknown-person alerts after hours, plus footfall, dwell time and attention heatmaps per display.",
    buyer: "Store operations or security manager",
  },
  {
    label: "Restricted sites",
    who: "Offices, labs, data centres, military bases",
    pain: "Badges get shared; tailgating goes unnoticed.",
    gets: "Everyone who enters must be known. An unauthorised face is flagged the moment it appears.",
    buyer: "Facility or security manager",
  },
  {
    label: "Care & schools",
    who: "Kindergartens, schools, care homes",
    pain: "Staff cannot watch every room; falls are found late.",
    gets: "Alerts for an unknown adult, a fall or a fight. Emotion analysis stays off here: the EU AI Act bans it in schools and workplaces.",
    buyer: "Director or administrator",
  },
  {
    label: "Integrators",
    who: "Companies that install and maintain CCTV",
    pain: "Customers want AI but replacing cameras is expensive.",
    gets: "A licence they install on existing systems and resell with their maintenance contract.",
    buyer: "Integrator owner (channel partner)",
  },
];

export const competitors = [
  {
    name: "Verkada",
    kind: "Cloud-managed cameras",
    strength: "Polished app, face search, easy remote access.",
    gap: "Built around its own cameras and cloud; a full camera replacement and video leaving the site.",
  },
  {
    name: "Avigilon (Motorola Solutions)",
    kind: "Enterprise video security",
    strength: "Strong appearance search and analytics.",
    gap: "Enterprise pricing, sold through integrators; heavy for a single shop or kindergarten.",
  },
  {
    name: "Hikvision / Dahua",
    kind: "Low-cost cameras with on-camera AI",
    strength: "Cheap hardware with built-in face recognition.",
    gap: "New equipment authorisations banned by the US FCC (2022); trust concerns for EU buyers.",
  },
  {
    name: "BriefCam (Canon)",
    kind: "Video analytics software",
    strength: "Fast review and search of recorded video.",
    gap: "Enterprise licensing on top of a video management system; no simple package for small sites.",
  },
];

/** Comparison matrix: our assessment from the vendors' public product pages. */
export const matrix = {
  columns: ["FaceProfiler", "Verkada", "Avigilon", "Hikvision", "BriefCam"],
  rows: [
    { label: "No camera replacement", values: ["yes", "no", "partial", "no", "yes"] },
    { label: "Works fully offline, faces stay on site", values: ["yes", "partial", "yes", "yes", "yes"] },
    { label: "Priced for small sites", values: ["yes", "no", "no", "yes", "no"] },
    { label: "Security + retail analytics in one", values: ["yes", "partial", "partial", "partial", "yes"] },
    { label: "Built in the EU", values: ["yes", "no", "no", "no", "no"] },
  ] as { label: string; values: ("yes" | "partial" | "no")[] }[],
};

export const advantages = [
  { title: "Keeps your cameras", text: "Runs on the video a site already records. No new cameras to buy or install." },
  { title: "Faces never leave the building", text: "All processing happens on one PC on site. No cloud upload, smaller GDPR risk." },
  { title: "One or two photos to enrol", text: "A new employee is recognised minutes after their photo is added." },
  { title: "Strangers stay anonymous", text: "Unknown people get a number (Unknown_N), not a profile scraped from the internet." },
  { title: "Runs on an ordinary PC", text: "The demo edition needs no graphics card: 13-20 frames per second on a laptop CPU." },
  { title: "One product, many uses", text: "Security alerts, person search and footfall reports from the same video." },
];

/** Measured on the demo edition, Intel Core i7-13650HX laptop, 16 Oct 2026. */
export const measured = [
  { value: 99.7, suffix: "%", precision: 1, label: "Known people named correctly", note: "358 of 359 photos" },
  { value: 0, suffix: "", precision: 0, label: "Wrong names given", note: "on the 405-photo test" },
  { value: 97.7, suffix: "%", precision: 1, label: "Strangers kept anonymous", note: "42 of 43 strangers" },
  { value: 20, suffix: " fps", precision: 0, label: "Video speed on a CPU", note: "13-20 frames per second" },
  { value: 16, suffix: " s", precision: 0, label: "To check 405 photos", note: "12-16 s, no graphics card" },
  { value: 3, suffix: " s", precision: 0, label: "From double-click to ready", note: "with 19 people enrolled" },
];

/** Business metrics we will track from the first pilot (targets are assumptions). */
export const tracked = [
  { label: "Cameras under contract", target: "150 by month 12", why: "Revenue grows per camera." },
  { label: "Monthly recurring revenue", target: "€2,500 by month 12", why: "Shows the business pays for itself." },
  { label: "Pilot → paying customer", target: "≥ 40%", why: "Proves the product solves a real problem." },
  { label: "False alerts per camera per week", target: "< 1", why: "Too many false alarms and staff stop looking." },
  { label: "Time to find a person in a day of video", target: "< 2 min", why: "Today it takes hours by hand." },
  { label: "Monthly churn", target: "< 2%", why: "Customers stay when alerts are useful." },
];

/** First-year cost estimate in EUR. */
export const costs = [
  { label: "Team (3 people, part-time)", amount: 36000, kind: "Fixed", note: "Development, sales, support" },
  { label: "Model licences, legal & GDPR", amount: 6000, kind: "Fixed", note: "Commercial face-model licence, DPIA, contracts" },
  { label: "Sales & marketing", amount: 5000, kind: "Variable", note: "Trade fairs, demos, integrator onboarding" },
  { label: "Pilot hardware", amount: 4500, kind: "Variable", note: "3 edge PCs and test cameras" },
  { label: "Installation & support travel", amount: 3000, kind: "Variable", note: "On-site setup and enrolment" },
  { label: "Infrastructure", amount: 1200, kind: "Fixed", note: "Update server, website, backups" },
];

export const costNote =
  "Cloud costs stay close to zero: video is processed on the customer's own PC, so we pay for no GPU servers or video storage.";

export const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "Small shops, offices and kindergartens",
    priceMonthly: "€12",
    priceYearly: "€10",
    featuresLabel: "Up to 8 cameras",
    features: [
      { text: "Face check and Unknown_N alerts" },
      { text: "30-day evidence log" },
      { text: "E-mail alerts" },
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "Malls, chains and restricted sites",
    priceMonthly: "€19",
    priceYearly: "€15",
    badge: "Most chosen",
    featuresLabel: "Everything in Starter, plus",
    features: [
      { text: "After-hours schedules per zone" },
      { text: "Person search in recordings" },
      { text: "Traffic and attention reports" },
      { text: "App and SMS alerts" },
    ],
  },
  {
    id: "partner",
    name: "Partner",
    description: "Security integrators reselling the licence",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    featuresLabel: "Volume licence, plus",
    features: [
      { text: "Multi-site dashboard" },
      { text: "White label and API" },
      { text: "Priority support (SLA)" },
    ],
  },
];

export const otherRevenue = [
  { title: "Setup & enrolment", text: "One-time fee per site for installation, camera tuning and enrolling staff.", price: "€300-1,000" },
  { title: "Edge box", text: "A pre-configured mini-PC for sites without a spare computer, sold with a margin.", price: "from €900" },
  { title: "Analytics reports", text: "Monthly footfall, dwell and attention reports for retail, as an add-on.", price: "€49 / site / month" },
];
