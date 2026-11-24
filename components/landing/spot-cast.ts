/**
 * Characters for the "Spot the stranger" game: who they are (age, role, clothes, what they carry) and how
 * one is drawn on a canvas at a given moment (walk cycle, sitting, breathing, hands, face expression).
 *
 * Methodology:
 * - Bodies are laid out in units of 1/100 of the person's height. Age changes the proportions (children
 *   have bigger heads and shorter legs, seniors a slight stoop and shorter stride) and the height itself.
 * - Arms are two segments solved with two-bone IK towards a hand target, so actions (phone, reading,
 *   fidgeting, hand on chest, mopping, taking a photo, cheering) are hand positions, not new drawings.
 * - The face is drawn from an `Expr` (brows, inner-brow worry, eye openness, smile, open mouth, gaze,
 *   flush, sweat). The scene eases the current expression towards a target every frame, so faces flow
 *   from one state to another instead of switching. Below a few pixels of head size only the basic
 *   features are drawn.
 * - People walking towards the back are drawn from behind (no face), as a camera would see them.
 * - Appearance is never used as a cue in the game logic: the stranger is found by "not in the list",
 *   and the bonus round's person in distress by behaviour (breathing, movement, expression).
 */

export type Age = "child" | "teen" | "adult" | "senior";
export type Outfit =
  | "casual" | "pupil" | "teacher" | "guard" | "cleaner" | "courier" | "coat" | "hoodie" | "sport" | "nurse"
  | "suit" | "worker" | "staff";
export type HairStyle = "short" | "long" | "bun" | "bald" | "curly" | "ponytail" | "buzz";
export type Acc = "none" | "glasses" | "cap" | "hood" | "beanie" | "headscarf" | "headphones";
export type Carry =
  | "none" | "backpack" | "bag" | "phone" | "folder" | "mop" | "cane" | "sportsbag" | "canister" | "crowbar"
  | "camera" | "box" | "book" | "shopping" | "briefcase" | "screwdriver" | "spray" | "boltcutter" | "stick" | "bottle";
export type Act =
  | "none" | "phone" | "call" | "read" | "fidget" | "chest" | "neck" | "wipe" | "hug" | "gesture" | "mop"
  | "photo" | "yawn" | "cheer" | "handle" | "timetable"
  // behaviour actions (bonus round)
  | "fists" | "shove" | "push" | "kick" | "count" | "exchange" | "dance" | "shout" | "hide";
export type Mood = "calm" | "happy" | "bored" | "tired" | "focused" | "excited" | "furtive" | "hostile" | "anxious" | "loud";

export type Person = {
  id: number;
  name: string;
  /** Role or short description, [English, Romanian]. */
  role: [string, string];
  age: Age;
  skin: string;
  hair: string;
  style: HairStyle;
  top: string;
  bottom: string;
  outfit: Outfit;
  acc?: Acc;
  carry?: Carry;
  beard?: "none" | "stubble" | "beard" | "moustache";
  skirt?: boolean;
  scarf?: string;
};

export type Expr = {
  brow: number; // -1 lowered/furrowed .. 1 raised
  worry: number; // 0..1 inner brows up
  eye: number; // openness, 1 normal
  smile: number; // -1 .. 1
  open: number; // mouth open 0..1
  gx: number; // gaze -1..1
  gy: number; // gaze -1 (up) .. 1 (down)
  flush: number; // 0..1
  sweat: number; // 0..1
  tilt: number; // head tilt -1..1
};

export const NEUTRAL: Expr = { brow: 0, worry: 0, eye: 1, smile: 0.12, open: 0, gx: 0, gy: 0, flush: 0, sweat: 0, tilt: 0 };

export type Pose = {
  phase: number; // walk cycle
  moving: number; // 0 standing .. 1 walking
  run: number; // 0 walk .. 1 run
  facing: number; // -1 left .. 1 right (walking direction)
  look: number; // head turn
  back: number; // 0 front .. 1 seen from behind
  sit: number; // 0 standing .. 1 sitting
  breath: number; // breathing phase (radians)
  breathAmp: number; // 0..1
  act: Act;
  t: number; // personal clock, for action animation
  expr: Expr;
  blink: number; // 0 open .. 1 closed
  heart: number; // heart phase, for the flush pulse
  sway: number; // body sway (weight shift / swaying), -1..1
  /** Direction the person is turned towards for reaching actions (hand-off, shove), -1 left .. 1 right. */
  toward: number;
  /** 0..1 progress of a kick or a shove (a fast limb movement). */
  burst: number;
};

export const SKIN = { fair: "#f3d6b8", light: "#e9c09b", tan: "#cf9a6c", brown: "#a06a43", deep: "#6e4429" };
export const HAIR = {
  black: "#1c1713", dark: "#3f2a1b", brown: "#71462a", auburn: "#8c3f22", blond: "#d1aa66", red: "#b0472c",
  grey: "#9fa3a9", white: "#dedcd8",
};

/* ------------------------------------------------------------------ proportions */

type Layout = { r: number; head: number; sh: number; hip: number; leg: number; upper: number; fore: number; shW: number; hipW: number };

const LAYOUT: Record<Age, Layout> = {
  child: { r: 14.5, head: -86, sh: -70, hip: -40, leg: 38, upper: 13, fore: 12.5, shW: 13, hipW: 12 },
  teen: { r: 11.6, head: -92, sh: -79, hip: -46, leg: 44, upper: 15, fore: 15, shW: 14, hipW: 12.5 },
  adult: { r: 10.6, head: -93, sh: -80, hip: -46, leg: 44, upper: 15.5, fore: 15, shW: 15, hipW: 13 },
  senior: { r: 10.8, head: -91, sh: -78, hip: -45, leg: 43, upper: 15, fore: 14.5, shW: 15, hipW: 14 },
};
/** Height relative to an adult. */
export const AGE_H: Record<Age, number> = { child: 0.6, teen: 0.88, adult: 1, senior: 0.94 };
/** Walking speed relative to an adult. */
export const AGE_SPEED: Record<Age, number> = { child: 1.2, teen: 1.1, adult: 1, senior: 0.62 };

export function layoutOf(p: Person) {
  return LAYOUT[p.age];
}

/** Head centre and radius in pixels for a person with feet at (x, y) and height h (used for hit tests). */
export function headOf(p: Person, x: number, y: number, h: number, pose: Pick<Pose, "sit" | "facing" | "look" | "moving" | "phase">) {
  const L = LAYOUT[p.age];
  const u = h / 100;
  const drop = pose.sit * L.leg * 0.45;
  const bob = Math.abs(Math.cos(pose.phase)) * 1.8 * u * pose.moving;
  const turn = clamp(pose.facing + pose.look, -1, 1);
  return { x: x + turn * 2 * u, y: y + (L.head + drop) * u - bob, r: L.r * u };
}

/* ------------------------------------------------------------------ helpers */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => clamp(Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k), 0, 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Two-bone IK: elbow position for shoulder S, hand target T, bending towards `bend` (-1 left, 1 right). */
function ik(sx: number, sy: number, tx: number, ty: number, l1: number, l2: number, bend: number) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.999;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  d = Math.max(d, Math.abs(l1 - l2) + 0.001);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = sx + (dx * a) / d;
  const my = sy + (dy * a) / d;
  const ex = mx + (-dy / d) * h * bend;
  const ey = my + (dx / d) * h * bend;
  return { ex, ey, hx: sx + dx, hy: sy + dy };
}

function limb(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

/* ------------------------------------------------------------------ hands per action */

type Hand = { x: number; y: number } | null;

/**
 * Hand targets for an action, relative to the body centre (x) and shoulder line (y), in body units.
 * `side` is -1 for the left arm on screen, 1 for the right. null = arm hangs and swings with the walk.
 */
function handFor(act: Act, side: number, t: number, L: Layout, carry: Carry | undefined): Hand {
  const S = L.shW;
  switch (act) {
    case "phone":
      return side > 0 ? { x: 3, y: 15 + Math.sin(t * 0.7) * 0.6 } : side < 0 && carry === "phone" ? { x: -1, y: 17 } : null;
    case "call":
      return side > 0 ? { x: L.r * 0.9, y: L.head - L.sh + 3 } : null;
    case "read":
      return { x: side * 5, y: 18 + Math.sin(t * 0.5) * 0.5 };
    case "fidget": {
      const k = Math.sin(t * 7.3 + side) * 2.2;
      return { x: side * (2.5 + Math.cos(t * 5.1) * 1.4), y: 20 + k };
    }
    case "chest":
      return side < 0 ? { x: 2 + Math.sin(t * 2) * 0.6, y: 8 } : null;
    case "neck":
      return side > 0 ? { x: 2, y: -2 + Math.sin(t * 3) * 0.8 } : null;
    case "wipe": {
      const w = (t * 0.6) % 4;
      return side > 0 && w < 1.2 ? { x: 4 - Math.sin(w * 2.6) * 7, y: L.head - L.sh - 5 } : null;
    }
    case "hug":
      return { x: -side * 9, y: 11 + Math.sin(t * 6 + side) * 0.8 };
    case "gesture": {
      const k = Math.max(0, Math.sin(t * 2.3 + side * 1.7));
      return side > 0 ? { x: 10 + k * 3, y: 17 - k * 5 } : null;
    }
    case "mop":
      return side > 0 ? { x: 6 + Math.sin(t * 2.4) * 4, y: 13 } : { x: 9 + Math.sin(t * 2.4) * 4, y: 25 };
    case "photo":
      return { x: side * 4.5, y: L.head - L.sh + 1.5 };
    case "yawn": {
      const y = (t * 0.25) % 6;
      return side > 0 && y < 2.2 ? { x: 1, y: L.head - L.sh + L.r * 0.55 } : null;
    }
    case "cheer": {
      const k = Math.max(0, Math.sin(t * 2.6));
      return k > 0.2 ? { x: side * (S + 2), y: L.head - L.sh - 10 * k } : null;
    }
    case "handle":
      return side > 0 ? { x: S + 6, y: 16 + Math.sin(t * 5) * 1.2 } : null;
    case "timetable":
      return side > 0 ? { x: S + 4, y: -2 } : null;
    case "fists": {
      const k = Math.sin(t * 4 + side) * 1.2;
      return { x: side * (S - 3), y: 24 + k };
    }
    case "count":
      return { x: side * 2.5 + Math.sin(t * 6) * (side > 0 ? 1.2 : 0), y: 17 };
    case "dance": {
      const k = Math.sin(t * 5.4 + (side > 0 ? 0 : Math.PI));
      return { x: side * (S + 4), y: 8 - k * 12 };
    }
    case "hide":
      return side > 0 ? { x: 5, y: 26 } : null;
    default:
      break;
  }
  if (carry === "folder" && side > 0) return { x: 4, y: 15 };
  if (carry === "book" && side > 0) return { x: 5, y: 17 };
  return null;
}

/** Actions whose hands reach towards someone (`toward` side) and move with `burst`. */
function reachFor(act: Act, side: number, toward: number, burst: number, t: number, L: Layout): Hand {
  const S = L.shW;
  const dir = toward >= 0 ? 1 : -1;
  switch (act) {
    case "exchange":
      return side === dir ? { x: dir * (S + 8 + Math.sin(t * 3) * 1.5), y: 16 } : null;
    case "shove": {
      const k = Math.sin(Math.min(1, burst) * Math.PI);
      return { x: dir * (S * 0.4 + 6 + k * 16) + side * 3, y: 8 - k * 2 };
    }
    case "push":
      return side === dir ? { x: dir * (S + 4 + Math.max(0, Math.sin(t * 4)) * 8), y: 10 } : null;
    case "shout": {
      const k = Math.max(0, Math.sin(t * 2.2));
      return side === dir ? { x: dir * (S + 10 + k * 6), y: 4 - k * 6 } : null;
    }
    default:
      return undefined as unknown as Hand;
  }
}

/* ------------------------------------------------------------------ drawing */

/**
 * A person with feet at (x, y) and height h (already scaled for age and distance). Draws shadow, legs,
 * body, clothes, arms, carried objects, head and face. `detail` < 1 drops small face details.
 */
export function drawCharacter(g: CanvasRenderingContext2D, p: Person, x: number, y: number, h: number, pose: Pose, shadow = true) {
  const L = LAYOUT[p.age];
  const u = h / 100;
  const m = pose.moving * (1 - pose.sit);
  const runK = pose.run;
  const stride = (p.age === "senior" ? 0.55 : p.age === "child" ? 0.85 : 0.75) * (1 + runK * 0.35);
  const s = Math.sin(pose.phase) * m;
  const side = 0.35 + 0.65 * Math.abs(pose.facing) * (1 - pose.back);
  const bob = Math.abs(Math.cos(pose.phase)) * (1.8 + runK * 2.5) * u * m;
  const sway = pose.sway * 1.2 * u;
  const drop = pose.sit * L.leg * 0.45 * u;
  const breath = Math.sin(pose.breath) * pose.breathAmp;
  const turn = clamp(pose.facing * (1 - pose.back) + pose.look, -1, 1);
  const stoop = p.age === "senior" ? 1 : 0;
  const back = pose.back > 0.5;

  // shadow
  if (shadow) {
    const sg = g.createRadialGradient(x, y, 0, x, y, 20 * u);
    sg.addColorStop(0, "rgba(0,0,0,0.5)");
    sg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sg;
    g.beginPath();
    g.ellipse(x, y, 21 * u, 5.5 * u, 0, 0, Math.PI * 2);
    g.fill();
  }

  const hipY = y + L.hip * u + drop - bob;
  const hipX = x + sway;
  const shY = y + L.sh * u + drop - bob - breath * 1.1 * u + stoop * 2.2 * u;
  const shX = hipX + sway * 0.4;
  const pants = p.bottom;
  const shoe = "#121318";
  const legCol = p.skirt ? "#2a2a33" : pants;

  // legs
  if (pose.sit > 0.5) {
    // sitting, seen from the front: thighs come towards the camera (short), shins go down to the feet
    for (const d of [-1, 1]) {
      const kx = hipX + d * 6 * u;
      const ky = hipY + 6 * u;
      limb(g, hipX + d * 4.5 * u, hipY, kx, ky, 11 * u, pants);
      limb(g, kx, ky, kx + d * 1 * u, y - 2 * u, 8.5 * u, legCol);
      g.fillStyle = shoe;
      g.beginPath();
      g.ellipse(kx + d * 1 * u, y - 0.5 * u, 6 * u, 3.2 * u, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    const leg = (dx: number, a: number, lift: number) => {
      const fx = hipX + dx + Math.sin(a) * L.leg * u * side;
      const fy = hipY + Math.cos(a) * L.leg * u - lift;
      limb(g, hipX + dx, hipY, fx, fy, 9.5 * u, legCol);
      g.fillStyle = shoe;
      g.beginPath();
      g.ellipse(fx + pose.facing * 3 * u * (1 - pose.back), fy + 1.5 * u, 6 * u, 3.2 * u, 0, 0, Math.PI * 2);
      g.fill();
    };
    const a = stride * 0.66 * s;
    const lift = (v: number) => Math.max(0, v) * (4 + runK * 5) * u * m * (1 - side * 0.6);
    const kick = pose.act === "kick" ? Math.sin(Math.min(1, pose.burst) * Math.PI) : 0;
    const kd = pose.toward >= 0 ? 1 : -1;
    leg(-4.5 * u, -a, lift(-Math.sin(pose.phase)));
    if (kick > 0.01) leg(4.5 * u, kd * kick * 1.1 / Math.max(0.35, side), kick * 10 * u);
    else leg(4.5 * u, a, lift(Math.sin(pose.phase)));
  }

  // skirt / long coat over the upper legs
  if (p.skirt) {
    g.fillStyle = pants;
    g.beginPath();
    g.moveTo(hipX - L.hipW * u, hipY - 3 * u);
    g.lineTo(hipX + L.hipW * u, hipY - 3 * u);
    g.lineTo(hipX + (L.hipW + 4) * u, hipY + 17 * u);
    g.lineTo(hipX - (L.hipW + 4) * u, hipY + 17 * u);
    g.closePath();
    g.fill();
  }

  const top = p.top;
  const skin = p.skin;
  const hx = shX + turn * 2 * u + stoop * pose.facing * 1.5 * u;
  const hy = y + L.head * u + drop - bob - breath * 0.8 * u + stoop * 3.2 * u;
  const r = L.r * u;

  // backpack seen from behind sits on top of the back; from the front only straps and edges show
  const pack = p.carry === "backpack";
  if (pack && !back) {
    g.fillStyle = shade("#2f4a7a", -0.25);
    g.fillRect(shX - (L.shW + 3) * u, shY + 2 * u, 4 * u, 22 * u);
    g.fillRect(shX + (L.shW - 1) * u, shY + 2 * u, 4 * u, 22 * u);
  }

  // arms behind the body first (from behind, both arms are drawn after the torso anyway)
  const shoulder = (d: number) => ({ x: shX + d * (L.shW - 1.5) * u, y: shY + 4 * u });
  const handTarget = (d: number) => {
    const reach = reachFor(pose.act, d, pose.toward, pose.burst, pose.t, L);
    const t = reach !== undefined ? reach : handFor(pose.act, d, pose.t, L, p.carry);
    if (!t || back) {
      const sw = d * stride * 0.6 * s;
      const so = shoulder(d);
      const len = (L.upper + L.fore) * u;
      const out = p.carry === "cane" && d > 0 ? 4 : 1;
      return { x: so.x + d * out * u + Math.sin(sw) * len * side, y: so.y + Math.cos(sw) * len * 0.98, free: true };
    }
    return { x: shX + t.x * u, y: shY + t.y * u, free: false };
  };
  const drawArm = (d: number) => {
    const so = shoulder(d);
    const ht = handTarget(d);
    const j = ik(so.x, so.y, ht.x, ht.y, L.upper * u, L.fore * u, d);
    const sleeve = p.outfit === "guard" ? "#1f2b44" : top;
    limb(g, so.x, so.y, j.ex, j.ey, 7.6 * u, sleeve);
    const short = p.outfit === "sport" || p.outfit === "nurse";
    limb(g, j.ex, j.ey, j.hx, j.hy, 6.2 * u, short ? skin : sleeve);
    g.fillStyle = skin;
    g.beginPath();
    g.arc(j.hx, j.hy, 3.1 * u, 0, Math.PI * 2);
    g.fill();
    return j;
  };

  // hiding something behind the back: that arm and the object go behind the torso
  const hiding = pose.act === "hide" && !back;
  let hidden: Joint | null = null;
  if (hiding) {
    hidden = drawArm(1);
    const obj = p.carry === "bottle" ? "#3f7d4a" : "#6b4a2b";
    limb(g, hidden.hx, hidden.hy - 2 * u, hidden.hx + 3 * u, hidden.hy + (p.carry === "bottle" ? 9 : 22) * u, p.carry === "bottle" ? 3.4 * u : 2.4 * u, obj);
  }

  // torso
  const tw = (1 + breath * 0.025) * L.shW;
  g.fillStyle = p.outfit === "guard" ? "#1f2b44" : top;
  g.beginPath();
  g.moveTo(shX - tw * u, shY + 3 * u);
  g.quadraticCurveTo(shX - (tw + 1) * u, shY - 2 * u, shX - (tw - 6) * u, shY - 3 * u);
  g.lineTo(shX + (tw - 6) * u, shY - 3 * u);
  g.quadraticCurveTo(shX + (tw + 1) * u, shY - 2 * u, shX + tw * u, shY + 3 * u);
  const coat = p.outfit === "coat";
  const low = coat ? hipY + 18 * u : hipY + 3 * u;
  g.lineTo(hipX + (L.hipW + (coat ? 3 : 0)) * u, low);
  g.quadraticCurveTo(hipX, low + 3 * u, hipX - (L.hipW + (coat ? 3 : 0)) * u, low);
  g.closePath();
  g.fill();

  // clothes details
  if (!back) {
    if (p.outfit === "guard" || p.outfit === "staff") {
      // hi-vis vest with reflective stripes
      g.fillStyle = "#d4ec3a";
      g.fillRect(shX - (tw - 2) * u, shY - 1 * u, (tw - 2) * 2 * u, hipY - shY + 2 * u);
      g.fillStyle = "#e9eef2";
      for (const k of [0.42, 0.68]) g.fillRect(shX - (tw - 2) * u, shY + (hipY - shY) * k, (tw - 2) * 2 * u, 2.4 * u);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(shX - 0.6 * u, shY - 1 * u, 1.2 * u, hipY - shY + 2 * u);
    } else if (p.outfit === "cleaner") {
      g.fillStyle = "#8fc3e0";
      g.fillRect(shX - 9 * u, shY + 4 * u, 18 * u, hipY - shY + 10 * u);
      g.strokeStyle = "#8fc3e0";
      g.lineWidth = 1.6 * u;
      g.beginPath();
      g.moveTo(shX - 8 * u, shY + 4 * u);
      g.lineTo(shX - 5 * u, shY - 3 * u);
      g.moveTo(shX + 8 * u, shY + 4 * u);
      g.lineTo(shX + 5 * u, shY - 3 * u);
      g.stroke();
    } else if (p.outfit === "teacher") {
      g.fillStyle = shade(top, -0.3);
      g.fillRect(shX - 3.2 * u, shY - 3 * u, 6.4 * u, hipY - shY + 5 * u);
      g.fillStyle = "#f1efe8";
      g.fillRect(shX - 2.2 * u, shY - 3 * u, 4.4 * u, hipY - shY + 4 * u);
    } else if (p.outfit === "suit") {
      g.fillStyle = "#f2f2f2";
      g.beginPath();
      g.moveTo(shX - 4 * u, shY - 3 * u);
      g.lineTo(shX + 4 * u, shY - 3 * u);
      g.lineTo(shX, shY + 12 * u);
      g.closePath();
      g.fill();
      g.fillStyle = "#7a1d2b";
      g.fillRect(shX - 1 * u, shY - 2 * u, 2 * u, 16 * u);
    } else if (p.outfit === "hoodie") {
      g.fillStyle = shade(top, -0.2);
      g.fillRect(shX - 7 * u, hipY - 12 * u, 14 * u, 7 * u);
      g.strokeStyle = "#ddd";
      g.lineWidth = 0.9 * u;
      g.beginPath();
      g.moveTo(shX - 2 * u, shY - 2 * u);
      g.lineTo(shX - 2.5 * u, shY + 9 * u);
      g.moveTo(shX + 2 * u, shY - 2 * u);
      g.lineTo(shX + 2.5 * u, shY + 9 * u);
      g.stroke();
    } else if (p.outfit === "sport") {
      g.fillStyle = "#f4f4f4";
      g.fillRect(shX - (tw - 1) * u, shY + 1 * u, 2 * u, hipY - shY);
      g.fillRect(shX + (tw - 3) * u, shY + 1 * u, 2 * u, hipY - shY);
    } else if (p.outfit === "worker") {
      g.fillStyle = shade(pants, 0.05);
      g.fillRect(shX - 9 * u, shY + 8 * u, 18 * u, hipY - shY - 4 * u);
      g.fillStyle = shade(pants, 0.05);
      g.fillRect(shX - 8 * u, shY - 2 * u, 2.5 * u, 11 * u);
      g.fillRect(shX + 5.5 * u, shY - 2 * u, 2.5 * u, 11 * u);
    } else if (p.outfit === "courier") {
      g.strokeStyle = "#1d1d1d";
      g.lineWidth = 2.2 * u;
      g.beginPath();
      g.moveTo(shX - 10 * u, shY - 2 * u);
      g.lineTo(shX + 11 * u, hipY - 2 * u);
      g.stroke();
      g.fillStyle = "#f2c230";
      g.fillRect(shX - (tw - 2) * u, shY + 10 * u, (tw - 2) * 2 * u, 3 * u);
    } else if (p.outfit === "nurse") {
      g.fillStyle = shade(top, -0.18);
      g.beginPath();
      g.moveTo(shX - 4 * u, shY - 3 * u);
      g.lineTo(shX + 4 * u, shY - 3 * u);
      g.lineTo(shX, shY + 5 * u);
      g.closePath();
      g.fill();
    }
    if (pack) {
      g.strokeStyle = "#22355a";
      g.lineWidth = 2.6 * u;
      g.beginPath();
      g.moveTo(shX - 8 * u, shY - 2 * u);
      g.lineTo(shX - 9 * u, shY + 18 * u);
      g.moveTo(shX + 8 * u, shY - 2 * u);
      g.lineTo(shX + 9 * u, shY + 18 * u);
      g.stroke();
    }
    if (p.scarf) {
      g.fillStyle = p.scarf;
      g.fillRect(shX - 8 * u, shY - 4.5 * u, 16 * u, 4.5 * u);
      g.fillRect(shX + 2 * u, shY - 1 * u, 4 * u, 15 * u);
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(shX + 2 * u, shY + 8 * u, 4 * u, 1.6 * u);
    }
  } else if (pack) {
    g.fillStyle = "#2f4a7a";
    roundRect(g, shX - 10 * u, shY + 1 * u, 20 * u, 26 * u, 4 * u);
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(shX - 7 * u, shY + 14 * u, 14 * u, 2 * u);
  }

  // side shading on the body (light from above-left)
  g.fillStyle = "rgba(0,0,0,0.2)";
  g.beginPath();
  g.moveTo(shX + 4 * u, shY - 3 * u);
  g.lineTo(shX + (tw - 6) * u, shY - 3 * u);
  g.quadraticCurveTo(shX + (tw + 1) * u, shY - 2 * u, shX + tw * u, shY + 3 * u);
  g.lineTo(hipX + L.hipW * u, low);
  g.quadraticCurveTo(hipX + 8 * u, low + 2 * u, hipX + 4 * u, low + 2 * u);
  g.closePath();
  g.fill();

  // arms (a fist is drawn as a slightly bigger, darker hand)
  const left = drawArm(-1);
  const right = hidden ?? drawArm(1);
  if (pose.act === "fists" && !back) {
    g.fillStyle = shade(skin, -0.18);
    for (const j of [left, right]) {
      g.beginPath();
      g.arc(j.hx, j.hy, 3.7 * u, 0, Math.PI * 2);
      g.fill();
    }
  }

  // carried objects
  drawCarry(g, p, pose, left, right, x, y, u, shX, shY, hipY, back);

  // neck
  g.fillStyle = shade(skin, -0.08);
  g.fillRect(shX - 3.3 * u, shY - 9 * u + stoop * 2 * u, 6.6 * u, 8 * u);

  // head
  drawHead(g, p, hx, hy, r, turn, pose, back);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

type Joint = { ex: number; ey: number; hx: number; hy: number };

function drawCarry(
  g: CanvasRenderingContext2D, p: Person, pose: Pose, left: Joint, right: Joint, x: number, y: number, u: number,
  shX: number, shY: number, hipY: number, back: boolean,
) {
  const c = p.carry;
  const act = pose.act;
  if (act === "count" && !back) {
    g.fillStyle = "#7fb07a";
    g.fillRect((left.hx + right.hx) / 2 - 4 * u, left.hy - 2.5 * u, 8 * u, 4.5 * u);
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect((left.hx + right.hx) / 2 - 4 * u, left.hy - 0.5 * u, 8 * u, 0.8 * u);
    return;
  }
  if (act === "exchange") {
    const j = pose.toward >= 0 ? right : left;
    g.fillStyle = "#f2f2f2";
    g.fillRect(j.hx - 1.8 * u, j.hy - 1.8 * u, 3.6 * u, 3.6 * u);
    return;
  }
  if (act === "hide" || c === "stick" || c === "bottle") {
    if (act === "hide") return;
    if (c === "stick") limb(g, right.hx, right.hy - 3 * u, right.hx + 2 * u, right.hy + 22 * u, 2.4 * u, "#6b4a2b");
    if (c === "bottle") limb(g, right.hx, right.hy, right.hx + 1 * u, right.hy + 9 * u, 3.4 * u, "#3f7d4a");
    return;
  }
  if ((act === "phone" || act === "call" || c === "phone") && (act === "phone" || act === "call")) {
    g.fillStyle = "#111";
    roundRect(g, right.hx - 2.4 * u, right.hy - 4.4 * u, 4.8 * u, 8 * u, 1 * u);
    g.fill();
    if (act === "phone" && !back) {
      g.fillStyle = "rgba(150,200,255,0.85)";
      g.fillRect(right.hx - 1.8 * u, right.hy - 3.6 * u, 3.6 * u, 6.4 * u);
      const glow = g.createRadialGradient(right.hx, right.hy - 6 * u, 0, right.hx, right.hy - 6 * u, 14 * u);
      glow.addColorStop(0, "rgba(140,190,255,0.22)");
      glow.addColorStop(1, "rgba(140,190,255,0)");
      g.fillStyle = glow;
      g.fillRect(right.hx - 14 * u, right.hy - 20 * u, 28 * u, 28 * u);
    }
    return;
  }
  if (act === "read" || c === "book") {
    if (act === "read") {
      g.fillStyle = "#e9e2cf";
      g.fillRect(shX - 7 * u, (left.hy + right.hy) / 2 - 6 * u, 14 * u, 9 * u);
      g.fillStyle = "#7a2f2f";
      g.fillRect(shX - 0.5 * u, (left.hy + right.hy) / 2 - 6 * u, 1 * u, 9 * u);
      return;
    }
  }
  if (act === "photo" || c === "camera") {
    if (act === "photo") {
      g.fillStyle = "#1a1a1a";
      g.fillRect((left.hx + right.hx) / 2 - 6 * u, left.hy - 4 * u, 12 * u, 7 * u);
      g.fillStyle = "#4b6a8f";
      g.beginPath();
      g.arc((left.hx + right.hx) / 2, left.hy - 0.5 * u, 2.2 * u, 0, Math.PI * 2);
      g.fill();
      return;
    }
  }
  switch (c) {
    case "mop": {
      const hx = right.hx;
      const fx = hx + 10 * u + Math.sin(pose.t * 2.4) * 6 * u;
      limb(g, hx, right.hy - 14 * u, fx, y - 2 * u, 1.6 * u, "#c9a46a");
      g.fillStyle = "#d8d8d0";
      g.fillRect(fx - 7 * u, y - 4 * u, 14 * u, 4 * u);
      break;
    }
    case "cane": {
      limb(g, right.hx, right.hy, right.hx + 2 * u, y, 1.8 * u, "#4a3426");
      limb(g, right.hx - 2.5 * u, right.hy, right.hx + 1 * u, right.hy, 2 * u, "#4a3426");
      break;
    }
    case "folder":
      g.fillStyle = "#3e6fb0";
      g.fillRect(right.hx - 5 * u, right.hy - 9 * u, 9 * u, 12 * u);
      break;
    case "bag":
    case "shopping": {
      g.fillStyle = c === "shopping" ? "#d8c9a3" : "#5a3d2b";
      g.fillRect(left.hx - 5 * u, left.hy + 1 * u, 10 * u, 9 * u);
      g.strokeStyle = g.fillStyle;
      g.lineWidth = 1 * u;
      g.beginPath();
      g.arc(left.hx, left.hy + 1 * u, 3 * u, Math.PI, 0);
      g.stroke();
      break;
    }
    case "briefcase":
      g.fillStyle = "#2b2018";
      g.fillRect(left.hx - 6 * u, left.hy + 1 * u, 12 * u, 9 * u);
      break;
    case "sportsbag":
      g.fillStyle = "#1f5a8a";
      roundRect(g, left.hx - 9 * u, left.hy + 1 * u, 18 * u, 8 * u, 3 * u);
      g.fill();
      break;
    case "canister":
      g.fillStyle = "#c62f25";
      g.fillRect(right.hx - 4.5 * u, right.hy + 1 * u, 9 * u, 11 * u);
      g.fillStyle = "#8f1f18";
      g.fillRect(right.hx - 1 * u, right.hy - 1 * u, 3 * u, 3 * u);
      break;
    case "crowbar":
      limb(g, right.hx, right.hy - 2 * u, right.hx + 3 * u, right.hy + 20 * u, 1.9 * u, "#3a3f48");
      break;
    case "boltcutter":
      limb(g, right.hx, right.hy - 2 * u, right.hx + 2 * u, right.hy + 16 * u, 2.2 * u, "#b02a2a");
      limb(g, right.hx + 2 * u, right.hy + 16 * u, right.hx + 4 * u, right.hy + 21 * u, 2.2 * u, "#9aa0a8");
      break;
    case "screwdriver":
      limb(g, right.hx, right.hy, right.hx + 1 * u, right.hy + 9 * u, 1.3 * u, "#c8ccd2");
      limb(g, right.hx, right.hy - 1 * u, right.hx, right.hy + 2 * u, 2.4 * u, "#e0a020");
      break;
    case "spray":
      for (const d of [0, 3.4]) {
        g.fillStyle = d ? "#2c8f55" : "#d03a8f";
        g.fillRect(right.hx - 1.6 * u + d * u, right.hy + 0.5 * u, 3 * u, 7 * u);
      }
      break;
    case "box":
      g.fillStyle = "#b58a55";
      g.fillRect(shX - 8 * u, shY + 10 * u, 16 * u, 11 * u);
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(shX - 8 * u, shY + 14 * u, 16 * u, 1.4 * u);
      break;
    default:
      break;
  }
  void hipY;
  void x;
}

/* ------------------------------------------------------------------ head and face */

function drawHead(g: CanvasRenderingContext2D, p: Person, hx: number, hy: number, r: number, turn: number, pose: Pose, back: boolean) {
  const e = pose.expr;
  const hair = p.hair;
  const style = p.style;
  const acc = p.acc ?? "none";
  const tilt = e.tilt * 0.14 + (back ? 0 : 0);
  g.save();
  g.translate(hx, hy + r);
  g.rotate(tilt);
  g.translate(-hx, -hy - r);

  // long hair behind the head
  if ((style === "long" || style === "curly") && acc !== "hood" && acc !== "headscarf") {
    g.fillStyle = hair;
    g.beginPath();
    g.moveTo(hx - r * 1.08, hy - r * 0.2);
    g.quadraticCurveTo(hx - r * 1.3, hy + r * 1.5, hx - r * 0.85, hy + r * (style === "curly" ? 1.15 : 1.75));
    g.lineTo(hx + r * 0.85, hy + r * (style === "curly" ? 1.15 : 1.75));
    g.quadraticCurveTo(hx + r * 1.3, hy + r * 1.5, hx + r * 1.08, hy - r * 0.2);
    g.closePath();
    g.fill();
  }
  if (acc === "hood") {
    g.fillStyle = "#2b2f3a";
    g.beginPath();
    g.ellipse(hx, hy + r * 0.05, r * 1.32, r * 1.38, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (acc === "headscarf") {
    g.fillStyle = "#7d3b56";
    g.beginPath();
    g.ellipse(hx, hy + r * 0.1, r * 1.22, r * 1.3, 0, 0, Math.PI * 2);
    g.fill();
  }

  // face shape (slightly oval), ears
  const skin = p.skin;
  if (!back && Math.abs(turn) < 0.75 && acc !== "hood" && acc !== "headscarf") {
    g.fillStyle = shade(skin, -0.1);
    for (const d of [-1, 1]) {
      g.beginPath();
      g.ellipse(hx + d * r * (0.96 - turn * d * 0.12), hy + r * 0.12, r * 0.17, r * 0.26, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(hx, hy + r * 0.04, r * 0.95, r * 1.04, 0, 0, Math.PI * 2);
  g.fill();

  // 3D shading: darker on the far side
  const sh = g.createRadialGradient(hx - r * 0.35, hy - r * 0.3, r * 0.2, hx, hy, r * 1.15);
  sh.addColorStop(0, "rgba(255,255,255,0.08)");
  sh.addColorStop(1, "rgba(0,0,0,0.22)");
  g.fillStyle = sh;
  g.beginPath();
  g.ellipse(hx, hy + r * 0.04, r * 0.95, r * 1.04, 0, 0, Math.PI * 2);
  g.fill();

  if (back) {
    // seen from behind: ears, then hair over the back of the head, the nape left showing
    if (acc !== "hood" && acc !== "headscarf") {
      g.fillStyle = shade(skin, -0.12);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.ellipse(hx + d * r * 0.95, hy + r * 0.12, r * 0.16, r * 0.25, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (style !== "bald" && acc !== "hood" && acc !== "headscarf") {
      g.fillStyle = hair;
      g.beginPath();
      const low = style === "long" || style === "curly" ? 1.02 : style === "buzz" ? 0.62 : 0.78;
      g.ellipse(hx, hy - r * 0.1, r * 0.97, r * 0.96, 0, Math.PI * 0.92, Math.PI * 2.08);
      g.quadraticCurveTo(hx + r * 0.6, hy + r * low, hx, hy + r * (low + 0.06));
      g.quadraticCurveTo(hx - r * 0.6, hy + r * low, hx - r * 0.97 * Math.cos(Math.PI * 0.08), hy - r * 0.1 + r * 0.96 * Math.sin(Math.PI * 0.08));
      g.fill();
      // a soft highlight so the back of the head reads as round
      const hl = g.createRadialGradient(hx - r * 0.3, hy - r * 0.45, 0, hx - r * 0.3, hy - r * 0.45, r * 0.8);
      hl.addColorStop(0, "rgba(255,255,255,0.14)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = hl;
      g.beginPath();
      g.ellipse(hx, hy - r * 0.1, r * 0.97, r * 0.96, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = hair;
      if (style === "bun") {
        g.beginPath();
        g.arc(hx, hy - r * 0.55, r * 0.42, 0, Math.PI * 2);
        g.fill();
      }
      if (style === "ponytail") limb(g, hx, hy - r * 0.2, hx + r * 0.1, hy + r * 1.3, r * 0.45, hair);
    } else if (style === "bald") {
      g.fillStyle = hair;
      g.fillRect(hx - r * 0.9, hy + r * 0.05, r * 1.8, r * 0.35);
    }
    if (acc === "cap" || acc === "beanie") drawHat(g, hx, hy, r, acc, 0, p);
    g.restore();
    return;
  }

  const small = r < 4.5;
  const fx = hx + turn * r * 0.3;
  const fy = hy + r * 0.06;
  const spread = r * 0.36 * (1 - Math.abs(turn) * 0.25);

  // hair on top (fringe / cap), drawn before the brows so eyebrows stay visible
  drawHairFront(g, p, hx, hy, r, turn);

  // flush and sweat
  if (e.flush > 0.02) {
    const beat = 0.75 + 0.25 * Math.max(0, Math.sin(pose.heart));
    for (const d of [-1, 1]) {
      const cx = fx + d * spread * 1.15;
      const cg = g.createRadialGradient(cx, fy + r * 0.32, 0, cx, fy + r * 0.32, r * 0.42);
      cg.addColorStop(0, `rgba(230,70,70,${0.5 * e.flush * beat})`);
      cg.addColorStop(1, "rgba(230,70,70,0)");
      g.fillStyle = cg;
      g.fillRect(cx - r * 0.45, fy - r * 0.1, r * 0.9, r * 0.85);
    }
  }

  // eyes
  const open = Math.max(0, e.eye * (1 - pose.blink));
  for (const d of [-1, 1]) {
    const ex = fx + d * spread;
    const ey = fy - r * 0.02;
    if (small) {
      g.fillStyle = "#1b1b1b";
      if (open < 0.25) g.fillRect(ex - r * 0.14, ey, r * 0.28, Math.max(0.6, r * 0.05));
      else {
        g.beginPath();
        g.arc(ex + e.gx * r * 0.05, ey, Math.max(0.7, r * 0.12), 0, Math.PI * 2);
        g.fill();
      }
      continue;
    }
    const rx = r * 0.2;
    const ry = r * 0.13 * open;
    if (open < 0.18) {
      g.strokeStyle = "#2a1c14";
      g.lineWidth = Math.max(0.8, r * 0.06);
      g.beginPath();
      g.moveTo(ex - rx, ey);
      g.quadraticCurveTo(ex, ey + r * 0.05, ex + rx, ey);
      g.stroke();
    } else {
      g.fillStyle = "#f6f3ee";
      g.beginPath();
      g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = "#3b2a1e";
      g.beginPath();
      g.arc(ex + e.gx * rx * 0.55 + turn * rx * 0.25, ey + e.gy * ry * 0.4, r * 0.105, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#0c0806";
      g.beginPath();
      g.arc(ex + e.gx * rx * 0.55 + turn * rx * 0.25, ey + e.gy * ry * 0.4, r * 0.05, 0, Math.PI * 2);
      g.fill();
      g.restore();
      // upper lid
      g.strokeStyle = shade(skin, -0.45);
      g.lineWidth = Math.max(0.7, r * 0.05);
      g.beginPath();
      g.ellipse(ex, ey, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();
    }
  }

  // eyebrows: height from `brow`, inner ends up with `worry`, down when furrowed
  if (!small) {
    g.strokeStyle = shade(p.style === "bald" ? "#6d6d6d" : p.hair, -0.25);
    g.lineWidth = Math.max(0.9, r * 0.075);
    g.lineCap = "round";
    for (const d of [-1, 1]) {
      const ex = fx + d * spread;
      const by = fy - r * 0.27 - e.brow * r * 0.07;
      const inner = by - e.worry * r * 0.11 + Math.max(0, -e.brow) * r * 0.06;
      const outer = by + e.worry * r * 0.03 - Math.max(0, -e.brow) * r * 0.02;
      g.beginPath();
      g.moveTo(ex - d * r * 0.17, inner);
      g.quadraticCurveTo(ex, (inner + outer) / 2 - r * 0.03, ex + d * r * 0.2, outer);
      g.stroke();
    }
  }

  // nose
  if (!small) {
    g.strokeStyle = shade(skin, -0.25);
    g.lineWidth = Math.max(0.7, r * 0.05);
    g.beginPath();
    g.moveTo(fx + turn * r * 0.12, fy + r * 0.08);
    g.quadraticCurveTo(fx + turn * r * 0.2 + r * 0.06, fy + r * 0.26, fx + turn * r * 0.1 - r * 0.05, fy + r * 0.3);
    g.stroke();
  }

  // mouth: a curve that smiles or frowns, an opening that breathes or yawns
  const mx = fx + turn * r * 0.08;
  const my = fy + r * 0.5;
  const mw = r * (0.2 + 0.06 * Math.max(0, e.smile) + 0.04 * e.open);
  if (e.open > 0.06 && !small) {
    g.fillStyle = "#4a1a1a";
    g.beginPath();
    g.ellipse(mx, my + r * 0.03, mw * 0.85, r * (0.03 + 0.17 * e.open), 0, 0, Math.PI * 2);
    g.fill();
    if (e.smile > 0.35) {
      g.fillStyle = "#f1ece4";
      g.fillRect(mx - mw * 0.6, my - r * 0.03, mw * 1.2, r * 0.05);
    }
  } else {
    g.strokeStyle = small ? "#1b1b1b" : "#6e3328";
    g.lineWidth = Math.max(0.8, r * 0.07);
    g.beginPath();
    g.moveTo(mx - mw, my - e.smile * r * 0.06);
    g.quadraticCurveTo(mx, my + e.smile * r * 0.16, mx + mw, my - e.smile * r * 0.06);
    g.stroke();
  }

  // beard, wrinkles, sweat
  if (!small) {
    if (p.beard === "beard" || p.beard === "stubble") {
      g.fillStyle = p.beard === "beard" ? shade(p.hair, -0.1) : "rgba(40,30,25,0.25)";
      g.beginPath();
      g.ellipse(fx, fy + r * 0.62, r * 0.62, r * 0.42, 0, 0, Math.PI);
      g.fill();
    }
    if (p.beard === "moustache" || p.beard === "beard") {
      g.fillStyle = shade(p.hair, -0.15);
      g.beginPath();
      g.ellipse(mx, my - r * 0.1, mw * 1.05, r * 0.07, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (p.age === "senior") {
      g.strokeStyle = shade(skin, -0.3);
      g.lineWidth = Math.max(0.5, r * 0.03);
      for (const d of [-1, 1]) {
        const ex = fx + d * spread;
        g.beginPath();
        g.moveTo(ex + d * r * 0.24, fy - r * 0.02);
        g.lineTo(ex + d * r * 0.32, fy + r * 0.04);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(fx - r * 0.25, fy - r * 0.48);
      g.quadraticCurveTo(fx, fy - r * 0.52, fx + r * 0.25, fy - r * 0.48);
      g.stroke();
    }
    if (e.sweat > 0.35) {
      g.fillStyle = `rgba(220,235,255,${0.7 * e.sweat})`;
      for (const [dx, dy] of [[-0.42, -0.42], [0.36, -0.5], [0.55, -0.1]]) {
        g.beginPath();
        g.ellipse(fx + dx * r, fy + dy * r, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  if (acc === "glasses" && !small) {
    g.strokeStyle = "#141414";
    g.lineWidth = Math.max(0.8, r * 0.07);
    for (const d of [-1, 1]) {
      g.beginPath();
      g.ellipse(fx + d * spread, fy - r * 0.01, r * 0.26, r * 0.2, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(fx - spread + r * 0.26, fy - r * 0.03);
    g.lineTo(fx + spread - r * 0.26, fy - r * 0.03);
    g.stroke();
  }
  if (acc === "headphones") {
    g.strokeStyle = "#151515";
    g.lineWidth = r * 0.16;
    g.beginPath();
    g.arc(hx, hy - r * 0.05, r * 1.05, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.fillStyle = "#e04b5a";
    for (const d of [-1, 1]) {
      g.beginPath();
      g.ellipse(hx + d * r * 0.98, hy + r * 0.12, r * 0.24, r * 0.32, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (acc === "hood") {
    // the hood's rim shades the forehead
    g.fillStyle = "rgba(0,0,0,0.38)";
    g.beginPath();
    g.ellipse(hx, hy - r * 0.45, r * 0.98, r * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#20232b";
    g.lineWidth = r * 0.18;
    g.beginPath();
    g.ellipse(hx, hy + r * 0.05, r * 1.08, r * 1.15, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
  }
  if (acc === "cap" || acc === "beanie") drawHat(g, hx, hy, r, acc, turn, p);
  g.restore();
}

function drawHairFront(g: CanvasRenderingContext2D, p: Person, hx: number, hy: number, r: number, turn: number) {
  const acc = p.acc ?? "none";
  if (acc === "hood" || acc === "headscarf" || acc === "beanie") return;
  const hair = p.hair;
  g.fillStyle = hair;
  switch (p.style) {
    case "bald":
      g.fillRect(hx - r * 0.98, hy - r * 0.05, r * 0.22, r * 0.4);
      g.fillRect(hx + r * 0.76, hy - r * 0.05, r * 0.22, r * 0.4);
      return;
    case "buzz":
      g.globalAlpha = 0.75;
      g.beginPath();
      g.ellipse(hx, hy - r * 0.32, r * 0.96, r * 0.72, 0, Math.PI, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      return;
    case "curly":
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + (i / 6) * 0.9);
        g.beginPath();
        g.arc(hx + Math.cos(a) * r * 0.92, hy - r * 0.1 + Math.sin(a) * r * 0.95, r * 0.34, 0, Math.PI * 2);
        g.fill();
      }
      return;
    default:
      break;
  }
  g.beginPath();
  g.ellipse(hx, hy - r * 0.18, r * 1.0, r * 0.92, 0, Math.PI * 1.02, Math.PI * 1.98);
  // fringe swept to one side
  g.quadraticCurveTo(hx + r * (0.2 + turn * 0.3), hy - r * 0.5, hx - r * 0.98, hy - r * 0.12);
  g.fill();
  if (p.style === "bun") {
    g.beginPath();
    g.arc(hx - turn * r * 0.2, hy - r * 1.08, r * 0.42, 0, Math.PI * 2);
    g.fill();
  } else if (p.style === "ponytail" && Math.abs(turn) > 0.2) {
    limb(g, hx - Math.sign(turn) * r * 0.85, hy - r * 0.3, hx - Math.sign(turn) * r * 1.2, hy + r * 0.9, r * 0.38, hair);
  }
}

function drawHat(g: CanvasRenderingContext2D, hx: number, hy: number, r: number, acc: Acc, turn: number, p: Person) {
  if (acc === "beanie") {
    g.fillStyle = p.outfit === "worker" ? "#c2512f" : "#34495e";
    g.beginPath();
    g.ellipse(hx, hy - r * 0.38, r * 1.02, r * 0.78, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(hx - r * 1.02, hy - r * 0.45, r * 2.04, r * 0.28);
    return;
  }
  const guard = p.outfit === "guard" || p.outfit === "courier" || p.outfit === "staff";
  g.fillStyle = guard ? (p.outfit === "courier" ? "#b8241c" : "#1b2740") : "#24324a";
  g.beginPath();
  g.ellipse(hx, hy - r * 0.32, r * 1.04, r * 0.78, 0, Math.PI, Math.PI * 2);
  g.closePath();
  g.fill();
  const dir = Math.abs(turn) < 0.25 ? 0 : Math.sign(turn);
  g.fillStyle = guard ? (p.outfit === "courier" ? "#8f1b15" : "#111a2c") : "#1a2538";
  g.beginPath();
  if (dir === 0) g.ellipse(hx, hy - r * 0.3, r * 1.15, r * 0.2, 0, 0, Math.PI * 2);
  else g.ellipse(hx + dir * r * 0.95, hy - r * 0.32, r * 0.7, r * 0.18, 0, 0, Math.PI * 2);
  g.fill();
  if (p.outfit === "guard") {
    g.fillStyle = "#e3c25a";
    g.beginPath();
    g.arc(hx + turn * r * 0.3, hy - r * 0.62, r * 0.14, 0, Math.PI * 2);
    g.fill();
  }
}

/* ------------------------------------------------------------------ features for the matcher */

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const STYLES: HairStyle[] = ["short", "long", "bun", "bald", "curly", "ponytail", "buzz"];
const ACCS: Acc[] = ["none", "glasses", "cap", "hood", "beanie", "headscarf", "headphones"];
const OUTFITS: Outfit[] = ["casual", "pupil", "teacher", "guard", "cleaner", "courier", "coat", "hoodie", "sport", "nurse", "suit", "worker", "staff"];
const AGES: Age[] = ["child", "teen", "adult", "senior"];

/** Feature vector of a person as the camera "sees" them: colours and shape traits (the demo matcher's input). */
export function features(p: Person): number[] {
  const oneHot = <T>(v: T, list: T[], w = 1) => list.map((x) => (x === v ? w : 0));
  return [
    ...rgb(p.skin), ...rgb(p.hair), ...rgb(p.top), ...rgb(p.bottom),
    ...oneHot(p.style, STYLES), ...oneHot(p.acc ?? "none", ACCS), ...oneHot(p.outfit, OUTFITS, 0.7), ...oneHot(p.age, AGES, 0.7),
  ];
}

/** Distance between two people in feature space. */
export function distance(a: Person, b: Person) {
  const fa = features(a);
  const fb = features(b);
  return Math.sqrt(fa.reduce((s, v, i) => s + (v - fb[i]) ** 2, 0));
}
