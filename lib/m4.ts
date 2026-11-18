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
  who: "Six people, face to face, one at a time: a school night guard, a school principal, the owner of a private event hall and three teachers.",
  why: "Three roles around one night: the person who is on site (guard), the people who answer for the building and decide on buying (principal, hall owner), and the people who see the building in the daytime (teachers).",
  how: "Semi-structured interviews of about 30 minutes: first their work and real past incidents without showing the product, then tasks on the M3 wireframe, then cost and objections. Notes taken during the conversation.",
  language: "All interviews were held in Romanian. Questions, notes and quotes on this page are our English translation. Names, schools and addresses are withheld.",
};

export const m4Participants: { code: string; role: string; segment: string; persona: string }[] = [
  { code: "G1", role: "Night guard", segment: "School", persona: "guard" },
  { code: "P1", role: "Principal", segment: "School", persona: "principal" },
  { code: "H1", role: "Owner of a private event hall", segment: "Private building", persona: "owner" },
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
      "Turn off alerts for the hall during Saturday's wedding (owner only).",
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
      "Do parents, staff or tenants need to be told or asked? Who would do that?",
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
  { id: "A6", claim: "An event hall needs alerts muted during booked events and on outside them.", who: "H1", result: "pending" },
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
    role: "Owner of a private event hall",
    primary: false,
    context: "Rents the hall for weddings, parties and conferences, mostly evenings and weekends; the building is empty on most nights.",
    goals: ["Protect the hall and equipment when it is empty", "Not be woken up by guests during booked events", "Keep costs lower than a permanent guard"],
    frustrations: ["Guests and suppliers come and go; he cannot know every face", "Alarm systems ring for nothing during events", "Pays for guarding even on empty nights"],
    needs: ["Alerts only outside bookings", "Staff and regular suppliers enrolled, guests never", "Alerts on his phone and to the security firm"],
    tech: "Runs the business from his phone; uses a calendar for bookings.",
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
  { persona: "owner", story: "As the hall owner, I want alerts muted during booked events, so that guests do not trigger them.", done: "Bookings from a calendar; unknown-person alerts are off during a booking, on outside it.", source: "draft" },
  { persona: "owner", story: "As the hall owner, I want restricted rooms (office, storage) to alert even during events, so that the equipment stays safe.", done: "Zones marked restricted keep alerting during bookings.", source: "draft" },
  { persona: "owner", story: "As the hall owner, I want to set the system up myself in one evening, so that I do not pay an installer.", done: "First-run setup: cameras, night hours, staff, a test alert; under 30 minutes.", source: "draft" },
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
    title: "Event at the hall",
    actor: "Hall owner",
    trigger: "A booking in the calendar starts.",
    steps: ["Alerts for public rooms pause automatically", "Restricted rooms keep alerting", "Booking ends; alerts resume", "Owner gets a short report of the event night"],
    outcome: "No alerts from guests; the office and storage stay protected.",
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
      { text: "Set night hours and bookings" },
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
  { id: "W4", screen: "Schedule (new)", change: "Night hours and bookings; public rooms pause during bookings, restricted rooms keep alerting.", why: "An event hall is busy on some nights and empty on others.", source: "draft" },
  { id: "W5", screen: "Settings", change: "Escalation list: guard, then security company, then principal, with minutes between them.", why: "Who comes at night was the open question in M2.", source: "M2" },
];
