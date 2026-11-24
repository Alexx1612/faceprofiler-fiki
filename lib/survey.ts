/**
 * Quick survey on the landing page: short, anonymous, role-based questions, in English and Romanian.
 *
 * Methodology: a closed-answer version of parts 1 and 3 of the M4 interview guide (lib/m4.ts), written
 * to pass The Mom Test: only facts about the recent past and what happens today (who guards the school,
 * incidents in the last 3 months, how and how late they were noticed, how they were resolved, who finds out
 * at night today, how staff learnt of a daytime incident, past refusals, who
 * decided), never opinions about our idea or "would you" questions, so the answers can be trusted and
 * counted. Every option is an [English, Romanian] pair; the English text is what is
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

const INCIDENT_YES = ["Yes, once", "Yes, more than once"];
const AFTER_INCIDENT = [{ id: "incident_night", in: INCIDENT_YES }, { id: "incident_day", in: INCIDENT_YES }];

export const questions: Question[] = [
  {
    id: "guarded",
    title: ["Who guards your school after classes end?", "Cine păzește școala după terminarea orelor?"],
    kind: "select",
    options: [
      ["A guard on site", "Un paznic, la fața locului"],
      ["A security company (patrol or alarm response)", "O firmă de pază (patrulă sau intervenție la alarmă)"],
      ["Cameras only", "Doar camere"],
      ["An alarm only", "Doar alarmă"],
      ["Nobody", "Nimeni"],
      DONT_KNOW,
    ],
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
    title: ["The last time, how was it noticed, and how late?", "Ultima dată, cum s-a sesizat incidentul și cât de târziu?"],
    kind: "select",
    options: [
      ["On the spot, by a guard or teacher", "Pe loc, de paznic sau de un profesor"],
      ["On the spot, by cameras or an alarm", "Pe loc, de camere sau de alarmă"],
      ["A pupil or parent reported it later", "L-a semnalat mai târziu un elev sau un părinte"],
      ["The next day", "A doua zi"],
      ["Days later", "După câteva zile"],
      DONT_KNOW,
    ],
    required: true,
    when: AFTER_INCIDENT,
  },
  {
    id: "resolved",
    title: ["How was it resolved?", "Cum s-a rezolvat?"],
    kind: "select",
    options: [
      ["Right away, by the guard or staff", "Imediat, de paznic sau de personal"],
      ["The police or a security company came", "A venit poliția sau firma de pază"],
      ["Resolved, but late", "S-a rezolvat, dar cu întârziere"],
      ["It was not resolved", "Nu s-a rezolvat"],
      DONT_KNOW,
    ],
    required: true,
    when: AFTER_INCIDENT,
  },
  {
    id: "alert_night",
    title: ["Today, if someone gets into the school at night, who finds out and how?", "Azi, dacă intră cineva noaptea în școală, cine află și cum?"],
    kind: "select",
    options: [
      ["The alarm calls the security company", "Alarma anunță firma de pază"],
      ["The guard calls the principal", "Paznicul îl sună pe director"],
      ["Nobody, until the morning", "Nimeni, până dimineață"],
      DONT_KNOW,
    ],
    required: true,
  },
  {
    id: "alert_day",
    title: ["At the last daytime incident (e.g. a fight), how did the staff find out?", "La ultimul incident din timpul zilei (de exemplu o bătaie), cum a aflat personalul?"],
    kind: "select",
    options: [
      ["A teacher or the guard saw it", "L-a văzut un profesor sau paznicul"],
      ["A pupil told a teacher", "Un elev i-a spus unui profesor"],
      ["From the cameras", "Din camere"],
      ["Later, from parents", "Mai târziu, de la părinți"],
      ["There was no such incident", "Nu a fost un astfel de incident"],
      DONT_KNOW,
    ],
    required: true,
  },
  {
    id: "refused",
    title: [
      "Has your school ever turned down a security or camera solution? Why? (optional)",
      "A renunțat vreodată școala la o soluție de pază sau la camere? De ce? (opțional)",
    ],
    kind: "select",
    options: [
      ["Too expensive", "Prea scump"],
      ["Parents or staff objected (privacy)", "S-au opus părinții sau personalul (intimitate)"],
      ["Too many false alarms", "Prea multe alarme false"],
      ["Too hard to use", "Prea greu de folosit"],
      ["Never turned one down", "Nu a renunțat niciodată"],
      DONT_KNOW,
    ],
    for: ["teacher"],
  },
  {
    id: "decided",
    title: ["Who decided the last spending on guarding or cameras?", "Cine a decis ultima cheltuială pentru pază sau camere?"],
    kind: "select",
    options: [
      ["The principal", "Directorul"],
      ["The school board", "Consiliul de administrație"],
      ["The city hall", "Primăria"],
      ["The parents' association", "Asociația de părinți"],
      DONT_KNOW,
    ],
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
