/**
 * Hand-authored scenarios for "Spot the stranger": who is in the scene, what each person does, where and
 * at what time.
 *
 * Methodology:
 * - Pool 0 (round 1: 3 remembered people) and pool 1 (round 2: 14 remembered people): an ordinary scene
 *   and one ordinary person who is simply not in the remembered list. No tools, no hoods, no suspicious
 *   behaviour: the point is how hard one unknown face gets to spot as the crowd grows.
 * - Pool 2 (rounds 3-5, about 10 people): spot the person about to cause harm from OBSERVABLE BEHAVIOUR
 *   (closing in, fists, a push, a kick, repeated hand-offs, following someone, trying doors, avoiding the
 *   cameras). Each scenario lists the behaviour cues the system can see (`cues`, with a weight) and the
 *   harmful act (`act`); the system alerts when the weights add up to ALERT_SCORE. Decoys show similar
 *   single cues (play-fighting, a parent rushing, a coach shouting, someone pacing on the phone, a teen
 *   dancing, a teen with the hood up), and who the culprit is varies in age and look, so appearance is
 *   never the cue. Expressions are animation only; the readouts describe behaviour, not emotions.
 * - Positions are world coordinates [x, z] (x across, z from the back 0 to the camera 1).
 */

import { HAIR, SKIN, type Acc, type Act, type Age, type Carry, type HairStyle, type Mood, type Outfit, type Person } from "@/components/landing/spot-cast";

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
  // harmful-action rounds
  | { k: "prowl"; from: string; pts: P2[]; acts: Act[] }
  | { k: "follow"; target: number; gap?: number }
  | { k: "dealer"; at: P2 }
  | { k: "buyer"; dealer: number; delay: number; from: string; to: string }
  | { k: "aggressor"; target: number; area: Box; kick?: P2 }
  | { k: "playfight"; with: number; area: Box }
  | { k: "rush"; from: string; to: number }
  | { k: "dance"; at: P2 };

export type Member = Person & { beh: Beh; mood?: Mood };

export type Prop = { kind: "bin"; at: P2 };

/**
 * Behaviour events the scene reports for the culprit: restless, kick, close, square, push (aggressor);
 * handoff1..3, count (dealer); follow10, follow20, grab (follower); handle1..3, tool, avoid, force (prowler).
 */
export type Cue = { line: Line; w: number };

export type Scenario = {
  id: string;
  /** 0 = round 1 (3 remembered), 1 = round 2 (14 remembered), 2 = harmful-action pool (rounds 3-5). */
  pool: 0 | 1 | 2;
  setting: string;
  scale?: number;
  clock: [number, number];
  info: Line;
  cast: Member[];
  /** Index of the person to find: the unknown person (pools 0-1, always the last) or the culprit. */
  target: number;
  /** Harmful rounds: cues the system sees, by event id, and the harmful act (event id + noun). */
  cues?: Record<string, Cue>;
  act?: { id: string; noun: Line };
  props?: Prop[];
};

/** Sum of cue weights at which the system raises its alert. */
export const ALERT_SCORE = 2;

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
function M(name: string, role: Line, age: Age, look: Look, beh: Beh, mood: Mood = "calm"): Member {
  return { id: nextId++, name, role, age, outfit: "casual", ...look, beh, mood };
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
const UNKNOWN: Line = ["Not in the list", "Nu e pe listă"];

/* crowds: designed people, varied by age, look and role */

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

function kid(i: number, beh: Beh, mood: Mood = "happy", look: Partial<Look> = {}): Member {
  const [name, age, base, girl] = KIDS[i % KIDS.length];
  return M(name, girl ? R_PUPIL_F : R_PUPIL, age, { ...base, ...look }, beh, mood);
}

/* ------------------------------------------------------------------ round 1: 3 remembered + 1 unknown */

function r1Yard(): Scenario {
  const cast: Member[] = [
    GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.15, 0.3], [0.5, 0.6], [0.85, 0.35], [0.5, 0.15]], pause: 2.5 }),
    M("Maria", R_CLEANER, "adult", { skin: S.fair, hair: H.auburn, style: "bun", top: "#9b6fb0", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.15, 0.6, 0.2, 0.7], act: "mop" }),
    M("Gheorghe", ["Caretaker", "Administrator"], "senior", { skin: S.light, hair: H.grey, style: "bald", top: "#3d5a6b", bottom: "#3d5a6b", outfit: "worker", acc: "beanie", beard: "moustache" }, { k: "cross", from: "doorL", to: "doorR", gap: [2, 4] }),
    M("?", UNKNOWN, "adult", { skin: S.tan, hair: H.black, style: "short", top: "#7a5a3a", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "pace", a: [0.62, 0.45], b: [0.8, 0.6] }),
  ];
  return {
    id: "r1-yard", pool: 0, setting: "yard-night", clock: [21, 40], cast, target: cast.length - 1,
    info: ["Friday 21:40, the school yard after the evening clean-up. The guard, the cleaner and the caretaker — and one person not on the list.", "Vineri, 21:40, curtea școlii după curățenia de seară. Paznicul, îngrijitoarea și administratorul — și o persoană care nu e pe listă."],
  };
}

function r1Corridor(): Scenario {
  const cast: Member[] = [
    M("Elena", R_CLEANER, "adult", { skin: S.tan, hair: H.black, style: "ponytail", top: "#4f8f6f", bottom: "#2c3340", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.5, 0.9, 0.3, 0.8], act: "mop" }),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard", carry: "folder" }, { k: "cross", from: "doorM", to: "right", gap: [2, 4] }),
    M("Gheorghe", ["Caretaker", "Administrator"], "senior", { skin: S.light, hair: H.grey, style: "bald", top: "#3d5a6b", bottom: "#3d5a6b", outfit: "worker", acc: "beanie", beard: "moustache" }, { k: "patrol", pts: [[0.2, 0.5], [0.8, 0.55]], pause: 3 }),
    M("?", UNKNOWN, "adult", { skin: S.fair, hair: H.blond, style: "long", top: "#c45a5a", bottom: NAVY, outfit: "coat", carry: "bag" }, { k: "wait", at: [0.3, 0.35], act: "phone", roam: 0.04 }, "focused"),
  ];
  return {
    id: "r1-corridor", pool: 0, setting: "corridor-evening", clock: [19, 10], cast, target: cast.length - 1,
    info: ["Tuesday 19:10, the ground-floor corridor after classes. A teacher leaves late, the cleaner and the caretaker are working — and one person is not on the list.", "Marți, 19:10, holul de la parter după ore. Un profesor pleacă târziu, îngrijitoarea și administratorul lucrează — și o persoană nu e pe listă."],
  };
}

function r1Gate(): Scenario {
  const cast: Member[] = [
    M("Andreea", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "long", top: "#c0563f", bottom: NAVY, outfit: "teacher", carry: "folder" }, { k: "cross", from: "gate", to: "right", gap: [1, 3] }),
    GUARD("Vasile", S.tan, H.grey, { k: "wait", at: [0.42, 0.25], roam: 0.08 }, "moustache", "senior"),
    M("Ioana", R_PARENT, "adult", { skin: S.light, hair: H.blond, style: "long", top: "#a8c6df", bottom: JEANS, outfit: "coat", carry: "bag" }, { k: "cross", from: "gate", to: "gate", gap: [1, 2] }),
    M("?", UNKNOWN, "adult", { skin: S.brown, hair: H.black, style: "short", top: "#4b6a8f", bottom: BLACK, outfit: "suit", carry: "briefcase" }, { k: "cross", from: "left", to: "gate", gap: [1, 2] }),
  ];
  return {
    id: "r1-gate", pool: 0, setting: "gate-morning", clock: [7, 40], cast, target: cast.length - 1,
    info: ["Monday 07:40, the main gate before classes. A teacher, the guard and a parent — and one person not on the list.", "Luni, 07:40, poarta principală înainte de ore. O profesoară, paznicul și un părinte — și o persoană care nu e pe listă."],
  };
}

/* ------------------------------------------------------------------ round 2: 14 remembered + 1 unknown */

function r2Break(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "play", area: [0.15, 0.55, 0.45, 0.9] }),
    kid(1, { k: "play", area: [0.15, 0.55, 0.45, 0.9] }),
    kid(2, { k: "play", area: [0.5, 0.9, 0.5, 0.9] }),
    kid(3, { k: "chat", at: [0.7, 0.3], with: 4 }),
    kid(5, { k: "chat", at: [0.76, 0.32], with: 3 }),
    kid(6, { k: "wait", at: [0.2, 0.3], act: "phone", roam: 0.03 }, "focused"),
    kid(7, { k: "chat", at: [0.35, 0.22], with: 7 }),
    kid(8, { k: "chat", at: [0.42, 0.24], with: 6 }),
    kid(12, { k: "play", area: [0.3, 0.7, 0.6, 0.92] }),
    M("Gabriela", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "bun", top: "#7a4f8f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "wait", at: [0.88, 0.62], roam: 0.03 }),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard", carry: "folder" }, { k: "patrol", pts: [[0.2, 0.5], [0.8, 0.45]], pause: 3 }),
    M("Florica", ["Retired teacher, volunteer", "Profesoară pensionară, voluntar"], "senior", { skin: S.fair, hair: H.white, style: "bun", top: "#a85a5a", bottom: "#4a4136", outfit: "coat", acc: "glasses" }, { k: "wait", at: [0.12, 0.6], roam: 0.02 }),
    GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.1, 0.2], [0.9, 0.2]], pause: 2 }),
    M("Maria", R_CLEANER, "adult", { skin: S.fair, hair: H.auburn, style: "bun", top: "#9b6fb0", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.6, 0.9, 0.15, 0.3], act: "mop" }),
    M("?", UNKNOWN, "adult", { skin: S.tan, hair: H.dark, style: "curly", top: "#d08a3a", bottom: JEANS, outfit: "casual", carry: "bag" }, { k: "patrol", pts: [[0.3, 0.4], [0.6, 0.55], [0.45, 0.7]], pause: 2.5 }),
  ];
  return {
    id: "r2-break", pool: 1, setting: "yard-day", clock: [10, 15], cast, target: cast.length - 1,
    info: ["Friday 10:15, the morning break in the yard. Pupils, teachers, the guard and the cleaner — and one adult not on the list.", "Vineri, 10:15, pauza mare în curte. Elevi, profesori, paznicul și îngrijitoarea — și un adult care nu e pe listă."],
  };
}

function r2Arrival(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "cross", from: "gate", to: "leftBack", gap: [0.5, 2] }),
    kid(1, { k: "cross", from: "gate", to: "rightBack", gap: [0.5, 2] }),
    kid(2, { k: "cross", from: "gate", to: "left", gap: [1, 3] }),
    kid(4, { k: "play", area: [0.2, 0.6, 0.5, 0.9] }),
    kid(5, { k: "chat", at: [0.3, 0.35], with: 5 }),
    kid(6, { k: "chat", at: [0.36, 0.37], with: 4 }),
    kid(10, { k: "wait", at: [0.7, 0.6], act: "phone", roam: 0.02 }, "focused"),
    M("Radu", R_PARENT, "adult", { skin: S.tan, hair: H.black, style: "short", top: "#6b5a44", bottom: BLACK, outfit: "coat", beard: "beard", carry: "briefcase" }, { k: "chat", at: [0.58, 0.3], with: 8 }),
    M("Elisabeta", R_GRANDMA, "senior", { skin: S.fair, hair: H.white, style: "short", top: "#7d3b56", bottom: "#4a4136", outfit: "coat", acc: "headscarf", carry: "shopping" }, { k: "chat", at: [0.64, 0.32], with: 7 }),
    M("Nicolae", R_GRANDPA, "senior", { skin: S.fair, hair: H.white, style: "bald", top: "#6b5a44", bottom: "#4a4136", outfit: "coat", acc: "glasses", carry: "cane", beard: "moustache" }, { k: "wait", at: [0.4, 0.22], roam: 0.02 }),
    M("Mihaela", R_TEACHER_F, "adult", { skin: S.tan, hair: H.dark, style: "bun", top: "#3f7f6f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "wait", at: [0.25, 0.6], roam: 0.05 }),
    M("Dan", ["Principal", "Director"], "adult", { skin: S.light, hair: H.grey, style: "short", top: "#2b2f3a", bottom: "#2b2f3a", outfit: "suit", acc: "glasses" }, { k: "wait", at: [0.5, 0.5], roam: 0.06 }),
    GUARD("Vasile", S.tan, H.grey, { k: "wait", at: [0.45, 0.15], roam: 0.05 }, "moustache", "senior"),
    M("Teodor", ["Driver, school bus", "Șofer, microbuz școlar"], "adult", { skin: S.light, hair: H.brown, style: "short", top: "#d4ec3a", bottom: NAVY, outfit: "staff", beard: "stubble" }, { k: "cross", from: "right", to: "gate", gap: [4, 7] }),
    M("?", UNKNOWN, "adult", { skin: S.light, hair: H.auburn, style: "long", top: "#556b2f", bottom: BEIGE, outfit: "coat", acc: "glasses", carry: "bag" }, { k: "cross", from: "gate", to: "right", gap: [1, 2] }),
  ];
  return {
    id: "r2-arrival", pool: 1, setting: "gate-morning", clock: [7, 52], cast, target: cast.length - 1,
    info: ["Monday 07:52, arrival at school. Pupils, parents, grandparents and staff at the gate — and one adult not on the list.", "Luni, 07:52, sosirea la școală. Elevi, părinți, bunici și personal la poartă — și un adult care nu e pe listă."],
  };
}

function r2Fair(): Scenario {
  const cast: Member[] = [
    kid(0, { k: "play", area: [0.2, 0.8, 0.5, 0.9] }),
    kid(1, { k: "play", area: [0.2, 0.8, 0.5, 0.9] }),
    kid(3, { k: "chat", at: [0.15, 0.25], with: 3 }),
    kid(5, { k: "chat", at: [0.2, 0.27], with: 2 }),
    kid(7, { k: "cross", from: "left", to: "right", gap: [2, 4] }),
    kid(9, { k: "chat", at: [0.62, 0.5], with: 6 }),
    kid(11, { k: "chat", at: [0.68, 0.52], with: 5 }),
    M("Alin", R_PARENT, "adult", { skin: S.light, hair: H.black, style: "short", top: "#7a8a5a", bottom: JEANS, outfit: "casual", beard: "beard" }, { k: "chat", at: [0.46, 0.36], with: 8 }),
    M("Simona", R_PARENT, "adult", { skin: S.tan, hair: H.dark, style: "curly", top: "#c45a8a", bottom: NAVY, outfit: "casual", skirt: true }, { k: "chat", at: [0.4, 0.35], with: 7 }),
    M("Elisabeta", R_GRANDMA, "senior", { skin: S.fair, hair: H.white, style: "short", top: "#7d3b56", bottom: "#4a4136", outfit: "coat", acc: "headscarf" }, { k: "wait", at: [0.12, 0.55], roam: 0.01 }),
    M("Gabriela", R_TEACHER_F, "adult", { skin: S.fair, hair: H.brown, style: "bun", top: "#7a4f8f", bottom: BLACK, outfit: "teacher", acc: "glasses" }, { k: "patrol", pts: [[0.25, 0.4], [0.75, 0.4]], pause: 3 }),
    M("Sorin", R_TEACHER, "adult", { skin: S.light, hair: H.dark, style: "short", top: "#3e6f5a", bottom: GREY, outfit: "teacher", beard: "beard" }, { k: "wait", at: [0.55, 0.2], act: "gesture", roam: 0.02 }, "happy"),
    GUARD("Ion", S.light, H.dark, { k: "patrol", pts: [[0.1, 0.3], [0.9, 0.3]], pause: 2 }),
    M("Dan", ["Principal", "Director"], "adult", { skin: S.light, hair: H.grey, style: "short", top: "#2b2f3a", bottom: "#2b2f3a", outfit: "suit", acc: "glasses" }, { k: "patrol", pts: [[0.3, 0.7], [0.7, 0.7]], pause: 3 }),
    M("?", UNKNOWN, "senior", { skin: S.tan, hair: H.grey, style: "short", top: "#4a6b8a", bottom: "#3a3a3a", outfit: "coat", acc: "cap", beard: "beard" }, { k: "wait", at: [0.82, 0.3], roam: 0.05 }),
  ];
  return {
    id: "r2-fair", pool: 1, setting: "yard-festival", clock: [18, 35], cast, target: cast.length - 1,
    info: ["Saturday 18:35, the school's autumn fair in the yard. Families, teachers and the guard — and one visitor not on the list.", "Sâmbătă, 18:35, târgul de toamnă în curtea școlii. Familii, profesori și paznicul — și un vizitator care nu e pe listă."],
  };
}

/* ------------------------------------------------------------------ rounds 3-5: about to cause harm */

const HANDOFF_CUES = (who: Line): Record<string, Cue> => ({
  handoff1: { line: [`Hand-off with ${who[0]}`, `Schimb de obiecte cu ${who[1]}`], w: 1 },
  count: { line: ["Counted cash", "A numărat bani"], w: 0.6 },
  handoff2: { line: ["Second hand-off, a different person", "Al doilea schimb, cu altă persoană"], w: 1 },
});

function hGym(): Scenario {
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
    id: "h-gym", pool: 2, setting: "yard-gym", scale: 1.2, clock: [16, 40], cast, target: 0,
    info: ["Thursday 16:40, behind the gym after classes. Pupils hang around; one of them meets several others, one at a time.", "Joi, 16:40, în spatele sălii de sport, după ore. Elevii stau pe afară; unul dintre ei se întâlnește cu mai mulți, pe rând."],
    cues: HANDOFF_CUES(["a pupil", "un elev"]),
    act: { id: "handoff3", noun: ["the third hand-off", "al treilea schimb"] },
  };
}

function hCorridor(): Scenario {
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
    id: "h-corridor", pool: 2, setting: "corridor-evening", scale: 1.2, clock: [11, 5], cast, target: 0,
    info: ["Wednesday 11:05, the corridor during the break. Busy and loud; somewhere a fight is about to start.", "Miercuri, 11:05, holul în pauză. Aglomerat și gălăgios; undeva e pe cale să înceapă o bătaie."],
    cues: {
      restless: { line: ["Paced back and forth near a younger pupil", "Se plimbă agitată lângă o elevă mai mică"], w: 0.8 },
      close: { line: ["Closed in fast on her", "S-a apropiat repede de ea"], w: 1.3 },
      square: { line: ["Fists clenched, face to face", "Pumnii strânși, față în față"], w: 1 },
    },
    act: { id: "push", noun: ["the push", "împingere"] },
  };
}

function hGate(): Scenario {
  const cast: Member[] = [
    M("?", ["Adult, not on the pick-up list", "Adult, nu e pe lista de preluare"], "adult", { skin: S.fair, hair: H.brown, style: "short", top: "#4b5563", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "follow", target: 1, gap: 0.09 }, "furtive"),
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
    id: "h-gate", pool: 2, setting: "gate-afternoon", scale: 1.2, clock: [13, 20], cast, target: 0,
    info: ["Friday 13:20, classes are over. Parents arrive, pupils wait or play; one adult stays close behind a pupil.", "Vineri, 13:20, s-au terminat orele. Vin părinții, elevii așteaptă sau se joacă; un adult stă mereu aproape, în spatele unei eleve."],
    cues: {
      follow10: { line: ["Followed the same pupil for 10 s", "A urmărit aceeași elevă timp de 10 s"], w: 1 },
      follow20: { line: ["Stayed under 2 m behind her for 20 s", "A stat la sub 2 m în spatele ei timp de 20 s"], w: 1.2 },
    },
    act: { id: "grab", noun: ["the grab for her arm", "încercarea de a o prinde de braț"] },
  };
}

function hBus(): Scenario {
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
    id: "h-bus", pool: 2, setting: "busstop", clock: [14, 5], cast, target: 0,
    props: [{ kind: "bin", at: [0.55, 0.3] }],
    info: ["Tuesday 14:05, the bus stop next to the school. The bus is late; one adult is getting more and more restless.", "Marți, 14:05, stația de lângă școală. Autobuzul întârzie; un adult devine tot mai agitat."],
    cues: {
      restless: { line: ["Paced back and forth", "S-a plimbat agitat"], w: 0.8 },
      kick: { line: ["Kicked the litter bin", "A lovit coșul de gunoi cu piciorul"], w: 1.2 },
      close: { line: ["Closed in fast on a pupil", "S-a apropiat repede de un elev"], w: 1.3 },
      square: { line: ["Fists clenched, face to face", "Pumnii strânși, față în față"], w: 1 },
    },
    act: { id: "push", noun: ["the push", "împingere"] },
  };
}

function hPark(): Scenario {
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
    id: "h-park", pool: 2, setting: "park", clock: [17, 30], cast, target: 0,
    info: ["Monday 17:30, the park next to the school. Children play, people pass through; at one bench, people stop for a few seconds.", "Luni, 17:30, parcul de lângă școală. Copiii se joacă, oamenii trec; la o bancă, unii se opresc câteva secunde."],
    cues: HANDOFF_CUES(["a pupil", "un elev"]),
    act: { id: "handoff3", noun: ["the third hand-off", "al treilea schimb"] },
  };
}

function hCrowbar(): Scenario {
  // an evening club is on; an adult with a crowbar tries the classroom doors
  const cast: Member[] = [
    M("?", ["Adult, not on the visitor list", "Adult, nu e pe lista de vizitatori"], "adult", { skin: S.fair, hair: H.blond, style: "buzz", top: "#4a4f2f", bottom: GREY, outfit: "worker", carry: "crowbar", beard: "stubble" }, { k: "prowl", from: "left", pts: [[0.15, 0.06], [0.5, 0.06], [0.85, 0.07]], acts: ["handle", "handle", "shove"] }, "furtive"),
    M("Gheorghe", ["Caretaker", "Administrator"], "senior", { skin: S.light, hair: H.grey, style: "bald", top: "#3d5a6b", bottom: "#3d5a6b", outfit: "worker", acc: "beanie", beard: "moustache", carry: "box" }, { k: "patrol", pts: [[0.2, 0.55], [0.8, 0.6]], pause: 3 }),
    kid(9, { k: "chat", at: [0.3, 0.45], with: 3 }),
    kid(11, { k: "chat", at: [0.36, 0.47], with: 2 }),
    kid(10, { k: "wait", at: [0.7, 0.4], roam: 0.02 }, "calm", { acc: "hood" }),
    kid(7, { k: "dance", at: [0.62, 0.7] }, "excited"),
    M("Corina", R_TEACHER_F, "adult", { skin: S.fair, hair: H.red, style: "long", top: "#2f6d8f", bottom: BLACK, outfit: "teacher", carry: "folder" }, { k: "cross", from: "doorM", to: "right", gap: [3, 5] }),
    M("Alin", R_PARENT, "adult", { skin: S.light, hair: H.black, style: "short", top: "#7a8a5a", bottom: JEANS, outfit: "coat", beard: "beard" }, { k: "pace", a: [0.15, 0.7], b: [0.35, 0.8], act: "call" }),
    kid(2, { k: "playfight", with: 9, area: [0.5, 0.9, 0.6, 0.9] }, "happy"),
    kid(4, { k: "playfight", with: 8, area: [0.5, 0.9, 0.6, 0.9] }, "happy"),
  ];
  return {
    id: "h-crowbar", pool: 2, setting: "corridor-evening", scale: 1.2, clock: [20, 25], cast, target: 0,
    info: ["Thursday 20:25, the evening robotics club is ending. Pupils, a teacher and the caretaker in the corridor; someone goes from door to door.", "Joi, 20:25, se termină cercul de robotică. Elevi, o profesoară și administratorul pe hol; cineva trece de la o ușă la alta."],
    cues: {
      handle1: { line: ["Tried a classroom door", "A încercat ușa unei clase"], w: 0.8 },
      tool: { line: ["Tool in hand: crowbar", "Unealtă în mână: rangă"], w: 0.8 },
      handle2: { line: ["Tried a second door", "A încercat o a doua ușă"], w: 0.8 },
    },
    act: { id: "force", noun: ["forcing the door", "forțarea ușii"] },
  };
}

function hHood(): Scenario {
  // after practice; an adult with the hood up keeps away from the cameras and goes for the side door
  const cast: Member[] = [
    M("?", ["Adult, not on the list", "Adult, nu e pe listă"], "adult", { skin: S.light, hair: H.dark, style: "short", top: "#4b4f57", bottom: BLACK, outfit: "hoodie", acc: "hood", beard: "stubble" }, { k: "prowl", from: "leftBack", pts: [[0.12, 0.1], [0.88, 0.12], [0.53, 0.05]], acts: ["none", "handle", "shove"] }, "furtive"),
    kid(10, { k: "chat", at: [0.4, 0.4], with: 2 }, "happy", { acc: "hood" }),
    kid(8, { k: "chat", at: [0.46, 0.42], with: 1 }, "happy"),
    M("Radu", ["PE coach", "Antrenor"], "adult", { skin: S.light, hair: H.black, style: "buzz", top: "#2a5fa8", bottom: "#2a5fa8", outfit: "sport" }, { k: "wait", at: [0.3, 0.25], act: "shout", roam: 0.02 }, "loud"),
    kid(6, { k: "pace", a: [0.65, 0.5], b: [0.85, 0.6], act: "call" }),
    kid(0, { k: "play", area: [0.15, 0.55, 0.55, 0.9] }),
    kid(4, { k: "play", area: [0.15, 0.55, 0.55, 0.9] }),
    M("Cristian", R_PARENT, "adult", { skin: S.light, hair: H.brown, style: "short", top: "#5b4a3a", bottom: JEANS, outfit: "coat", beard: "stubble" }, { k: "wait", at: [0.7, 0.75], act: "phone", roam: 0.02 }, "focused"),
    kid(11, { k: "dance", at: [0.2, 0.7] }, "excited"),
    M("Doina", R_CLEANER, "adult", { skin: S.light, hair: H.dark, style: "bun", top: "#8b6fae", bottom: "#3a3550", outfit: "cleaner", carry: "mop" }, { k: "work", area: [0.6, 0.9, 0.3, 0.5], act: "mop" }),
  ];
  return {
    id: "h-hood", pool: 2, setting: "yard-gym", scale: 1.2, clock: [19, 35], cast, target: 0,
    info: ["Wednesday 19:35, after handball practice outside the gym. Pupils, the coach and parents; someone keeps to the wall.", "Miercuri, 19:35, după antrenamentul de handbal, în fața sălii. Elevi, antrenorul și părinți; cineva merge numai pe lângă zid."],
    cues: {
      avoid: { line: ["Walked along the wall, face away from the cameras", "A mers pe lângă zid, cu fața ferită de camere"], w: 0.8 },
      handle1: { line: ["Tried the gym's side door", "A încercat ușa laterală a sălii"], w: 0.8 },
      handle2: { line: ["Back at the door a second time", "S-a întors la ușă a doua oară"], w: 0.8 },
    },
    act: { id: "force", noun: ["forcing the door", "forțarea ușii"] },
  };
}

/* ------------------------------------------------------------------ catalogue */

const POOLS: (() => Scenario)[][] = [
  [r1Yard, r1Corridor, r1Gate],
  [r2Break, r2Arrival, r2Fair],
  [hGym, hCorridor, hGate, hBus, hPark, hCrowbar, hHood],
];

function fresh(b: () => Scenario) {
  const s = b();
  s.cast.forEach((m, i) => (m.id = i));
  return s;
}

/** A fresh scenario from a pool, never one of `avoid` (when the pool still has others). */
export function pickScenario(pool: 0 | 1 | 2, avoid: string[] = []): Scenario {
  const all = POOLS[pool].map(fresh);
  const options = all.filter((s) => !avoid.includes(s.id));
  const list = options.length ? options : all;
  return list[Math.floor(Math.random() * list.length)];
}

/** All scenarios (for tests): one fresh copy of each. */
export function allScenarios(): Scenario[] {
  return POOLS.flat().map(fresh);
}

/** A fresh copy of the scenario with this id (tests), or null. */
export function scenarioById(id: string): Scenario | null {
  return allScenarios().find((s) => s.id === id) ?? null;
}
