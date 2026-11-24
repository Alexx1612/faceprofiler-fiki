/**
 * Quick survey on the landing page: short, anonymous, role-based questions, in English and Romanian.
 *
 * Methodology: a simpler, closed-answer version of the M4 interview guide (docs/M4_INTERVIEW_KIT.md
 * in the main repo): the same topics (feeling of safety after hours, last incident, how people are
 * checked, what would make someone refuse, who must be told, who decides) as dropdowns or 0-5 scales,
 * so answers can be counted. Every option is an [English, Romanian] pair; the English text is what is
 * stored, whichever language the visitor used, so answers from both languages add up. `for` limits a
 * question to some roles; `when` shows it only after a given answer; `game` only after the visitor
 * played the "Spot the stranger" game. Every dropdown also offers "Other…" with a free-text answer
 * (stored as `<id>_other`) and every scale an optional comment (`<id>_note`); free text is never shown in
 * public stats. No name or e-mail is asked.
 */

export type Lang = "en" | "ro";
export type Role = "student" | "pupil" | "teacher" | "staff" | "parent" | "other";
type T = [en: string, ro: string];

export type Question = {
  id: string;
  title: T;
  kind: "select" | "scale" | "text";
  options?: T[];
  /** Labels for the two ends of a 0-5 scale. */
  ends?: [T, T];
  required?: boolean;
  for?: Role[];
  /** Shown when any of these answers was given. */
  when?: { id: string; in: string[] }[];
  game?: boolean;
};

export const ui = {
  button: ["Quick survey", "Chestionar rapid"],
  time: ["1 min", "1 min"],
  title: ["Nau-ino · quick survey", "Nau-ino · chestionar scurt"],
  intro: ["School safety after hours. About 1 minute, anonymous: no name, no e-mail.", "Despre siguranța școlii în afara orelor. Durează cam un minut și e anonim: nu îți cerem numele sau e-mailul."],
  required: ["* Required", "* Indică o întrebare obligatorie"],
  role: ["I am", "Ce rol ai?"],
  choose: ["Choose", "Alege o variantă"],
  answer: ["Your answer", "Răspunsul tău"],
  missingOne: ["This is a required question", "Aceasta este o întrebare obligatorie"],
  missingAll: ["Please answer the questions marked in red.", "Te rugăm să răspunzi la întrebările marcate cu roșu."],
  submit: ["Submit", "Trimite"],
  sending: ["Sending…", "Se trimite…"],
  clear: ["Clear form", "Șterge răspunsurile"],
  close: ["Close", "Închide"],
  sentTitle: ["Your response has been recorded.", "Răspunsul tău a fost înregistrat."],
  sentText: ["Thank you! Your answers were sent to the Nau-ino team.", "Mulțumim! Răspunsurile tale au ajuns la echipa Nau-ino."],
  mailTitle: ["Almost done.", "Mai ai un singur pas."],
  mailText: ["Your e-mail app opened with your answers. Press send there.", "S-a deschis aplicația de e-mail cu răspunsurile completate. Apasă „Trimite” acolo."],
  again: ["Submit another response", "Trimite alt răspuns"],
  error: ["Could not send. Please try again.", "Nu s-a putut trimite. Încearcă din nou."],
  game: ["Try the 30-second game: you vs. the machine", "Joacă 30 de secunde: tu contra calculatorului"],
  other: ["Other…", "Altceva…"],
  otherText: ["Write your answer", "Scrie răspunsul tău"],
  addNote: ["+ Add a comment", "+ Adaugă un comentariu"],
  gameDone: ["Your game results are sent with your answers.", "Rezultatele tale din joc vor fi trimise împreună cu răspunsurile."],
  gameProgress: ["Game", "Joc"],
  gameResume: ["Continue the game where you left off", "Continuă jocul de unde ai rămas"],
  gameRestart: ["Start the game over", "Reia jocul de la început"],
} satisfies Record<string, T>;

export const roles: { id: Role; label: T }[] = [
  { id: "student", label: ["University student", "Student"] },
  { id: "pupil", label: ["School pupil", "Elev"] },
  { id: "teacher", label: ["Teacher", "Profesor"] },
  { id: "staff", label: ["School staff (guard, admin, cleaner)", "Personal al școlii (paznic, secretariat, îngrijitor)"] },
  { id: "parent", label: ["Parent", "Părinte"] },
  { id: "other", label: ["Other", "Altul"] },
];

const DONT_KNOW: T = ["I don't know", "Nu știu"];
const USEFUL: [T, T] = [["Not at all", "Deloc"], ["A lot", "Foarte mult"]];

const INCIDENT_YES = ["Yes, once", "Yes, more than once"];

export const questions: Question[] = [
  {
    id: "guarded",
    title: ["How well is your school guarded after hours?", "Cât de bine e păzită școala după terminarea orelor?"],
    kind: "scale",
    ends: [["Not at all", "Deloc"], ["Very well", "Foarte bine"]],
    required: true,
  },
  {
    id: "incident_night",
    title: [
      "In the last 3 months, was there an incident at night at your school (break-in, vandalism, intruder)?",
      "În ultimele 3 luni, a avut loc vreun incident noaptea la școala ta (spargere, vandalism, intrus)?",
    ],
    kind: "select",
    options: [["No", "Nu"], ["Yes, once", "Da, o dată"], ["Yes, more than once", "Da, de mai multe ori"], DONT_KNOW],
    required: true,
  },
  {
    id: "incident_day",
    title: [
      "In the last 3 months, was there an incident during the day (fights, theft, strangers in the school)?",
      "În ultimele 3 luni, a avut loc vreun incident în timpul zilei (bătăi, furturi, persoane străine în școală)?",
    ],
    kind: "select",
    options: [["No", "Nu"], ["Yes, once", "Da, o dată"], ["Yes, more than once", "Da, de mai multe ori"], DONT_KNOW],
    required: true,
  },
  {
    id: "noticed",
    title: ["How quickly was the incident noticed?", "Cât de repede a fost observat incidentul?"],
    kind: "select",
    options: [
      ["On the spot, by a guard or teacher", "Pe loc, de paznic sau de un profesor"],
      ["On the spot, by cameras or an alarm", "Pe loc, de camere sau de alarmă"],
      ["A few hours later", "După câteva ore"],
      ["The next day", "A doua zi"],
      ["Days later", "După câteva zile"],
      DONT_KNOW,
    ],
    required: true,
    when: [{ id: "incident_night", in: INCIDENT_YES }, { id: "incident_day", in: INCIDENT_YES }],
  },
  {
    id: "resolved",
    title: ["Was it resolved in time?", "S-a rezolvat la timp?"],
    kind: "select",
    options: [
      ["Yes, right away", "Da, imediat"],
      ["Yes, but late", "Da, dar cu întârziere"],
      ["No, it wasn't resolved", "Nu, nu s-a rezolvat"],
      DONT_KNOW,
    ],
    required: true,
    when: [{ id: "incident_night", in: INCIDENT_YES }, { id: "incident_day", in: INCIDENT_YES }],
  },
  {
    id: "who_inside",
    title: ["After hours, how does the school check who comes in?", "După terminarea orelor, cum se verifică cine intră în școală?"],
    kind: "select",
    options: [
      ["A guard checks", "Verifică paznicul"],
      ["Key cards or codes", "Cu cartelă sau cod de acces"],
      ["Someone watches the cameras", "Cineva urmărește camerele"],
      ["Nobody checks", "Nu verifică nimeni"],
      DONT_KNOW,
    ],
    required: true,
  },
  {
    id: "comfort",
    title: [
      "How acceptable is a camera system that recognises only school staff and never stores pupils' faces?",
      "Cât de acceptabil ți se pare un sistem de camere care recunoaște doar personalul școlii și nu salvează fețele elevilor?",
    ],
    kind: "scale",
    ends: [["Not at all", "Deloc"], ["Fully", "Pe deplin"]],
    required: true,
  },
  {
    id: "alert_useful",
    title: [
      "How much would a phone alert help when an unknown person enters the school at night?",
      "Cât te-ar ajuta o alertă pe telefon când o persoană necunoscută intră noaptea în școală?",
    ],
    kind: "scale",
    ends: USEFUL,
    required: true,
    for: ["teacher", "staff", "parent", "other"],
  },
  {
    id: "day_alert_useful",
    title: [
      "How much would an alert help for daytime incidents too (fights, strangers in the yard)?",
      "Cât te-ar ajuta o alertă și pentru incidentele din timpul zilei (bătăi, persoane străine în curte)?",
    ],
    kind: "scale",
    ends: USEFUL,
    required: true,
    for: ["teacher", "staff", "parent", "other"],
  },
  {
    id: "morning_useful",
    title: ["How much would a short summary of the night, every morning, help?", "Cât te-ar ajuta un scurt rezumat al nopții, primit în fiecare dimineață?"],
    kind: "scale",
    ends: USEFUL,
    required: true,
    for: ["teacher", "staff"],
  },
  {
    id: "game_trust",
    title: ["After the game: would you trust an automatic system to spot strangers?", "După ce ai jucat: ai avea încredere într-un sistem automat care observă persoanele străine?"],
    kind: "scale",
    ends: [["Not at all", "Deloc"], ["Fully", "Pe deplin"]],
    required: true,
    game: true,
  },
  {
    id: "refuse",
    title: ["Main reason you would refuse such a system? (optional)", "Care ar fi principalul motiv pentru care ai refuza un astfel de sistem? (opțional)"],
    kind: "select",
    options: [
      ["Pupils' privacy", "Intimitatea elevilor"],
      ["False alarms", "Alarmele false"],
      ["Cost", "Costul"],
      ["Hard to use", "E greu de folosit"],
      ["Nothing", "Nimic, l-aș accepta"],
    ],
    for: ["teacher"],
  },
  {
    id: "tell",
    title: ["Who should be informed before the system starts?", "Cine ar trebui informat înainte ca sistemul să fie pus în funcțiune?"],
    kind: "select",
    options: [
      ["Everyone, in writing", "Toată lumea, în scris"],
      ["Parents, who must agree first", "Părinții, care trebuie să-și dea acordul"],
      ["School staff only", "Doar personalul școlii"],
      ["No need", "Nu e nevoie"],
      ["Not sure", "Nu sunt sigur(ă)"],
    ],
    required: true,
  },
  {
    id: "decides",
    title: ["Who would decide to buy such a system?", "Cine ar decide achiziția unui astfel de sistem?"],
    kind: "select",
    options: [["The principal", "Directorul"], ["The school board", "Consiliul de administrație"], ["The city hall", "Primăria"], DONT_KNOW],
    required: true,
    for: ["teacher", "staff"],
  },
  {
    id: "comment",
    title: ["Anything else? (optional)", "Mai vrei să adaugi ceva? (opțional)"],
    kind: "text",
  },
];

/** Questions shown for a role, the answers given so far and whether the game was played. */
export function visibleQuestions(role: Role | "", answers: Record<string, string>, played = false): Question[] {
  if (!role) return [];
  return questions.filter(
    (q) =>
      (!q.for || q.for.includes(role)) &&
      (!q.when || q.when.some((w) => w.in.includes(answers[w.id] ?? ""))) &&
      (!q.game || played),
  );
}
