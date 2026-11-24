/**
 * Quick survey on the landing page: short, anonymous, role-based questions, in English and Romanian.
 *
 * Methodology: a simpler, closed-answer version of the M4 interview guide (docs/M4_INTERVIEW_KIT.md
 * in the main repo): the same topics (feeling of safety after hours, last incident, how people are
 * checked, what would make someone refuse, who must be told, who decides) as dropdowns or 0-5 scales,
 * so answers can be counted. Every option is an [English, Romanian] pair; the English text is what is
 * stored, whichever language the visitor used, so answers from both languages add up. `for` limits a
 * question to some roles; `when` shows it only after a given answer; `game` only after the visitor
 * played the "Spot the stranger" game. No name or e-mail is asked.
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
  when?: { id: string; in: string[] };
  game?: boolean;
};

export const ui = {
  button: ["Quick survey", "Chestionar rapid"],
  time: ["1 min", "1 min"],
  title: ["Nau-ino · quick survey", "Nau-ino · chestionar rapid"],
  intro: ["School safety after hours. About 1 minute, anonymous: no name, no e-mail.", "Siguranța școlii după program. Cam 1 minut, anonim: fără nume, fără e-mail."],
  required: ["* Required", "* Obligatoriu"],
  role: ["I am", "Sunt"],
  choose: ["Choose", "Alege"],
  answer: ["Your answer", "Răspunsul tău"],
  missingOne: ["This is a required question", "Întrebarea este obligatorie"],
  missingAll: ["Please answer the questions marked in red.", "Răspunde la întrebările marcate cu roșu."],
  submit: ["Submit", "Trimite"],
  sending: ["Sending…", "Se trimite…"],
  clear: ["Clear form", "Golește formularul"],
  close: ["Close", "Închide"],
  sentTitle: ["Your response has been recorded.", "Răspunsul tău a fost înregistrat."],
  sentText: ["Thank you! Your answers were sent to the Nau-ino team.", "Mulțumim! Răspunsurile au ajuns la echipa Nau-ino."],
  mailTitle: ["Almost done.", "Aproape gata."],
  mailText: ["Your e-mail app opened with your answers. Press send there.", "S-a deschis aplicația de e-mail cu răspunsurile. Apasă trimite acolo."],
  again: ["Submit another response", "Trimite alt răspuns"],
  error: ["Could not send. Please try again.", "Nu s-a putut trimite. Încearcă din nou."],
  game: ["Try the 30-second game: you vs. the machine", "Încearcă jocul de 30 de secunde: tu vs. mașina"],
  gameDone: ["Your game result is added to your answers.", "Rezultatul tău din joc se adaugă la răspunsuri."],
} satisfies Record<string, T>;

export const roles: { id: Role; label: T }[] = [
  { id: "student", label: ["University student", "Student"] },
  { id: "pupil", label: ["School pupil", "Elev"] },
  { id: "teacher", label: ["Teacher", "Profesor"] },
  { id: "staff", label: ["School staff (guard, admin, cleaner)", "Personal (paznic, secretariat, curățenie)"] },
  { id: "parent", label: ["Parent", "Părinte"] },
  { id: "other", label: ["Other", "Altceva"] },
];

const DONT_KNOW: T = ["I don't know", "Nu știu"];
const USEFUL: [T, T] = [["Useless", "Inutil"], ["Very useful", "Foarte util"]];

export const questions: Question[] = [
  {
    id: "safe",
    title: ["How safe does your school feel after hours?", "Cât de sigură ți se pare școala după program?"],
    kind: "scale",
    ends: [["Not safe", "Nesigură"], ["Very safe", "Foarte sigură"]],
    required: true,
  },
  {
    id: "incident",
    title: ["Did something go wrong at your school at night in the last year?", "S-a întâmplat ceva rău noaptea la școala ta în ultimul an?"],
    kind: "select",
    options: [["No", "Nu"], ["Yes, once", "Da, o dată"], ["Yes, more than once", "Da, de mai multe ori"], DONT_KNOW],
    required: true,
  },
  {
    id: "found_out",
    title: ["When did the school find out?", "Când a aflat școala?"],
    kind: "select",
    options: [["The same night", "În aceeași noapte"], ["The next morning", "A doua zi dimineață"], ["Days later", "După câteva zile"], DONT_KNOW],
    required: true,
    when: { id: "incident", in: ["Yes, once", "Yes, more than once"] },
  },
  {
    id: "who_inside",
    title: ["After hours, how does the school know who is inside?", "După program, cum știe școala cine e înăuntru?"],
    kind: "select",
    options: [
      ["A guard checks", "Verifică un paznic"],
      ["Key cards or codes", "Carduri sau coduri"],
      ["Someone watches the cameras", "Cineva urmărește camerele"],
      ["Nobody checks", "Nu verifică nimeni"],
      DONT_KNOW,
    ],
    required: true,
  },
  {
    id: "comfort",
    title: ["Cameras that recognise only staff and never store pupils' faces. How OK is that for you?", "Camere care recunosc doar personalul și nu salvează fețele elevilor. Cât de OK e pentru tine?"],
    kind: "scale",
    ends: [["Not OK", "Deloc OK"], ["Fully OK", "Complet OK"]],
    required: true,
  },
  {
    id: "alert_useful",
    title: ["A phone alert when an unknown person is inside at night. How useful?", "O alertă pe telefon când e o persoană necunoscută înăuntru noaptea. Cât de utilă?"],
    kind: "scale",
    ends: USEFUL,
    required: true,
    for: ["teacher", "staff", "parent", "other"],
  },
  {
    id: "morning_useful",
    title: ["A short “last night” summary every morning. How useful?", "Un rezumat scurt „azi-noapte” în fiecare dimineață. Cât de util?"],
    kind: "scale",
    ends: USEFUL,
    required: true,
    for: ["teacher", "staff"],
  },
  {
    id: "game_trust",
    title: ["After the game: would you trust a machine to spot strangers?", "După joc: ai avea încredere într-o mașină să observe străinii?"],
    kind: "scale",
    ends: [["No", "Deloc"], ["Fully", "Complet"]],
    required: true,
    game: true,
  },
  {
    id: "refuse",
    title: ["What would make you say no to it?", "Ce te-ar face să spui nu?"],
    kind: "select",
    options: [
      ["Pupils' privacy", "Intimitatea elevilor"],
      ["False alarms", "Alarme false"],
      ["Cost", "Costul"],
      ["Hard to use", "Greu de folosit"],
      ["Nothing", "Nimic"],
      ["Something else", "Altceva"],
    ],
    required: true,
  },
  {
    id: "tell",
    title: ["Who must be told before it starts?", "Cine trebuie anunțat înainte să pornească?"],
    kind: "select",
    options: [
      ["Everyone, in writing", "Toată lumea, în scris"],
      ["Parents must agree first", "Părinții trebuie să fie de acord"],
      ["Staff only", "Doar personalul"],
      ["Nobody", "Nimeni"],
      ["Not sure", "Nu sunt sigur"],
    ],
    required: true,
  },
  {
    id: "decides",
    title: ["Who would decide to buy it?", "Cine ar decide să-l cumpere?"],
    kind: "select",
    options: [["The principal", "Directorul"], ["The school board", "Consiliul de administrație"], ["The city hall", "Primăria"], DONT_KNOW],
    required: true,
    for: ["teacher", "staff"],
  },
  {
    id: "comment",
    title: ["Anything else? (optional)", "Altceva? (opțional)"],
    kind: "text",
  },
];

/** Questions shown for a role, the answers given so far and whether the game was played. */
export function visibleQuestions(role: Role | "", answers: Record<string, string>, played = false): Question[] {
  if (!role) return [];
  return questions.filter(
    (q) =>
      (!q.for || q.for.includes(role)) &&
      (!q.when || q.when.in.includes(answers[q.when.id] ?? "")) &&
      (!q.game || played),
  );
}
