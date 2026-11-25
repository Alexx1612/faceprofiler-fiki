/**
 * Milestone 4, UX: interviews, personas, user stories, use cases, user flows and the wireframe changes,
 * for the /M4 page.
 *
 * Keep claims to what the team actually did. The interviews took place face to face in Romanian; what
 * is shown here is translated into English. Anything that depends on the interview notes and is not
 * filled in yet is marked `pending` and shown as such on the page, never invented.
 */

export type Source = "M2" | "M4" | "draft";

export const m4Method = {
  who: "Six people, face to face, one at a time: a school night guard, a school principal, the owner of a small production hall and three teachers.",
  why: "Three roles around one night: the person who is on site (guard), the people who answer for the building and decide on buying (principal, hall owner), and the people who see the building in the daytime (teachers).",
  how: "Semi-structured interviews of about 30 minutes: first their work and real past incidents without showing the product, then tasks on the M3 wireframe, then cost and objections. Notes taken during the conversation.",
  language: "All interviews were held in Romanian. Questions, notes and quotes on this page are our English translation. Names, schools and addresses are withheld.",
};

export const m4Participants: { code: string; role: string; segment: string; persona: string }[] = [
  { code: "G1", role: "Night guard", segment: "School", persona: "guard" },
  { code: "P1", role: "Principal", segment: "School", persona: "principal" },
  { code: "H1", role: "Owner of a small production hall", segment: "Private building", persona: "owner" },
  { code: "T1", role: "Teacher", segment: "School", persona: "principal" },
  { code: "T2", role: "Teacher", segment: "School", persona: "principal" },
  { code: "T3", role: "Teacher", segment: "School", persona: "principal" },
];

/** The interview guide, in the order it is used (translated from the Romanian original). */
export const m4Guide: { part: string; minutes: number; questions: string[] }[] = [
  {
    part: "1. Their work and real incidents (no product shown)",
    minutes: 10,
    questions: [
      "Walk me through a normal night (guard) / a normal week for the building (principal, owner, teachers).",
      "Tell me about the last time something went wrong at night or after hours. What happened, step by step?",
      "How did you find out, and how long after it started?",
      "Who did you call, and who actually came?",
      "What do you check in the morning, and how?",
      "Who is allowed in the building after hours, and how do you know who is who?",
    ],
  },
  {
    part: "2. Tasks on the wireframe",
    minutes: 15,
    questions: [
      "It is 02:17 and this alert comes in. Show me what you would do.",
      "A new cleaner starts on Monday. Add them so the system knows them.",
      "It is 08:00. Find out whether anything happened last night.",
      "Set the hall so workers on the day shift raise no alerts, but the storage room still does (owner only).",
      "What on these screens is unclear, missing or not needed?",
    ],
  },
  {
    part: "3. Cost and objections",
    minutes: 5,
    questions: [
      "What would make you refuse a system like this?",
      "Who would decide on buying it, and from which budget?",
      "What do you pay now for guarding or monitoring, and what would this be worth to you per month?",
      "Do parents, staff or workers need to be told or asked? Who would do that?",
    ],
  },
];

/** What we wanted to learn. `result` stays pending until the notes are added. */
export const m4Hypotheses: { id: string; claim: string; who: string; result: "pending" | "confirmed" | "rejected" | "mixed"; evidence?: string }[] = [
  { id: "A1", claim: "The guard wants alerts on the phone, not on a PC screen in the office.", who: "G1", result: "pending" },
  { id: "A2", claim: "If the guard does not react within a few minutes, someone else must be called automatically.", who: "G1, P1, H1", result: "pending" },
  { id: "A3", claim: "The principal wants a short morning summary, not a live screen.", who: "P1, T1-T3", result: "pending" },
  { id: "A4", claim: "A school will refuse anything that identifies pupils; enrolling staff only is acceptable.", who: "P1, T1-T3", result: "pending" },
  { id: "A5", claim: "Blurring faces in exports and recordings makes the system easier to accept.", who: "P1, H1, T1-T3", result: "pending" },
  { id: "A6", claim: "A production hall needs alerts off for its workers during shifts and on for everyone after hours.", who: "H1", result: "pending" },
  { id: "A7", claim: "Buyers would pay monthly rather than once, and less than a night guard costs.", who: "P1, H1", result: "pending" },
];

/** Conclusions written from the notes. Empty until the notes are added. */
export const m4Conclusions: { title: string; text: string; from: string }[] = [];

/** Short translated quotes from the notes. Empty until the notes are added. */
export const m4Quotes: { who: string; text: string }[] = [];

export type Persona = {
  id: "guard" | "principal" | "owner";
  name: string;
  role: string;
  primary: boolean;
  context: string;
  goals: string[];
  frustrations: string[];
  needs: string[];
  tech: string;
  based: string;
};

/** Personas. Names are fictional. Until the M4 notes are added they are drafts built on M2 and our assumptions. */
export const m4Personas: Persona[] = [
  {
    id: "guard",
    name: "Ion",
    role: "School night guard",
    primary: true,
    context: "Alone in the building from 21:00 to 07:00, does rounds every few hours, the camera monitor is in the porter's room.",
    goals: ["Know at once if someone gets in, wherever he is in the building", "Not be blamed for something he could not have seen", "Get help fast when he needs it"],
    frustrations: ["Cannot watch the monitor during rounds", "Cameras only record; nobody looks until the next day", "Unclear who to call and who will actually come"],
    needs: ["Alert on his phone with a picture", "One button: I'm checking / call help", "No false alarms from staff he already knows"],
    tech: "Uses a smartphone every day (calls, WhatsApp); does not use a PC at work.",
    based: "Draft: our assumptions and the M2 finding that an alert must reach someone who acts. To be confirmed with G1's notes.",
  },
  {
    id: "principal",
    name: "Elena",
    role: "School principal",
    primary: false,
    context: "Answers for the building, the staff and the pupils; decides on spending together with the school board and the local council.",
    goals: ["Know in the morning whether anything happened at night", "Keep pupils' data safe and parents informed", "Spend the security budget on something that works"],
    frustrations: ["Learns about incidents late and second hand", "Rules on cameras and children's data are unclear", "Security contracts are paid whether anything happens or not"],
    needs: ["A short morning summary", "A school mode where pupils are never recognised", "Blurred faces in anything exported"],
    tech: "Uses e-mail and a laptop daily; little time for new software.",
    based: "Draft: M2 interviews (teachers and a deputy headmistress) and our assumptions. To be confirmed with P1 and T1-T3's notes.",
  },
  {
    id: "owner",
    name: "Radu",
    role: "Owner of a small production hall",
    primary: false,
    context: "Runs a small production hall with a handful of workers on day shifts; machines, tools and materials stay inside, and the hall is empty at night and at weekends.",
    goals: ["Protect machines, tools and stock when the hall is empty", "Know who was in the hall and when, without watching footage", "Keep costs lower than a permanent guard"],
    frustrations: ["Workers, couriers and suppliers come and go; he is not always there to see them", "Alarm systems ring for nothing when someone works late", "Pays for guarding even on quiet nights"],
    needs: ["Alerts only outside shift hours, except for restricted rooms", "Workers and regular suppliers enrolled, with allowed hours", "Alerts on his phone and to the security firm"],
    tech: "Runs the business from his phone; plans shifts on paper or in a spreadsheet.",
    based: "Draft: our assumptions about the private-building segment. To be confirmed with H1's notes.",
  },
];

export const m4Stories: { persona: Persona["id"]; story: string; done: string; source: Source }[] = [
  { persona: "guard", story: "As the night guard, I want an alert with a photo on my phone when an unknown person enters, so that I know even when I am on my rounds.", done: "Alert reaches the phone within 5 seconds of the person appearing, with a picture and the camera name.", source: "M2" },
  { persona: "guard", story: "As the night guard, I want to answer an alert with one tap (I'm checking / Call help), so that the others know someone is on it.", done: "Two buttons on the alert; the answer and its time appear in the night report.", source: "draft" },
  { persona: "guard", story: "As the night guard, I want staff I know (cleaners, the caretaker) to not raise alerts, so that I trust the alerts I do get.", done: "Enrolled staff on their allowed hours never raise an unknown-person alert.", source: "draft" },
  { persona: "guard", story: "As the night guard, I want a warning when a camera is covered or turned, so that nobody blinds the system.", done: "Covered, moved or disconnected camera raises its own alert within a minute.", source: "draft" },
  { persona: "principal", story: "As the principal, I want a morning summary of the night, so that I know in two minutes whether I need to act.", done: "E-mail or page at 07:30 with the number of alerts, who answered and anything still open.", source: "draft" },
  { persona: "principal", story: "As the principal, I want a school mode in which pupils are never recognised, so that we stay within the rules on children's data.", done: "Only adults on the staff list can be enrolled; everyone else is only 'unknown' and only at night.", source: "M2" },
  { persona: "principal", story: "As the principal, I want faces blurred in anything exported, so that clips can be shown to the police or parents without exposing bystanders.", done: "Blur option: everyone, known people only, or unknown people only; applied to exports.", source: "draft" },
  { persona: "principal", story: "As the principal, I want footage deleted after a set number of days, so that we do not keep data longer than needed.", done: "Retention setting in days; older clips are deleted and the deletion is logged.", source: "M2" },
  { persona: "principal", story: "As the principal, I want an alert to go to the security company if the guard does not answer, so that no alert is lost.", done: "If nobody answers within the set minutes, the next person on the list is alerted.", source: "M2" },
  { persona: "owner", story: "As the owner, I want my workers to raise no alerts during their shifts, so that I only hear about real problems.", done: "Shift hours per worker; an enrolled worker inside their hours never raises an alert.", source: "draft" },
  { persona: "owner", story: "As the owner, I want the storage room and the office to alert for anyone not allowed there, even during shifts, so that stock and tools stay safe.", done: "Zones marked restricted alert for every person not on their list, at any hour.", source: "draft" },
  { persona: "owner", story: "As the owner, I want to set the system up myself in one evening, so that I do not pay an installer.", done: "First-run setup: cameras, night hours, staff, a test alert; under 30 minutes.", source: "draft" },
];

export const m4UseCases: { id: string; title: string; actor: string; trigger: string; steps: string[]; outcome: string; alt?: string }[] = [
  {
    id: "UC1",
    title: "Unknown person at night",
    actor: "Night guard (then security company)",
    trigger: "A face that is not enrolled appears on a camera during night hours.",
    steps: ["System raises an alert with a photo and camera name", "Guard's phone rings", "Guard taps 'I'm checking' and goes to the place", "Guard closes the alert: false alarm / handled / police called"],
    outcome: "Alert closed with an answer; it appears in the morning summary.",
    alt: "No answer within 3 minutes: the security company is alerted, then the principal.",
  },
  {
    id: "UC2",
    title: "Morning review",
    actor: "Principal",
    trigger: "07:30 every school day.",
    steps: ["Summary arrives by e-mail", "Principal opens the night report", "Watches the clip of any open alert (faces blurred if set)", "Marks it done or forwards it"],
    outcome: "Every alert of the night has an owner by 08:00.",
  },
  {
    id: "UC3",
    title: "Enrol a new staff member",
    actor: "Principal or administrator",
    trigger: "A new cleaner, guard or teacher starts.",
    steps: ["Open People, Add person", "Take three photos (front, left, right) or a short video turning the head", "Set allowed hours", "Save; a test shows the person is recognised"],
    outcome: "The person no longer raises alerts in their hours.",
    alt: "The person is a pupil: school mode refuses the enrolment.",
  },
  {
    id: "UC4",
    title: "After hours at the production hall",
    actor: "Owner of the production hall",
    trigger: "The last shift ends.",
    steps: ["Hall switches to after-hours mode by itself", "Anyone seen now raises an alert, workers too, unless allowed to stay late", "Restricted rooms alert at any hour", "Owner gets a short report in the morning"],
    outcome: "No alerts from workers during their shifts; the hall, storage and office are watched when nobody should be there.",
  },
  {
    id: "UC5",
    title: "Request to delete someone's data",
    actor: "Principal (on request of a staff member or parent)",
    trigger: "A written request to be forgotten.",
    steps: ["Open the person's profile", "Delete: face vectors, photos and their clips", "System confirms and logs the deletion"],
    outcome: "Nothing about the person is left; the log shows when and by whom it was deleted.",
  },
  {
    id: "UC6",
    title: "Camera covered or moved",
    actor: "Night guard",
    trigger: "A camera's picture goes dark, blurred, or changes view.",
    steps: ["System raises a camera alert", "Guard checks the camera", "Guard closes the alert"],
    outcome: "No camera stays blind until the morning.",
  },
];

/** User flows drawn as steps; `branch` steps are decisions. */
export const m4Flows: { id: string; title: string; persona: Persona["id"]; steps: { text: string; branch?: [string, string] }[] }[] = [
  {
    id: "F1",
    title: "Night alert",
    persona: "guard",
    steps: [
      { text: "Unknown face on camera 3" },
      { text: "Phone alert with photo" },
      { text: "Guard answers within 3 min?", branch: ["Yes: 'I'm checking'", "No: security company alerted"] },
      { text: "Goes to the place" },
      { text: "Real intruder?", branch: ["Yes: call police, keep clip", "No: close as false alarm"] },
      { text: "Shown in the morning summary" },
    ],
  },
  {
    id: "F2",
    title: "Morning review",
    persona: "principal",
    steps: [
      { text: "07:30 summary e-mail" },
      { text: "Open alerts left?", branch: ["Yes: watch the clip (blurred)", "No: done in 2 minutes"] },
      { text: "Mark done or forward" },
    ],
  },
  {
    id: "F3",
    title: "First setup",
    persona: "owner",
    steps: [
      { text: "Connect cameras" },
      { text: "Set shift hours and restricted rooms" },
      { text: "Enrol staff (3 photos or a video)" },
      { text: "Choose privacy: school mode, blur, keep N days" },
      { text: "Send a test alert to the phone" },
    ],
  },
];

/** Changes to the M3 wireframe. `source` says what the change is based on. */
export const m4Changes: { id: string; screen: string; change: string; why: string; source: Source }[] = [
  { id: "W1", screen: "Guard's phone", change: "Alert gets two big buttons, 'I'm checking' and 'Call help', and a countdown to escalation.", why: "An alert is useless if nobody acts on it.", source: "M2" },
  { id: "W2", screen: "Night report", change: "Becomes a morning summary: three numbers, open alerts first, who answered and when.", why: "The principal reads it at 07:30, in two minutes.", source: "draft" },
  { id: "W3", screen: "Settings", change: "New Privacy section: school mode (pupils never enrolled), blur faces, keep footage N days.", why: "Children's faces need extra care.", source: "M2" },
  { id: "W4", screen: "Schedule (new)", change: "Shift hours and after hours; enrolled workers raise no alerts on shift, restricted rooms alert at any hour.", why: "A production hall is busy by day and empty at night and at weekends.", source: "draft" },
  { id: "W5", screen: "Settings", change: "Escalation list: guard, then security company, then principal, with minutes between them.", why: "Who comes at night was the open question in M2.", source: "M2" },
];

/**
 * Online quick survey on the landing page (Mom-Test questions: past facts only), as of 26 Nov 2026.
 * Real, anonymous answers from the collector (test traffic left out), counted per question; free-text
 * answers are not published. Separate from the six interviews and NOT used to fill their results above.
 * Limits: small sample, mostly reached through WhatsApp; the students are not buyers. Update with
 * `python tools/analytics_db.py` in the main repo, then copy the counts from the v_survey_summary view.
 */
export const m4Survey = {
  asOf: "26 Nov 2026",
  n: 14,
  roles: [
    ["Teacher", 7],
    ["University student", 6],
    ["Other", 1],
  ] as [string, number][],
  questions: [
    {
      id: "guarded",
      q: "Who guards your school after classes end?",
      n: 14,
      answers: [["A guard on site", 4], ["Nobody", 3], ["I don't know", 3], ["An alarm only", 2], ["Cameras only", 2]],
      relates: "Context for A1-A2",
    },
    {
      id: "incident_night",
      q: "In the last 3 months, an incident at night (break-in, vandalism, intruder)?",
      n: 14,
      answers: [["No", 13], ["I don't know", 1]],
      relates: "Context",
    },
    {
      id: "incident_day",
      q: "In the last 3 months, an incident during the day (fights, theft, strangers)?",
      n: 14,
      answers: [["No", 11], ["Yes, once", 2], ["I don't know", 1]],
      relates: "Context",
    },
    {
      id: "noticed",
      q: "The last time, how was it noticed, and how late?",
      n: 2,
      answers: [["On the spot, by a guard or teacher", 1], ["Days later", 1]],
      relates: "A1",
    },
    {
      id: "resolved",
      q: "How was it resolved?",
      n: 2,
      answers: [["Resolved, but late", 1], ["It was not resolved", 1]],
      relates: "A2",
    },
    {
      id: "alert_night",
      q: "Today, if someone gets into the school at night, who finds out and how?",
      n: 14,
      answers: [["The alarm calls the security company", 4], ["The guard calls the principal", 4], ["Nobody, until the morning", 3], ["I don't know", 3]],
      relates: "A1-A3",
    },
    {
      id: "alert_day",
      q: "At the last daytime incident, how did the staff find out?",
      n: 14,
      answers: [["A teacher or the guard saw it", 5], ["A pupil told a teacher", 3], ["There was no such incident", 3], ["I don't know", 3]],
      relates: "A1",
    },
    {
      id: "refused",
      q: "Has your school ever turned down a security or camera solution? Why? (teachers)",
      n: 7,
      answers: [["Never turned one down", 4], ["I don't know", 2], ["Parents or staff objected (privacy)", 1]],
      relates: "A4-A5",
    },
    {
      id: "decided",
      q: "Who decided the last spending on guarding or cameras? (teachers and staff)",
      n: 7,
      answers: [["The parents' association", 4], ["I don't know", 2], ["The principal", 1]],
      relates: "A7",
    },
  ] as { id: string; q: string; n: number; answers: [string, number][]; relates: string }[],
  takeaways: [
    "Who pays: in 4 of 7 teachers' answers the parents' association decided the last spending on guarding or cameras, not the principal. The pilot pitch should reach parents' associations too (relates to A7).",
    "Nights are not covered everywhere: 3 of 14 say nobody finds out until the morning, and 3 say nobody guards the school after classes (supports the need behind A1-A2).",
    "Incidents are mostly in the daytime: 2 daytime incidents in 3 months and no night incidents reported; one was noticed days later, and neither was resolved in time.",
    "Privacy was the reason for one refusal of a camera solution (1 of 7 teachers), so staff-only enrolment and blurring remain important (A4-A5).",
  ],
};
