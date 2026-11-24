/**
 * Hand-authored scenarios for "Spot the stranger": who is in the scene, what each person does, where, at
 * what time, and what the cameras report.
 *
 * Methodology:
 * - Rounds 1-3 (2, 5, 20 remembered people): each scenario has a fixed cast with roles and ages, scripted
 *   behaviours (patrol, work, wait, cross, play, chat, sit, pace, visit) and one stranger, who is never
 *   in the line-up and whose actions match the alert texts. One scenario per round is picked per play.
 * - Bonus (10 people): spot the person about to cause harm from OBSERVABLE BEHAVIOUR only (closing in,
 *   fists, shoving, kicking, repeated hand-offs, following someone, hiding an object). Decoys show
 *   similar single cues (play-fighting, a parent running, a coach shouting, someone pacing on the phone,
 *   a teen dancing). Who the culprit is varies in age and look across scenarios, so appearance is never
 *   a cue. Facial expression is animation only; the system's readouts describe behaviour, not emotions.
 * - Positions are world coordinates [x, z] (x across, z from the back 0 to the camera 1).
 */

import { HAIR, SKIN, type Act, type Age, type Carry, type HairStyle, type Mood, type Outfit, type Person, type Acc } from "@/components/landing/spot-cast";

export type Line = [en: string, ro: string];
export type P2 = [number, number];
export type Box = [x0: number, x1: number, z0: number, z1: number];

export type Beh =
  | { k: "patrol"; pts: P2[]; pause?: number }
  | { k: "work"; area: Box; act?: Act }
  | { k: "wait"; at: P2; act?: Act; roam?: number }
  | { k: "cross"; from: string; to: string; gap?: [number, number] }
  | { k: "play"; area: Box }
  | { k: "chat"; at: P2; with: number }
  | { k: "sit"; seat: number; act?: Act }
  | { k: "pace"; a: P2; b: P2; act?: Act }
  | { k: "visit"; from: string; pts: P2[]; acts?: Act[] }
  // bonus behaviours
  | { k: "follow"; target: number; gap?: number }
  | { k: "dealer"; at: P2 }
  | { k: "buyer"; dealer: number; delay: number; from: string; to: string }
  | { k: "aggressor"; target: number; area: Box; kick?: P2 }
  | { k: "playfight"; with: number; area: Box }
  | { k: "rush"; from: string; to: number }
  | { k: "dance"; at: P2 };

export type Member = Person & { beh: Beh; mood?: Mood; away?: number };

export type Prop = { kind: "bin" | "backpack"; at: P2 };

export type Scenario = {
  id: string;
  /** 0, 1, 2 = rounds of 2, 5, 20 remembered people; 3 = bonus. */
  round: 0 | 1 | 2 | 3;
  setting: string;
  scale?: number;
  clock: [number, number];
  info: Line;
  cast: Member[];
  /** Index of the person to find: the stranger (rounds) or the culprit (bonus). Rounds: always the last. */
  target: number;
  alerts: [Line, Line, Line];
  /** Bonus: what the culprit did, for the result card. */
  story?: Line[];
  props?: Prop[];
};

/* ------------------------------------------------------------------ building people */

type Look = {
  skin: string;
  hair: string;
  style: HairStyle;
  top: string;
  bottom: string;
  outfit?: Outfit;
  acc?: Acc;
  carry?: Carry;
  beard?: Person["beard"];
  skirt?: boolean;
  scarf?: string;
};

let nextId = 0;
function M(name: string, role: Line, age: Age, look: Look, beh: Beh, mood: Mood = "calm", away?: number): Member {
  return { id: nextId++, name, role, age, outfit: "casual", ...look, beh, mood, away };
}

const S = SKIN;
const H = HAIR;
const NAVY = "#24324f";
const JEANS = "#2f4a6e";
const BLACK = "#1f2126";
const GREY = "#6b7079";
const BEIGE = "#bfa98a";

const GUARD = (name: string, skin: string, hair: string, beh: Beh, beard: Person["beard"] = "moustache", age: Age = "adult"): Member =>
  M(name, ["Guard", "Paznic"], age, { skin, hair, style: "short", top: NAVY, bottom: "#1c2333", outfit: "guard", acc: "cap", beard }, beh);

const R_PUPIL: Line = ["Pupil", "Elev"];
const R_PUPIL_F: Line = ["Pupil", "Elevă"];
const R_TEACHER: Line = ["Teacher", "Profesor"];
const R_TEACHER_F: Line = ["Teacher", "Profesoară"];
const R_CLEANER: Line = ["Cleaner", "Îngrijitoare"];
const R_PARENT: Line = ["Parent", "Părinte"];
const R_GRANDPA: Line = ["Grandfather", "Bunic"];
const R_GRANDMA: Line = ["Grandmother", "Bunică"];
const STRANGER: Line = ["Not in the list", "Nu e pe listă"];

/* ------------------------------------------------------------------ rounds 1-3 */

function r1Fence(): Scenario {
  return {
    id: "r1-fence", round: 0, setting: "yard-night", clock: [22, 10],
    info: ["Friday 22:10, back yard. The guard and the cleaner do their rounds; someone comes over the side fence.", "Vineri, 22:10, curtea din spate. Paznicul și îngrijitoarea își fac turele; cineva sare gardul lateral."],
    cast: [
      GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.15, 0.3], [0.5, 0.6], [0.85, 0.35], [0.5, 0.15]], pause: 2.5 }),
      M("Maria", R_CLEANER, "adult", { skin: S.fair, hair: H.auburn, style: "bun", top: "#9b6fb0", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.15, 0.6, 0.2, 0.7], act: "mop" }),
      M("?", STRANGER, "adult", { skin: S.tan, hair: H.black, style: "short", top: "#2b2f3a", bottom: BLACK, outfit: "hoodie", acc: "hood" }, { k: "visit", from: "rightBack", pts: [[0.8, 0.25], [0.25, 0.1], [0.6, 0.45]], acts: ["none", "handle", "none"] }, "furtive"),
    ],
    target: 2,
    alerts: [
      ["Motion at the side fence", "Mișcare la gardul lateral"],
      ["A person climbed over the fence", "O persoană a sărit gardul"],
      ["Tried the handle of the back door", "A încercat clanța ușii din spate"],
    ],
  };
}

function r1Corridor(): Scenario {
  return {
    id: "r1-corridor", round: 0, setting: "corridor-night", clock: [22, 5],
    info: ["Tuesday 22:05, ground-floor corridor. The caretaker and a cleaner finish late; a third person checks the classroom doors.", "Marți, 22:05, holul de la parter. Administratorul și o îngrijitoare termină târziu; o a treia persoană verifică ușile claselor."],
    cast: [
      M("Gheorghe", ["Caretaker", "Administrator"], "senior", { skin: S.light, hair: H.grey, style: "bald", top: "#3d5a6b", bottom: "#3d5a6b", outfit: "worker", acc: "beanie", beard: "moustache" }, { k: "patrol", pts: [[0.2, 0.5], [0.8, 0.55]], pause: 3 }),
      M("Elena", R_CLEANER, "adult", { skin: S.tan, hair: H.black, style: "ponytail", top: "#4f8f6f", bottom: "#2c3340", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.5, 0.9, 0.3, 0.8], act: "mop" }),
      M("?", STRANGER, "adult", { skin: S.fair, hair: H.blond, style: "buzz", top: "#4a4f2f", bottom: GREY, outfit: "casual", carry: "crowbar", beard: "stubble" }, { k: "visit", from: "left", pts: [[0.15, 0.06], [0.5, 0.06], [0.85, 0.08]], acts: ["handle", "handle", "handle"] }, "furtive"),
    ],
    target: 2,
    alerts: [
      ["Unknown person entered via the side exit", "Persoană necunoscută a intrat pe ieșirea laterală"],
      ["Object detected: crowbar", "Obiect detectat: rangă"],
      ["Tried 3 classroom door handles", "A încercat clanțele a 3 săli de clasă"],
    ],
  };
}

function r1Gate(): Scenario {
  return {
    id: "r1-gate", round: 0, setting: "gate-morning", clock: [7, 40],
    info: ["Monday 07:40, main gate, before classes. A teacher arrives early; someone says they have a delivery.", "Luni, 07:40, poarta principală, înainte de ore. O profesoară vine devreme; cineva spune că are o livrare."],
    cast: [
      M("Andreea", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "long", top: "#c0563f", bottom: NAVY, outfit: "teacher", carry: "folder" }, { k: "cross", from: "gate", to: "right", gap: [1, 3] }),
      GUARD("Vasile", S.tan, H.grey, { k: "wait", at: [0.42, 0.25], roam: 0.08 }, "moustache", "senior"),
      M("?", STRANGER, "adult", { skin: S.brown, hair: H.black, style: "short", top: "#e0a830", bottom: BLACK, outfit: "courier", acc: "cap", carry: "box" }, { k: "visit", from: "gate", pts: [[0.55, 0.3], [0.3, 0.55], [0.15, 0.2]], acts: ["none", "none", "none"] }, "furtive"),
    ],
    target: 2,
    alerts: [
      ["Unannounced “delivery” at the gate", "„Livrare” neanunțată la poartă"],
      ["Asked to be let into the staff room", "A cerut să intre în cancelarie"],
      ["No delivery on today's list", "Nicio livrare pe lista de azi"],
    ],
  };
}

function r2Pickup(): Scenario {
  return {
    id: "r2-pickup", round: 1, setting: "gate-afternoon", clock: [15, 30],
    info: ["Thursday 15:30, pick-up time at the gate. Parents and a grandfather wait; someone stays by the bicycle stand.", "Joi, 15:30, ora de plecare acasă. Părinții și un bunic așteaptă; cineva stă lângă rastelul de biciclete."],
    cast: [
      M("Nicolae", R_GRANDPA, "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#6b5a44", bottom: "#4a4136", outfit: "coat", acc: "glasses", carry: "cane", beard: "moustache" }, { k: "wait", at: [0.35, 0.4], roam: 0.04 }),
      M("Ioana", R_PARENT, "adult", { skin: S.light, hair: H.blond, style: "long", top: "#a8c6df", bottom: JEANS, outfit: "coat", carry: "bag" }, { k: "chat", at: [0.58, 0.45], with: 3 }),
      M("Luca", R_PUPIL, "child", { skin: S.light, hair: H.brown, style: "short", top: "#e85d4a", bottom: JEANS, outfit: "pupil", carry: "backpack" }, { k: "play", area: [0.25, 0.7, 0.4, 0.8] }, "happy"),
      M("Mihaela", R_TEACHER_F, "adult", { skin: S.tan, hair: H.dark, style: "bun", top: "#3f7f6f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "chat", at: [0.64, 0.42], with: 1 }),
      GUARD("Vasile", S.tan, H.grey, { k: "patrol", pts: [[0.4, 0.2], [0.6, 0.2]], pause: 3 }, "moustache", "senior"),
      M("?", STRANGER, "adult", { skin: S.light, hair: H.red, style: "short", top: "#3b3b3b", bottom: "#56503f", outfit: "worker", acc: "beanie", carry: "boltcutter", beard: "beard" }, { k: "visit", from: "rightBack", pts: [[0.86, 0.26], [0.8, 0.32], [0.88, 0.3]], acts: ["handle", "none", "handle"] }, "furtive"),
    ],
    target: 5,
    alerts: [
      ["Unknown person at the bicycle stand", "Persoană necunoscută la rastelul de biciclete"],
      ["Stayed 6 min, checking the locks", "A stat 6 minute și a verificat lacătele"],
      ["Object detected: bolt cutter", "Obiect detectat: clește de tăiat lacăte"],
    ],
  };
}

function r2Gym(): Scenario {
  return {
    id: "r2-gym", round: 1, setting: "yard-gym", clock: [19, 20],
    info: ["Wednesday 19:20, outside the gym after handball practice. Someone leaves a backpack by the gym door.", "Miercuri, 19:20, în fața sălii de sport, după antrenamentul de handbal. Cineva lasă un rucsac lângă ușa sălii."],
    cast: [
      M("Radu", ["PE coach", "Antrenor"], "adult", { skin: S.light, hair: H.black, style: "buzz", top: "#2a5fa8", bottom: "#2a5fa8", outfit: "sport" }, { k: "chat", at: [0.4, 0.3], with: 3 }),
      M("Ana", R_PUPIL_F, "teen", { skin: S.fair, hair: H.blond, style: "ponytail", top: "#d3436b", bottom: BLACK, outfit: "sport", carry: "sportsbag" }, { k: "cross", from: "doorR", to: "left", gap: [2, 4] }),
      M("Tudor", R_PUPIL, "teen", { skin: S.tan, hair: H.dark, style: "curly", top: "#f0a33a", bottom: GREY, outfit: "sport", carry: "sportsbag" }, { k: "cross", from: "doorR", to: "right", gap: [2, 5] }),
      M("Cristian", R_PARENT, "adult", { skin: S.light, hair: H.brown, style: "short", top: "#5b4a3a", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "chat", at: [0.46, 0.33], with: 0 }),
      M("Doina", R_CLEANER, "adult", { skin: S.light, hair: H.dark, style: "bun", top: "#8b6fae", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.6, 0.9, 0.3, 0.7], act: "mop" }),
      M("?", STRANGER, "teen", { skin: S.brown, hair: H.black, style: "short", top: "#3c6b3f", bottom: BLACK, outfit: "hoodie", acc: "headphones", carry: "backpack" }, { k: "visit", from: "left", pts: [[0.47, 0.08], [0.2, 0.5], [0.75, 0.6]], acts: ["none", "none", "none"] }, "furtive"),
    ],
    target: 5,
    props: [{ kind: "backpack", at: [0.53, 0.05] }],
    alerts: [
      ["Unknown person near the gym entrance", "Persoană necunoscută lângă intrarea în sala de sport"],
      ["Backpack left by the gym door", "Rucsac lăsat lângă ușa sălii de sport"],
      ["Person walked away without it", "Persoana a plecat fără el"],
    ],
  };
}

function r2Meeting(): Scenario {
  return {
    id: "r2-meeting", round: 1, setting: "corridor-evening", clock: [18, 50],
    info: ["Tuesday 18:50, parents' evening in the main corridor. Someone photographs the exits and the cameras.", "Marți, 18:50, ședința cu părinții, pe holul principal. Cineva fotografiază ieșirile și camerele."],
    cast: [
      M("Corina", R_TEACHER_F, "adult", { skin: S.fair, hair: H.red, style: "long", top: "#2f6d8f", bottom: BLACK, outfit: "teacher", carry: "folder" }, { k: "chat", at: [0.35, 0.4], with: 1 }),
      M("Alin", R_PARENT, "adult", { skin: S.light, hair: H.black, style: "short", top: "#7a8a5a", bottom: JEANS, outfit: "coat", beard: "beard" }, { k: "chat", at: [0.42, 0.42], with: 0 }),
      M("Simona", R_PARENT, "adult", { skin: S.tan, hair: H.dark, style: "curly", top: "#c45a8a", bottom: NAVY, outfit: "casual", skirt: true, carry: "bag" }, { k: "wait", at: [0.66, 0.35], act: "phone", roam: 0.03 }, "focused"),
      M("Dan", ["Principal", "Director"], "adult", { skin: S.light, hair: H.grey, style: "short", top: "#2b2f3a", bottom: "#2b2f3a", outfit: "suit", acc: "glasses" }, { k: "patrol", pts: [[0.2, 0.55], [0.75, 0.55]], pause: 2.5 }),
      M("Rodica", R_CLEANER, "senior", { skin: S.fair, hair: H.white, style: "bun", top: "#6f8fae", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.6, 0.9, 0.55, 0.85], act: "mop" }),
      M("?", STRANGER, "adult", { skin: S.deep, hair: H.black, style: "buzz", top: "#8f3a2f", bottom: GREY, outfit: "casual", acc: "glasses", carry: "camera" }, { k: "visit", from: "right", pts: [[0.85, 0.1], [0.15, 0.12], [0.5, 0.2]], acts: ["photo", "photo", "none"] }, "furtive"),
    ],
    target: 5,
    alerts: [
      ["Unknown person at the side exit", "Persoană necunoscută la ieșirea laterală"],
      ["Photographing the exits and the camera positions", "Fotografiază ieșirile și pozițiile camerelor"],
      ["Came back to the same spot twice", "S-a întors de două ori în același loc"],
    ],
  };
}

/* crowds for round 3: designed people, varied by age, look and role */

const KIDS: [string, Age, Look, boolean][] = [
  ["Matei", "child", { skin: S.fair, hair: H.blond, style: "short", top: "#e85d4a", bottom: JEANS, outfit: "pupil", carry: "backpack" }, false],
  ["Sara", "child", { skin: S.light, hair: H.brown, style: "ponytail", top: "#f0c23a", bottom: NAVY, outfit: "pupil", skirt: true, carry: "backpack" }, true],
  ["David", "child", { skin: S.brown, hair: H.black, style: "curly", top: "#3a9bd9", bottom: GREY, outfit: "pupil" }, false],
  ["Ilinca", "child", { skin: S.fair, hair: H.red, style: "long", top: "#b05ad1", bottom: JEANS, outfit: "pupil", carry: "backpack" }, true],
  ["Eric", "child", { skin: S.tan, hair: H.dark, style: "buzz", top: "#4cae6a", bottom: BLACK, outfit: "sport" }, false],
  ["Daria", "child", { skin: S.light, hair: H.blond, style: "bun", top: "#e86fa6", bottom: NAVY, outfit: "pupil", skirt: true }, true],
  ["Stefan", "teen", { skin: S.light, hair: H.dark, style: "short", top: "#5d5fd6", bottom: JEANS, outfit: "hoodie", acc: "headphones" }, false],
  ["Bianca", "teen", { skin: S.tan, hair: H.black, style: "long", top: "#3fbfb0", bottom: BLACK, outfit: "casual", carry: "phone" }, true],
  ["Rares", "teen", { skin: S.fair, hair: H.auburn, style: "curly", top: "#f4f4f4", bottom: GREY, outfit: "sport" }, false],
  ["Ioana", "teen", { skin: S.brown, hair: H.black, style: "bun", top: "#c0392b", bottom: NAVY, outfit: "casual", acc: "glasses" }, true],
  ["Victor", "teen", { skin: S.light, hair: H.blond, style: "short", top: "#2e7d4f", bottom: BEIGE, outfit: "hoodie" }, false],
  ["Alina", "teen", { skin: S.fair, hair: H.brown, style: "ponytail", top: "#f0a33a", bottom: JEANS, outfit: "casual", carry: "backpack" }, true],
  ["Mihnea", "child", { skin: S.deep, hair: H.black, style: "buzz", top: "#d9d14a", bottom: JEANS, outfit: "pupil", carry: "backpack" }, false],
  ["Irina", "child", { skin: S.light, hair: H.dark, style: "long", top: "#7fb3e0", bottom: GREY, outfit: "pupil" }, true],
];

function kid(i: number, beh: Beh, mood: Mood = "happy"): Member {
  const [name, age, look, girl] = KIDS[i % KIDS.length];
  return M(name, girl ? R_PUPIL_F : R_PUPIL, age, look, beh, mood);
}

function r3Break(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "play", area: [0.15, 0.55, 0.45, 0.9] }),
    kid(1, { k: "play", area: [0.15, 0.55, 0.45, 0.9] }),
    kid(2, { k: "play", area: [0.5, 0.9, 0.5, 0.9] }),
    kid(3, { k: "chat", at: [0.7, 0.3], with: 4 }),
    kid(5, { k: "chat", at: [0.76, 0.32], with: 3 }),
    kid(4, { k: "play", area: [0.5, 0.9, 0.5, 0.9] }),
    kid(6, { k: "wait", at: [0.2, 0.3], act: "phone", roam: 0.03 }, "focused"),
    kid(7, { k: "chat", at: [0.35, 0.22], with: 8 }),
    kid(8, { k: "chat", at: [0.42, 0.24], with: 7 }),
    kid(9, { k: "cross", from: "doorL", to: "doorR", gap: [1, 3] }),
    kid(10, { k: "cross", from: "doorR", to: "left", gap: [2, 4] }),
    kid(11, { k: "wait", at: [0.6, 0.62], act: "phone", roam: 0.02 }, "focused"),
    kid(12, { k: "play", area: [0.3, 0.7, 0.6, 0.92] }),
    kid(13, { k: "chat", at: [0.85, 0.6], with: 14 }),
    M("Gabriela", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "bun", top: "#7a4f8f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "chat", at: [0.9, 0.62], with: 13 }),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard", carry: "folder" }, { k: "patrol", pts: [[0.2, 0.5], [0.8, 0.45]], pause: 3 }),
    M("Florica", ["Teacher (retired, volunteer)", "Profesoară pensionară, voluntar"], "senior", { skin: S.fair, hair: H.white, style: "bun", top: "#a85a5a", bottom: "#4a4136", outfit: "coat", acc: "glasses" }, { k: "wait", at: [0.12, 0.6], roam: 0.02 }),
    GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.1, 0.2], [0.9, 0.2]], pause: 2 }),
    M("Maria", R_CLEANER, "adult", { skin: S.fair, hair: H.auburn, style: "bun", top: "#9b6fb0", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.6, 0.9, 0.15, 0.3], act: "mop" }),
    M("Petru", ["School nurse", "Asistent medical"], "adult", { skin: S.tan, hair: H.black, style: "short", top: "#3fa5a0", bottom: "#3fa5a0", outfit: "nurse" }, { k: "cross", from: "doorL", to: "doorR", gap: [3, 6] }),
    M("?", STRANGER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#4b4f57", bottom: BLACK, outfit: "hoodie", acc: "hood", beard: "stubble" }, { k: "visit", from: "leftBack", pts: [[0.1, 0.15], [0.5, 0.12], [0.88, 0.25]], acts: ["none", "none", "none"] }, "furtive"),
  ];
  return {
    id: "r3-break", round: 2, setting: "yard-day", clock: [10, 15], cast, target: cast.length - 1,
    info: ["Friday 10:15, morning break in the yard. Pupils play, teachers keep an eye on them; one adult keeps away from the cameras.", "Vineri, 10:15, pauza mare în curte. Elevii se joacă, profesorii îi supraveghează; un adult se ferește de camere."],
    alerts: [
      ["Unknown adult in the yard during the break", "Adult necunoscut în curte, în pauză"],
      ["Hood up, face turned away from CAM 01", "Glugă pe cap, fața întoarsă de la CAM 01"],
      ["Walked along the wall, avoiding the cameras", "A mers pe lângă zid, ferindu-se de camere"],
    ],
  };
}

function r3Arrival(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "cross", from: "gate", to: "leftBack", gap: [0.5, 2] }),
    kid(1, { k: "cross", from: "gate", to: "rightBack", gap: [0.5, 2] }),
    kid(2, { k: "cross", from: "gate", to: "left", gap: [1, 3] }),
    kid(3, { k: "cross", from: "gate", to: "right", gap: [1, 3] }),
    kid(4, { k: "play", area: [0.2, 0.6, 0.5, 0.9] }),
    kid(5, { k: "chat", at: [0.3, 0.35], with: 6 }),
    kid(6, { k: "chat", at: [0.36, 0.37], with: 5 }),
    kid(7, { k: "cross", from: "gate", to: "right", gap: [2, 4] }),
    kid(8, { k: "cross", from: "left", to: "gate", gap: [2, 5] }),
    kid(10, { k: "wait", at: [0.7, 0.6], act: "phone", roam: 0.02 }, "focused"),
    kid(12, { k: "cross", from: "gate", to: "leftBack", gap: [1, 3] }),
    M("Ioana", R_PARENT, "adult", { skin: S.light, hair: H.blond, style: "long", top: "#a8c6df", bottom: JEANS, outfit: "coat", carry: "bag" }, { k: "cross", from: "gate", to: "gate", gap: [1, 2] }),
    M("Radu", R_PARENT, "adult", { skin: S.tan, hair: H.black, style: "short", top: "#6b5a44", bottom: BLACK, outfit: "coat", beard: "beard", carry: "briefcase" }, { k: "chat", at: [0.58, 0.3], with: 13 }),
    M("Elisabeta", R_GRANDMA, "senior", { skin: S.fair, hair: H.white, style: "short", top: "#7d3b56", bottom: "#4a4136", outfit: "coat", acc: "headscarf", carry: "shopping" }, { k: "chat", at: [0.64, 0.32], with: 12 }),
    M("Nicolae", R_GRANDPA, "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#6b5a44", bottom: "#4a4136", outfit: "coat", acc: "glasses", carry: "cane", beard: "moustache" }, { k: "wait", at: [0.4, 0.22], roam: 0.02 }),
    M("Mihaela", R_TEACHER_F, "adult", { skin: S.tan, hair: H.dark, style: "bun", top: "#3f7f6f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "wait", at: [0.25, 0.6], roam: 0.05 }),
    M("Andreea", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "long", top: "#c0563f", bottom: NAVY, outfit: "teacher", carry: "folder" }, { k: "cross", from: "gate", to: "left", gap: [3, 5] }),
    M("Dan", ["Principal", "Director"], "adult", { skin: S.light, hair: H.grey, style: "short", top: "#2b2f3a", bottom: "#2b2f3a", outfit: "suit", acc: "glasses" }, { k: "wait", at: [0.5, 0.5], roam: 0.06 }),
    GUARD("Vasile", S.tan, H.grey, { k: "wait", at: [0.45, 0.15], roam: 0.05 }, "moustache", "senior"),
    M("Teodor", ["Driver, school bus", "Șofer, microbuz școlar"], "adult", { skin: S.light, hair: H.brown, style: "short", top: "#d4ec3a", bottom: NAVY, outfit: "staff", beard: "stubble" }, { k: "cross", from: "right", to: "gate", gap: [4, 7] }),
    M("?", STRANGER, "adult", { skin: S.tan, hair: H.auburn, style: "long", top: "#556b2f", bottom: BEIGE, outfit: "coat", acc: "glasses", carry: "bag" }, { k: "visit", from: "gate", pts: [[0.5, 0.4], [0.2, 0.3], [0.1, 0.12]], acts: ["none", "none", "none"] }, "furtive"),
  ];
  return {
    id: "r3-arrival", round: 2, setting: "gate-morning", clock: [7, 52], cast, target: cast.length - 1,
    info: ["Monday 07:52, everyone arrives. Pupils, parents and grandparents at the gate; one adult walks in with the crowd.", "Luni, 07:52, sosirea la școală. Elevi, părinți și bunici la poartă; un adult intră odată cu mulțimea."],
    alerts: [
      ["Unknown adult entered with the pupils", "Un adult necunoscut a intrat odată cu elevii"],
      ["Did not report to the office (visitor rule)", "Nu a trecut pe la secretariat (regula pentru vizitatori)"],
      ["Walking towards the back gate", "Se îndreaptă spre poarta din spate"],
    ],
  };
}

function r3Festival(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "play", area: [0.2, 0.8, 0.5, 0.9] }),
    kid(1, { k: "play", area: [0.2, 0.8, 0.5, 0.9] }),
    kid(2, { k: "play", area: [0.2, 0.8, 0.5, 0.9] }),
    kid(3, { k: "chat", at: [0.15, 0.25], with: 4 }),
    kid(5, { k: "chat", at: [0.2, 0.27], with: 3 }),
    kid(6, { k: "wait", at: [0.85, 0.3], act: "phone", roam: 0.02 }, "focused"),
    kid(7, { k: "cross", from: "left", to: "right", gap: [2, 4] }),
    kid(9, { k: "chat", at: [0.62, 0.5], with: 8 }),
    kid(11, { k: "chat", at: [0.68, 0.52], with: 7 }),
    M("Ioana", R_PARENT, "adult", { skin: S.light, hair: H.blond, style: "long", top: "#a8c6df", bottom: JEANS, outfit: "casual", carry: "bag" }, { k: "chat", at: [0.4, 0.35], with: 10 }),
    M("Alin", R_PARENT, "adult", { skin: S.light, hair: H.black, style: "short", top: "#7a8a5a", bottom: JEANS, outfit: "casual", beard: "beard" }, { k: "chat", at: [0.46, 0.36], with: 9 }),
    M("Simona", R_PARENT, "adult", { skin: S.tan, hair: H.dark, style: "curly", top: "#c45a8a", bottom: NAVY, outfit: "casual", skirt: true }, { k: "wait", at: [0.3, 0.6], act: "photo", roam: 0.03 }, "happy"),
    M("Elisabeta", R_GRANDMA, "senior", { skin: S.fair, hair: H.white, style: "short", top: "#7d3b56", bottom: "#4a4136", outfit: "coat", acc: "headscarf" }, { k: "wait", at: [0.12, 0.55], roam: 0.01 }),
    M("Nicolae", R_GRANDPA, "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#6b5a44", bottom: "#4a4136", outfit: "coat", acc: "glasses", carry: "cane", beard: "moustache" }, { k: "cross", from: "left", to: "right", gap: [3, 6] }),
    M("Gabriela", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "bun", top: "#7a4f8f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "patrol", pts: [[0.25, 0.4], [0.75, 0.4]], pause: 3 }),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard" }, { k: "wait", at: [0.55, 0.2], act: "gesture", roam: 0.02 }, "happy"),
    M("Corina", R_TEACHER_F, "adult", { skin: S.fair, hair: H.red, style: "long", top: "#2f6d8f", bottom: BLACK, outfit: "teacher" }, { k: "chat", at: [0.5, 0.2], with: 15 }),
    GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.1, 0.3], [0.9, 0.3]], pause: 2 }),
    M("Dan", ["Principal", "Director"], "adult", { skin: S.light, hair: H.grey, style: "short", top: "#2b2f3a", bottom: "#2b2f3a", outfit: "suit", acc: "glasses" }, { k: "patrol", pts: [[0.3, 0.7], [0.7, 0.7]], pause: 3 }),
    M("Doina", R_CLEANER, "adult", { skin: S.light, hair: H.dark, style: "bun", top: "#8b6fae", bottom: "#3a3550", outfit: "cleaner" }, { k: "cross", from: "doorL", to: "doorR", gap: [3, 6] }),
    M("?", STRANGER, "senior", { skin: S.light, hair: H.grey, style: "short", top: "#5e3a2a", bottom: "#3a3a3a", outfit: "worker", acc: "cap", carry: "canister", beard: "beard" }, { k: "visit", from: "rightBack", pts: [[0.8, 0.08], [0.88, 0.2], [0.72, 0.1]], acts: ["handle", "none", "handle"] }, "furtive"),
  ];
  return {
    id: "r3-festival", round: 2, setting: "yard-festival", clock: [18, 35], cast, target: cast.length - 1,
    info: ["Saturday 18:35, the school's autumn fair in the yard. Families, teachers and the guard; someone heads for the boiler room.", "Sâmbătă, 18:35, târgul de toamnă în curtea școlii. Familii, profesori și paznicul; cineva se duce spre centrala termică."],
    alerts: [
      ["Unknown person near the boiler room", "Persoană necunoscută lângă centrala termică"],
      ["Object detected: fuel canister", "Obiect detectat: bidon de combustibil"],
      ["Boiler room door forced", "Ușa centralei a fost forțată"],
    ],
  };
}

/* ------------------------------------------------------------------ bonus: behaviour */

function bGymBack(): Scenario {
  // the dealer is a teen boy; buyers come one by one
  const cast: Member[] = [
    M("Robert", R_PUPIL, "teen", { skin: S.light, hair: H.dark, style: "short", top: "#3d4a5c", bottom: JEANS, outfit: "hoodie" }, { k: "dealer", at: [0.72, 0.28] }, "furtive"),
    kid(6, { k: "buyer", dealer: 0, delay: 2, from: "left", to: "left" }, "calm"),
    kid(10, { k: "buyer", dealer: 0, delay: 9, from: "right", to: "left" }, "calm"),
    kid(8, { k: "buyer", dealer: 0, delay: 16, from: "left", to: "right" }, "calm"),
    kid(0, { k: "playfight", with: 5, area: [0.15, 0.5, 0.45, 0.85] }, "happy"),
    kid(4, { k: "playfight", with: 4, area: [0.15, 0.5, 0.45, 0.85] }, "happy"),
    M("Radu", ["PE coach", "Antrenor"], "adult", { skin: S.light, hair: H.black, style: "buzz", top: "#2a5fa8", bottom: "#2a5fa8", outfit: "sport" }, { k: "wait", at: [0.4, 0.22], act: "shout", roam: 0.02 }, "loud"),
    kid(11, { k: "dance", at: [0.82, 0.62] }, "excited"),
    kid(9, { k: "pace", a: [0.3, 0.3], b: [0.5, 0.35], act: "call" }, "calm"),
    kid(13, { k: "wait", at: [0.15, 0.3], act: "phone", roam: 0.02 }, "focused"),
  ];
  return {
    id: "b-gym", round: 3, setting: "yard-gym", scale: 1.2, clock: [16, 40], cast, target: 0,
    info: ["Thursday 16:40, behind the gym after classes. Pupils hang around; one of them meets several others, one at a time.", "Joi, 16:40, în spatele sălii de sport, după ore. Elevii stau pe afară; unul dintre ei se întâlnește cu mai mulți, pe rând."],
    alerts: [
      ["CAM 03 · 10 people in view", "CAM 03 · 10 persoane în cadru"],
      ["Repeated short contacts in one spot", "Contacte scurte repetate în același loc"],
      ["Same person in repeated contacts", "Aceeași persoană în contacte repetate"],
    ],
    story: [
      ["Hand-offs with different pupils, one at a time", "Schimburi de obiecte cu elevi diferiți, pe rând"],
      ["Looked around before each one", "S-a uitat în jur înainte de fiecare"],
      ["Counted cash between hand-offs", "A numărat bani între schimburi"],
    ],
  };
}

function bCorridor(): Scenario {
  // the aggressor is a teen girl closing in on a younger girl
  const cast: Member[] = [
    M("Larisa", R_PUPIL_F, "teen", { skin: S.tan, hair: H.black, style: "ponytail", top: "#b0353a", bottom: BLACK, outfit: "casual" }, { k: "aggressor", target: 1, area: [0.4, 0.8, 0.3, 0.7] }, "hostile"),
    kid(3, { k: "wait", at: [0.62, 0.45], act: "phone", roam: 0.01 }, "focused"),
    kid(2, { k: "playfight", with: 3, area: [0.1, 0.4, 0.5, 0.85] }, "happy"),
    kid(12, { k: "playfight", with: 2, area: [0.1, 0.4, 0.5, 0.85] }, "happy"),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard", carry: "folder" }, { k: "cross", from: "doorL", to: "doorR", gap: [3, 6] }),
    kid(7, { k: "dance", at: [0.2, 0.3] }, "excited"),
    kid(10, { k: "pace", a: [0.75, 0.2], b: [0.9, 0.3], act: "call" }, "calm"),
    kid(9, { k: "chat", at: [0.4, 0.25], with: 8 }),
    kid(5, { k: "chat", at: [0.46, 0.27], with: 7 }),
    M("Rodica", R_CLEANER, "senior", { skin: S.fair, hair: H.white, style: "bun", top: "#6f8fae", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.1, 0.4, 0.2, 0.4], act: "mop" }),
  ];
  return {
    id: "b-corridor", round: 3, setting: "corridor-evening", scale: 1.2, clock: [11, 5], cast, target: 0,
    info: ["Wednesday 11:05, corridor during the break. Busy and loud; somewhere a fight is about to start.", "Miercuri, 11:05, holul în pauză. Aglomerat și gălăgios; undeva e pe cale să înceapă o bătaie."],
    alerts: [
      ["CAM 05 · break, 10 people in view", "CAM 05 · pauză, 10 persoane în cadru"],
      ["Fast approach detected", "Apropiere rapidă detectată"],
      ["Physical contact: push", "Contact fizic: împingere"],
    ],
    story: [
      ["Paced, then closed in on a younger pupil", "S-a plimbat agitat, apoi s-a apropiat de o elevă mai mică"],
      ["Fists clenched, stood right in front of her", "Cu pumnii strânși, s-a oprit chiar în fața ei"],
      ["Pushed her against the wall", "A împins-o spre perete"],
    ],
  };
}

function bGate(): Scenario {
  // an adult man follows a pupil closely after classes
  const cast: Member[] = [
    M("?", ["Adult, not a parent on the list", "Adult, nu e părinte pe listă"], "adult", { skin: S.fair, hair: H.brown, style: "short", top: "#4b5563", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "follow", target: 1, gap: 0.09 }, "furtive"),
    kid(1, { k: "play", area: [0.2, 0.8, 0.35, 0.85] }, "calm"),
    M("Ioana", R_PARENT, "adult", { skin: S.light, hair: H.blond, style: "long", top: "#a8c6df", bottom: JEANS, outfit: "coat", carry: "bag" }, { k: "rush", from: "gate", to: 4 }, "anxious"),
    M("Nicolae", R_GRANDPA, "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#6b5a44", bottom: "#4a4136", outfit: "coat", acc: "glasses", carry: "cane", beard: "moustache" }, { k: "wait", at: [0.3, 0.3], roam: 0.02 }),
    kid(0, { k: "wait", at: [0.66, 0.55], roam: 0.03 }),
    kid(2, { k: "playfight", with: 6, area: [0.55, 0.9, 0.55, 0.9] }, "happy"),
    kid(4, { k: "playfight", with: 5, area: [0.55, 0.9, 0.55, 0.9] }, "happy"),
    kid(7, { k: "pace", a: [0.15, 0.6], b: [0.3, 0.7], act: "call" }),
    GUARD("Vasile", S.tan, H.grey, { k: "wait", at: [0.45, 0.15], roam: 0.04 }, "moustache", "senior"),
    M("Mihaela", R_TEACHER_F, "adult", { skin: S.tan, hair: H.dark, style: "bun", top: "#3f7f6f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "patrol", pts: [[0.2, 0.45], [0.8, 0.45]], pause: 2 }),
  ];
  return {
    id: "b-gate", round: 3, setting: "gate-afternoon", scale: 1.2, clock: [13, 20], cast, target: 0,
    info: ["Friday 13:20, classes are over. Parents arrive, pupils wait or play; one adult stays close behind a pupil.", "Vineri, 13:20, s-au terminat orele. Vin părinții, elevii așteaptă sau se joacă; un adult stă mereu aproape, în spatele unui elev."],
    alerts: [
      ["CAM 01 · pick-up, 10 people in view", "CAM 01 · plecarea acasă, 10 persoane în cadru"],
      ["Same two tracks moving together", "Două trasee care se mișcă împreună"],
      ["Distance kept under 2 m for 40 s", "Distanță sub 2 m timp de 40 s"],
    ],
    story: [
      ["Followed the same pupil around the yard", "A urmărit aceeași elevă prin curte"],
      ["Stayed close behind, changed direction with her", "A stat mereu aproape, în spatele ei, și a schimbat direcția odată cu ea"],
      ["Not on the list of people who pick up pupils", "Nu e pe lista celor care iau copiii de la școală"],
    ],
  };
}

function bBusStop(): Scenario {
  // the aggressor is a man in his sixties; he kicks a bin, then squares up to a teen
  const cast: Member[] = [
    M("?", ["Adult at the bus stop", "Adult în stația de autobuz"], "senior", { skin: S.light, hair: H.grey, style: "short", top: "#5a4636", bottom: "#3a3a3a", outfit: "coat", beard: "beard" }, { k: "aggressor", target: 1, area: [0.35, 0.8, 0.35, 0.75], kick: [0.55, 0.3] }, "hostile"),
    kid(6, { k: "wait", at: [0.62, 0.5], act: "phone", roam: 0.01 }, "focused"),
    kid(11, { k: "dance", at: [0.2, 0.6] }, "excited"),
    M("Ana", ["Commuter", "Navetistă"], "adult", { skin: S.tan, hair: H.dark, style: "long", top: "#c97b3a", bottom: JEANS, outfit: "casual", carry: "bag" }, { k: "pace", a: [0.7, 0.3], b: [0.88, 0.4], act: "call" }),
    M("Elisabeta", R_GRANDMA, "senior", { skin: S.fair, hair: H.white, style: "short", top: "#7d3b56", bottom: "#4a4136", outfit: "coat", acc: "headscarf", carry: "shopping" }, { k: "sit", seat: 0 }),
    M("Mihai", ["Worker", "Muncitor"], "adult", { skin: S.brown, hair: H.black, style: "buzz", top: "#e0a830", bottom: "#2c3340", outfit: "worker" }, { k: "sit", seat: 2, act: "phone" }, "focused"),
    kid(2, { k: "playfight", with: 7, area: [0.1, 0.45, 0.6, 0.85] }, "happy"),
    kid(4, { k: "playfight", with: 6, area: [0.1, 0.45, 0.6, 0.85] }, "happy"),
    M("Teodor", ["Runner", "Alergător"], "adult", { skin: S.light, hair: H.brown, style: "short", top: "#4cae6a", bottom: BLACK, outfit: "sport" }, { k: "cross", from: "left", to: "right", gap: [3, 5] }, "calm"),
    M("Irina", ["Student", "Studentă"], "teen", { skin: S.fair, hair: H.red, style: "long", top: "#5d5fd6", bottom: JEANS, outfit: "casual", carry: "book" }, { k: "sit", seat: 3, act: "read" }, "focused"),
  ];
  return {
    id: "b-bus", round: 3, setting: "busstop", clock: [14, 5], cast, target: 0,
    props: [{ kind: "bin", at: [0.55, 0.3] }],
    info: ["Tuesday 14:05, the bus stop next to the school. The bus is late; one adult is getting more and more restless.", "Marți, 14:05, stația de lângă școală. Autobuzul întârzie; un adult devine tot mai agitat."],
    alerts: [
      ["CAM 11 · bus stop, 10 people in view", "CAM 11 · stație, 10 persoane în cadru"],
      ["Object hit: litter bin", "Obiect lovit: coș de gunoi"],
      ["Fast approach towards a pupil", "Apropiere rapidă de un elev"],
    ],
    story: [
      ["Kicked the litter bin", "A lovit cu piciorul coșul de gunoi"],
      ["Closed in on a pupil, fists clenched", "S-a apropiat de un elev cu pumnii strânși"],
      ["Squared up and pushed", "S-a postat în fața lui și l-a împins"],
    ],
  };
}

function bPark(): Scenario {
  // the dealer is a woman in her thirties at a bench in the park next to the school
  const cast: Member[] = [
    M("?", ["Adult in the park", "Adultă în parc"], "adult", { skin: S.brown, hair: H.black, style: "bun", top: "#2f3a4a", bottom: BLACK, outfit: "casual", acc: "glasses", carry: "bag" }, { k: "dealer", at: [0.7, 0.32] }, "furtive"),
    kid(7, { k: "buyer", dealer: 0, delay: 2, from: "left", to: "leftBack" }, "calm"),
    kid(10, { k: "buyer", dealer: 0, delay: 8, from: "rightBack", to: "right" }, "calm"),
    M("Ilie", ["Pensioner", "Pensionar"], "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#556b2f", bottom: "#4a4136", outfit: "coat", carry: "cane", beard: "moustache" }, { k: "buyer", dealer: 0, delay: 15, from: "left", to: "right" }, "calm"),
    kid(1, { k: "play", area: [0.15, 0.5, 0.5, 0.85] }, "happy"),
    kid(3, { k: "play", area: [0.15, 0.5, 0.5, 0.85] }, "happy"),
    M("Cristian", R_PARENT, "adult", { skin: S.light, hair: H.brown, style: "short", top: "#5b4a3a", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "sit", seat: 1, act: "phone" }, "focused"),
    M("Teodor", ["Runner", "Alergător"], "adult", { skin: S.light, hair: H.brown, style: "short", top: "#4cae6a", bottom: BLACK, outfit: "sport" }, { k: "cross", from: "right", to: "left", gap: [3, 5] }),
    kid(8, { k: "dance", at: [0.45, 0.4] }, "excited"),
    M("Maria", ["Parent", "Mamă"], "adult", { skin: S.fair, hair: H.auburn, style: "long", top: "#c45a8a", bottom: NAVY, outfit: "coat" }, { k: "rush", from: "leftBack", to: 4 }, "anxious"),
  ];
  return {
    id: "b-park", round: 3, setting: "park", clock: [17, 30], cast, target: 0,
    info: ["Monday 17:30, the park next to the school. Children play, people pass through; at one bench, people stop for a few seconds.", "Luni, 17:30, parcul de lângă școală. Copiii se joacă, oamenii trec; la o bancă, unii se opresc câteva secunde."],
    alerts: [
      ["CAM 14 · park, 10 people in view", "CAM 14 · parc, 10 persoane în cadru"],
      ["Short contacts at the same bench", "Contacte scurte la aceeași bancă"],
      ["Same person in repeated contacts", "Aceeași persoană în contacte repetate"],
    ],
    story: [
      ["Hand-offs with different people, two of them pupils", "Schimburi de obiecte cu persoane diferite, doi dintre ei elevi"],
      ["Looked around before each one", "S-a uitat în jur înainte de fiecare"],
      ["Took cash, counted it", "A primit bani și i-a numărat"],
    ],
  };
}

/* ------------------------------------------------------------------ catalogue */

const BUILDERS: (() => Scenario)[][] = [
  [r1Fence, r1Corridor, r1Gate],
  [r2Pickup, r2Gym, r2Meeting],
  [r3Break, r3Arrival, r3Festival],
  [bGymBack, bCorridor, bGate, bBusStop, bPark],
];

/** A fresh copy of one scenario for round `r` (0-3), avoiding `avoid` when another one exists. */
export function pickScenario(r: number, avoid?: string): Scenario {
  const list = BUILDERS[r];
  const options = list.length > 1 && avoid ? list.filter((b) => b().id !== avoid) : list;
  const s = options[Math.floor(Math.random() * options.length)]();
  s.cast.forEach((m, i) => (m.id = i));
  return s;
}

/** All scenarios (for tests): one fresh copy of each. */
export function allScenarios(): Scenario[] {
  return BUILDERS.flat().map((b) => {
    const s = b();
    s.cast.forEach((m, i) => (m.id = i));
    return s;
  });
}

/** A fresh copy of the scenario with this id (tests), or null. */
export function scenarioById(id: string): Scenario | null {
  return allScenarios().find((s) => s.id === id) ?? null;
}
