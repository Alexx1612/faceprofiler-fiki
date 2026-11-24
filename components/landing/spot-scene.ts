/**
 * Canvas engine for the "Spot the stranger" game: a CCTV view of a school yard at night where the
 * remembered people and one stranger walk, enter and leave, and the visitor taps the stranger.
 *
 * Methodology:
 * - People are drawn from five traits (skin, hair colour, hair style, shirt, accessory); every pair in a
 *   round differs in at least two, so they can always be told apart (`makePeople`).
 * - World coordinates: x in [0, 1] across the yard, z in [0, 1] from the back wall (0) to the camera (1).
 *   A simple perspective maps feet to the screen: far people are higher, smaller and narrower apart.
 *   Everyone walks to random targets, sometimes idles, and sometimes leaves through a door or a side and
 *   comes back later. The stranger leaves rarely and only after 6 s on screen, and is away for at most
 *   1.4 s, so a round stays fair. Drawing is back to front (painter's order by z).
 * - The "machine" is honest and small: every frame it turns each visible person into a colour feature
 *   vector, finds the nearest remembered person and calls anyone farther than THRESH "Unknown_1".
 *   Its time per frame is measured with performance.now() over PASSES repeats (browsers round the timer
 *   to about 0.1 ms) and averaged over the round. It is a colour matcher, not the face engine.
 * - The CCTV look (grain, scanlines, vignette, colour grade, timestamp) is drawn over the scene; the
 *   static parts are pre-rendered once per size. The loop pauses when the canvas is off-screen or the
 *   tab is hidden, and the human timer only counts while the round is visible.
 */

export const SKIN = ["#f2d3b3", "#e0b48c", "#b9875e", "#7d5236"];
export const HAIR = ["#1f1a17", "#5b3a21", "#a8672e", "#d9b26a", "#8a8f99", "#b2442f"];
export const SHIRT = ["#e25c4b", "#f0a33a", "#e6d34a", "#4cae6a", "#3a9bd9", "#5d5fd6", "#b05ad1", "#e86fa6", "#3fbfb0", "#f4f4f4"];
export const STYLE = ["short", "long", "bun"] as const;
export const ACC = ["none", "glasses", "cap"] as const;
const NAMES = [
  "Ana", "Mihai", "Ioana", "Radu", "Elena", "Vlad", "Maria", "Andrei", "Sofia", "Tudor", "Irina",
  "Dan", "Clara", "Paul", "Bianca", "Matei", "Diana", "Victor", "Alina", "Luca", "Oana", "Sorin",
];

export type Person = { id: number; skin: number; hair: number; style: number; shirt: number; acc: number; name: string };

const attrs = (p: Person) => [p.skin, p.hair, p.style, p.shirt, p.acc];
const differs = (a: Person, b: Person) => attrs(a).filter((v, i) => v !== attrs(b)[i]).length;
const pick = (n: number) => Math.floor(Math.random() * n);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** `count` people; the last one is the stranger. Every pair differs in at least two traits. */
export function makePeople(count: number): Person[] {
  const out: Person[] = [];
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  while (out.length < count) {
    const p: Person = {
      id: out.length,
      skin: pick(SKIN.length),
      hair: pick(HAIR.length),
      style: pick(STYLE.length),
      shirt: pick(SHIRT.length),
      acc: pick(ACC.length),
      name: names[out.length] ?? `P${out.length + 1}`,
    };
    if (out.every((q) => differs(p, q) >= 2)) out.push(p);
  }
  return out;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Feature vector of a drawn person: colours as RGB, style and accessory one-hot. */
export function features(p: Person): number[] {
  const oneHot = (i: number, n: number) => Array.from({ length: n }, (_, k) => (k === i ? 1 : 0));
  return [...rgb(SKIN[p.skin]), ...rgb(HAIR[p.hair]), ...rgb(SHIRT[p.shirt]), ...oneHot(p.style, 3), ...oneHot(p.acc, 3)];
}

/* ------------------------------------------------------------------ drawing a person */

const PANTS = "#252d42";
const SHOE = "#0d0f14";

/**
 * Full-body person with its feet at (x, y) and height h. `phase` drives the walk cycle, `moving`
 * blends between walking and standing, `facing` (-1 left .. 1 right) turns the head and feet, `look`
 * adds an idle head turn.
 */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  p: Person,
  x: number,
  y: number,
  h: number,
  phase = 0,
  moving = 0,
  facing = 0,
  look = 0,
  shadow = true,
) {
  const u = h / 100;
  const s = Math.sin(phase) * moving;
  const side = 0.35 + 0.65 * Math.abs(facing);
  const bob = Math.abs(Math.cos(phase)) * 1.8 * u * moving;
  const turn = clamp(facing + look, -1, 1);

  if (shadow) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 20 * u);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 * u, 5.5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const hipY = y - 46 * u - bob;
  // legs (back one first)
  const leg = (dx: number, a: number, lift: number) => {
    const fx = x + dx + Math.sin(a) * 44 * u * side;
    const fy = hipY + Math.cos(a) * 44 * u - lift;
    ctx.strokeStyle = PANTS;
    ctx.lineWidth = 9.5 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + dx, hipY);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = SHOE;
    ctx.beginPath();
    ctx.ellipse(fx + facing * 3 * u, fy + 1.5 * u, 6 * u, 3.2 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const a = 0.5 * s;
  const liftA = Math.max(0, Math.sin(phase)) * 4 * u * moving * (1 - side);
  const liftB = Math.max(0, -Math.sin(phase)) * 4 * u * moving * (1 - side);
  leg(-4.5 * u, -a, liftB);
  leg(4.5 * u, a, liftA);

  const shY = y - 80 * u - bob;
  const shirt = SHIRT[p.shirt];
  const skin = SKIN[p.skin];

  // back arm
  const arm = (dx: number, ang: number, front: boolean) => {
    const sx = x + dx;
    const sy = shY + 4 * u;
    const ex = sx + Math.sin(ang) * 31 * u * side;
    const ey = sy + Math.cos(ang) * 31 * u;
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 7.5 * u;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (ex - sx) * 0.55, sy + (ey - sy) * 0.55);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 6 * u;
    ctx.beginPath();
    ctx.moveTo(sx + (ex - sx) * 0.5, sy + (ey - sy) * 0.5);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (front) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.arc(ex, ey, 3 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  arm(-13.5 * u, 0.55 * s, false);

  // torso
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(x - 15 * u, shY + 3 * u);
  ctx.quadraticCurveTo(x - 16 * u, shY - 2 * u, x - 9 * u, shY - 3 * u);
  ctx.lineTo(x + 9 * u, shY - 3 * u);
  ctx.quadraticCurveTo(x + 16 * u, shY - 2 * u, x + 15 * u, shY + 3 * u);
  ctx.lineTo(x + 13 * u, hipY + 3 * u);
  ctx.quadraticCurveTo(x, hipY + 6 * u, x - 13 * u, hipY + 3 * u);
  ctx.closePath();
  ctx.fill();
  // side shading: light comes from the lamps, so the far side is darker
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.moveTo(x + 4 * u, shY - 3 * u);
  ctx.lineTo(x + 9 * u, shY - 3 * u);
  ctx.quadraticCurveTo(x + 16 * u, shY - 2 * u, x + 15 * u, shY + 3 * u);
  ctx.lineTo(x + 13 * u, hipY + 3 * u);
  ctx.quadraticCurveTo(x + 8 * u, hipY + 5 * u, x + 4 * u, hipY + 5 * u);
  ctx.closePath();
  ctx.fill();

  arm(13.5 * u, -0.55 * s, true);

  // neck and head
  const hx = x + turn * 2 * u;
  const hy = y - 93 * u - bob;
  const r = 10.5 * u;
  const hair = HAIR[p.hair];
  const style = STYLE[p.style];
  ctx.fillStyle = skin;
  ctx.fillRect(x - 3.2 * u, shY - 9 * u, 6.4 * u, 8 * u);
  if (style === "long") {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(hx - r * 1.12, hy - 2 * u);
    ctx.quadraticCurveTo(hx - r * 1.25, shY + 4 * u, hx - r * 0.9, shY + 6 * u);
    ctx.lineTo(hx + r * 0.9, shY + 6 * u);
    ctx.quadraticCurveTo(hx + r * 1.25, shY + 4 * u, hx + r * 1.12, hy - 2 * u);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  // hair cap
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx, hy - 0.5 * u, r * 1.06, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(hx + turn * 3 * u, hy - r * 0.35, hx - r * 1.04, hy - 0.8 * u);
  ctx.fill();
  if (style === "bun") {
    ctx.beginPath();
    ctx.arc(hx - turn * 2 * u, hy - r * 1.2, 4.8 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // face
  const fx = hx + turn * 3.2 * u;
  ctx.fillStyle = "#1b1b1b";
  for (const d of [-3.8, 3.8]) {
    ctx.beginPath();
    ctx.arc(fx + d * u, hy + 1.2 * u, 1.25 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 1.1 * u;
  ctx.beginPath();
  ctx.arc(fx, hy + 4.2 * u, 2.6 * u, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  if (ACC[p.acc] === "glasses") {
    ctx.strokeStyle = "#0b0b0b";
    ctx.lineWidth = 1.4 * u;
    for (const d of [-3.8, 3.8]) {
      ctx.beginPath();
      ctx.arc(fx + d * u, hy + 1.2 * u, 3.3 * u, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(fx - 0.5 * u, hy + 1.2 * u);
    ctx.lineTo(fx + 0.5 * u, hy + 1.2 * u);
    ctx.stroke();
  } else if (ACC[p.acc] === "cap") {
    ctx.fillStyle = "#24324a";
    ctx.beginPath();
    ctx.arc(hx, hy - 1.5 * u, r * 1.1, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    const dir = Math.abs(turn) < 0.25 ? 0 : Math.sign(turn);
    ctx.fillStyle = "#1a2538";
    ctx.beginPath();
    if (dir === 0) ctx.ellipse(hx, hy - 1.5 * u, r * 1.2, 2.2 * u, 0, 0, Math.PI * 2);
    else ctx.ellipse(hx + dir * r * 1.05, hy - 1.8 * u, r * 0.75, 2 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ the scene */

type Actor = {
  p: Person;
  stranger: boolean;
  x: number;
  z: number;
  tx: number;
  tz: number;
  state: "walk" | "idle" | "away";
  exiting: boolean;
  timer: number;
  speed: number;
  phase: number;
  moving: number;
  facing: number;
  look: number;
  visibleFor: number;
  // per-frame screen box and machine label
  sx: number;
  sy: number;
  sh: number;
  visible: boolean;
  label: string;
  unknown: boolean;
};

export type SceneMode = "connecting" | "countdown" | "live" | "result" | "demo";
export type SceneResult = { correct: boolean; picked: string; human_ms: number; machine_ms: number };

type Options = {
  known: Person[];
  stranger: Person;
  demo: boolean;
  reduce: boolean;
  onLive?: () => void;
  onResult?: (r: SceneResult) => void;
  onSelect?: (index: number, total: number) => void;
  onMachine?: (ms: number) => void;
};

const DOORS = [0.2, 0.76];
const THRESH = 0.2;
const PASSES = 10;
const CYAN = "#4dd0ff";
const RED = "#ff4d5e";
const AMBER = "#ffb347";

export class SpotScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private o: Options;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private bg: HTMLCanvasElement | null = null;
  private fx: HTMLCanvasElement | null = null;
  private grain: HTMLCanvasElement[] = [];
  private actors: Actor[] = [];
  private knownF: number[][];
  mode: SceneMode;
  private modeT = 0;
  private clock = 0;
  private timeScale = 1;
  private raf = 0;
  private last = 0;
  private onScreen = true;
  private visible = true;
  private humanMs = 0;
  private mSum = 0;
  private mFrames = 0;
  private clicked: Actor | null = null;
  private sel = -1;
  private miss: { x: number; y: number; t: number } | null = null;
  private frame = 0;
  private stamp: number;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(canvas: HTMLCanvasElement, o: Options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.o = o;
    this.mode = o.demo ? "demo" : "connecting";
    this.knownF = o.known.map(features);
    const night = new Date();
    night.setHours(21, 40 + pick(15), pick(60));
    this.stamp = night.getTime();
    const all = [...o.known.map((p) => ({ p, s: false })), { p: o.stranger, s: true }];
    this.actors = all.map(({ p, s }) => this.spawn(p, s));
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting;
      this.kick();
    });
    this.io.observe(canvas);
    document.addEventListener("visibilitychange", this.onVis);
    this.resize();
    this.kick();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    this.visible = document.visibilityState === "visible";
    this.kick();
  };

  private kick() {
    const run = this.onScreen && this.visible;
    if (run && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  /* -------------------------------------------------------------- people movement */

  private spawn(p: Person, stranger: boolean): Actor {
    const a: Actor = {
      p, stranger, x: rand(0.08, 0.92), z: rand(0.08, 0.92), tx: 0, tz: 0, state: "walk", exiting: false,
      timer: 0, speed: rand(0.09, 0.14), phase: rand(0, 6), moving: 1, facing: 0, look: 0, visibleFor: 0,
      sx: 0, sy: 0, sh: 0, visible: false, label: "", unknown: false,
    };
    this.retarget(a);
    // a few known people start outside and walk in during the first seconds
    if (!stranger && Math.random() < 0.25) {
      a.state = "away";
      a.timer = rand(0.2, 2.2);
    }
    return a;
  }

  private retarget(a: Actor) {
    for (let i = 0; i < 6; i++) {
      a.tx = rand(0.06, 0.94);
      a.tz = rand(0.06, 0.94);
      if (Math.hypot(a.tx - a.x, a.tz - a.z) > 0.25) break;
    }
    a.exiting = false;
  }

  private enter(a: Actor) {
    a.state = "walk";
    a.visibleFor = 0;
    if (Math.random() < 0.55) {
      a.x = DOORS[pick(2)] + rand(-0.02, 0.02);
      a.z = -0.04;
    } else {
      a.x = Math.random() < 0.5 ? -0.1 : 1.1;
      a.z = rand(0.15, 0.9);
    }
    this.retarget(a);
  }

  private leave(a: Actor) {
    a.exiting = true;
    if (Math.random() < 0.55) {
      const d = DOORS[a.x < 0.5 ? 0 : 1];
      a.tx = d;
      a.tz = -0.05;
    } else {
      a.tx = a.x < 0.5 ? -0.12 : 1.12;
      a.tz = clamp(a.z + rand(-0.15, 0.15), 0.1, 0.95);
    }
  }

  private move(a: Actor, dt: number) {
    a.look = Math.sin(this.clock * 1.1 + a.p.id * 1.7) * (a.state === "idle" ? 0.7 : 0.18);
    if (a.state === "away") {
      a.timer -= dt;
      if (a.timer <= 0) this.enter(a);
      return;
    }
    if (a.state === "idle") {
      a.moving = Math.max(0, a.moving - dt * 4);
      a.timer -= dt;
      if (a.timer <= 0) {
        a.state = "walk";
        this.retarget(a);
      }
      return;
    }
    a.moving = Math.min(1, a.moving + dt * 4);
    const dx = a.tx - a.x;
    const dz = (a.tz - a.z) * 0.75;
    const dist = Math.hypot(dx, dz);
    const step = a.speed * dt * (this.o.reduce ? 0.4 : 1);
    if (dist <= step) {
      this.arrive(a);
      return;
    }
    a.x += (dx / dist) * step;
    a.z += ((dz / dist) * step) / 0.75;
    a.phase += step * 52;
    a.facing += (dx / dist - a.facing) * Math.min(1, dt * 6);
  }

  private arrive(a: Actor) {
    if (a.exiting) {
      a.state = "away";
      a.exiting = false;
      a.timer = a.stranger ? rand(0.7, 1.4) : rand(1.2, 3.6);
      a.x = -1;
      return;
    }
    const exitChance = a.stranger ? (a.visibleFor > 6 ? 0.12 : 0) : 0.22;
    if (this.mode !== "result" && Math.random() < exitChance) this.leave(a);
    else if (Math.random() < 0.25) {
      a.state = "idle";
      a.timer = rand(0.6, 1.6);
    } else this.retarget(a);
  }

  /* -------------------------------------------------------------- projection */

  private project(a: Actor) {
    const horizon = this.H * 0.4;
    const z = a.z;
    a.sy = horizon + (this.H - horizon) * (0.05 + 0.9 * z);
    a.sx = this.W / 2 + (a.x - 0.5) * this.W * (0.7 + 0.3 * z);
    a.sh = Math.min(this.H * 0.3, this.W * 0.42) * (0.5 + 0.62 * z);
    a.visible = a.state !== "away" && a.sx > -a.sh * 0.15 && a.sx < this.W + a.sh * 0.15 && a.z > -0.01;
  }

  private alpha(a: Actor) {
    return clamp((a.z + 0.04) / 0.09, 0, 1);
  }

  /* -------------------------------------------------------------- machine */

  private runMachine(list: Actor[]) {
    const t0 = performance.now();
    for (let pass = 0; pass < PASSES; pass++) {
      for (const a of list) {
        const f = features(a.p);
        let best = Infinity;
        let who = 0;
        for (let k = 0; k < this.knownF.length; k++) {
          const kv = this.knownF[k];
          let d = 0;
          for (let j = 0; j < kv.length; j++) d += (kv[j] - f[j]) ** 2;
          if (d < best) [best, who] = [d, k];
        }
        if (pass === PASSES - 1) {
          a.unknown = Math.sqrt(best) > THRESH;
          a.label = a.unknown ? "Unknown_1" : this.o.known[who].name;
        }
      }
    }
    const ms = (performance.now() - t0) / PASSES;
    if (this.mode === "live" || this.mode === "demo") {
      this.mSum += ms;
      this.mFrames++;
    }
  }

  machineMs() {
    return this.mFrames ? this.mSum / this.mFrames : 0;
  }

  /* -------------------------------------------------------------- update */

  private setMode(m: SceneMode) {
    this.mode = m;
    this.modeT = 0;
    if (m === "live") this.o.onLive?.();
  }

  private step(dt: number) {
    this.modeT += dt;
    this.frame++;
    if (this.mode === "connecting" && this.modeT > (this.o.reduce ? 0.4 : 1.2)) this.setMode("countdown");
    if (this.mode === "countdown" && this.modeT > 2.1) this.setMode("live");
    if (this.mode === "live") this.humanMs += dt * 1000;
    const target = this.mode === "result" ? 0.12 : 1;
    this.timeScale += (target - this.timeScale) * Math.min(1, dt * 5);
    const sdt = dt * this.timeScale;
    this.clock += sdt;
    for (const a of this.actors) {
      this.move(a, sdt);
      this.project(a);
      if (a.visible) a.visibleFor += sdt;
    }
    const vis = this.actors.filter((a) => a.visible);
    this.runMachine(vis);
    if (this.mode === "demo" && this.frame % 30 === 0) this.o.onMachine?.(this.machineMs());
    if (this.miss) {
      this.miss.t += dt;
      if (this.miss.t > 0.5) this.miss = null;
    }
  }

  /* -------------------------------------------------------------- input */

  /** Visible people from left to right (keyboard order). */
  private order() {
    return this.actors.filter((a) => a.visible).sort((a, b) => a.sx - b.sx);
  }

  /** True when (x, y) is on the drawn body of `a` (head circle, torso, legs), grown by `pad` pixels. */
  private onBody(a: Actor, x: number, y: number, pad: number) {
    const u = a.sh / 100;
    const hx = a.sx + clamp(a.facing + a.look, -1, 1) * 2 * u;
    const hy = a.sy - 93 * u;
    if (Math.hypot(x - hx, y - hy) < 12 * u + pad) return true;
    if (Math.abs(x - a.sx) < 16 * u + pad && y > a.sy - 84 * u - pad && y < a.sy - 42 * u) return true;
    return Math.abs(x - a.sx) < 11 * u + pad && y >= a.sy - 46 * u && y < a.sy + 3 * u + pad;
  }

  /**
   * Person under a tap: the frontmost person whose drawn body is at that point, which is the one the
   * visitor sees there (a head showing above someone nearer the camera counts). Taps just beside a body
   * fall back to the box whose body axis is closest.
   */
  private hit(x: number, y: number, pad: number): Actor | null {
    const vis = this.actors.filter((a) => a.visible).sort((a, b) => b.z - a.z);
    const exact = vis.find((a) => this.onBody(a, x, y, 0));
    if (exact) return exact;
    let best: Actor | null = null;
    let bestScore = Infinity;
    for (const a of vis) {
      const w = a.sh * 0.26 + pad;
      if (x < a.sx - w || x > a.sx + w || y < a.sy - a.sh - pad || y > a.sy + pad) continue;
      const score = Math.hypot((x - a.sx) / (a.sh * 0.26), (y - (a.sy - a.sh * 0.6)) / (a.sh * 0.6));
      if (score < bestScore) [best, bestScore] = [a, score];
    }
    return best;
  }

  tap(x: number, y: number, touch: boolean) {
    if (this.mode !== "live") return;
    const a = this.hit(x, y, touch ? 14 : 4);
    if (a) this.choose(a);
    else this.miss = { x, y, t: 0 };
  }

  cycle(d: number) {
    if (this.mode !== "live") return;
    const list = this.order();
    if (!list.length) return;
    const cur = list.findIndex((a) => this.actors.indexOf(a) === this.sel);
    const next = list[(cur + d + list.length) % list.length];
    this.sel = this.actors.indexOf(next);
    this.o.onSelect?.(list.indexOf(next) + 1, list.length);
  }

  pickSelected() {
    const a = this.actors[this.sel];
    if (this.mode === "live" && a?.visible) this.choose(a);
  }

  private choose(a: Actor) {
    this.clicked = a;
    const human = this.humanMs;
    this.setMode("result");
    const s = this.actors.find((x) => x.stranger)!;
    if (s.state === "away") {
      this.enter(s);
      s.x = clamp(s.x, 0.12, 0.88);
      s.z = Math.max(s.z, 0.35);
    }
    this.o.onResult?.({ correct: a.stranger, picked: a.p.name, human_ms: human, machine_ms: this.machineMs() });
  }

  /**
   * For automated tests only (the page enables it with ?sgtest): a point in CSS pixels where the
   * stranger (or a known person) is the one a tap would pick, or null while none is visible.
   */
  testPoint(stranger = true) {
    if (this.mode !== "live") return null;
    for (const a of this.actors.filter((x) => x.visible && x.stranger === stranger)) {
      const u = a.sh / 100;
      for (const [dx, dy] of [[0, -93], [0, -65], [0, -50], [0, -20], [-6, -93], [6, -93]]) {
        const x = a.sx + dx * u;
        const y = a.sy + dy * u;
        if (this.hit(x, y, 0) === a) return { x, y };
      }
    }
    return null;
  }

  /* -------------------------------------------------------------- rendering */

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.bg = this.paintBackground();
    this.fx = this.paintFx();
    if (!this.grain.length) this.grain = [0, 1, 2, 3].map(() => this.paintGrain());
    for (const a of this.actors) this.project(a);
    if (!this.raf) this.draw();
  }

  private layer() {
    const c = document.createElement("canvas");
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    return [c, g] as const;
  }

  /** School yard at night: sky, building with lit windows and doors, tiled floor, lamps. */
  private paintBackground() {
    const [c, g] = this.layer();
    const W = this.W;
    const H = this.H;
    const horizon = H * 0.4;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#060b18");
    sky.addColorStop(1, "#13213d");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizon);
    // stars
    g.fillStyle = "rgba(200,220,255,0.5)";
    for (let i = 0; i < 40; i++) g.fillRect(rand(0, W), rand(0, horizon * 0.35), 1, 1);
    // trees left and right
    g.fillStyle = "#070d1a";
    for (const [cx, r] of [[W * 0.02, H * 0.16], [W * 0.98, H * 0.18], [W * 0.1, H * 0.1]]) {
      g.beginPath();
      g.arc(cx, horizon - r * 0.6, r, 0, Math.PI * 2);
      g.fill();
    }
    // building
    const top = H * 0.1;
    const bx = W * 0.06;
    const bw = W * 0.88;
    const wall = g.createLinearGradient(0, top, 0, horizon);
    wall.addColorStop(0, "#1a2440");
    wall.addColorStop(1, "#232f4f");
    g.fillStyle = wall;
    g.fillRect(bx, top, bw, horizon - top);
    g.fillStyle = "#10182c";
    g.fillRect(bx - W * 0.01, top - H * 0.012, bw + W * 0.02, H * 0.014);
    // windows: two rows, a few lit warm
    const cols = W < 500 ? 7 : 12;
    const ww = (bw / cols) * 0.55;
    const wh = (horizon - top) * 0.2;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < cols; i++) {
        const x = bx + (bw / cols) * (i + 0.22);
        const y = top + (horizon - top) * (0.1 + row * 0.34);
        const lit = Math.random() < 0.28;
        g.fillStyle = lit ? "#ffd58a" : "#0d1528";
        g.fillRect(x, y, ww, wh);
        if (lit) {
          const glow = g.createRadialGradient(x + ww / 2, y + wh / 2, 0, x + ww / 2, y + wh / 2, ww * 1.4);
          glow.addColorStop(0, "rgba(255,200,120,0.25)");
          glow.addColorStop(1, "rgba(255,200,120,0)");
          g.fillStyle = glow;
          g.fillRect(x - ww, y - wh, ww * 3, wh * 3);
        }
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(x + ww / 2 - 0.5, y, 1, wh);
      }
    }
    // doors on the back wall
    for (const d of DOORS) {
      const dx = W / 2 + (d - 0.5) * W * 0.7;
      const dh = (horizon - top) * 0.42;
      const dw = dh * 0.62;
      const light = g.createLinearGradient(0, horizon - dh, 0, horizon);
      light.addColorStop(0, "#ffcf7a");
      light.addColorStop(1, "#ff9e45");
      g.fillStyle = "#0b1120";
      g.fillRect(dx - dw / 2 - 3, horizon - dh - 3, dw + 6, dh + 3);
      g.fillStyle = light;
      g.fillRect(dx - dw / 2, horizon - dh, dw, dh);
      const spill = g.createRadialGradient(dx, horizon, 0, dx, horizon, dw * 2.4);
      spill.addColorStop(0, "rgba(255,190,110,0.35)");
      spill.addColorStop(1, "rgba(255,190,110,0)");
      g.fillStyle = spill;
      g.fillRect(dx - dw * 2.4, horizon - dh, dw * 4.8, dh * 2.4);
    }
    // floor
    const floor = g.createLinearGradient(0, horizon, 0, H);
    floor.addColorStop(0, "#1e2638");
    floor.addColorStop(1, "#2b3448");
    g.fillStyle = floor;
    g.fillRect(0, horizon, W, H - horizon);
    g.strokeStyle = "rgba(150,170,210,0.08)";
    g.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const xf = W / 2 + (i / 8) * W * 0.35;
      const xn = W / 2 + (i / 8) * W * 0.5 * 1.25;
      g.beginPath();
      g.moveTo(xf, horizon);
      g.lineTo(xn, H);
      g.stroke();
    }
    for (let i = 1; i < 14; i++) {
      const t = (i / 14) ** 1.7;
      const y = horizon + (H - horizon) * t;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    // lamps: posts at the sides, warm pools of light
    for (const side of [-1, 1]) {
      // post near the back corner, lamp head with a halo, a soft warm pool on the floor below
      const px = W / 2 + side * W * 0.44;
      const base = horizon + (H - horizon) * 0.12;
      const top2 = base - H * 0.3;
      g.strokeStyle = "#0a0f1c";
      g.lineWidth = Math.max(2, W * 0.006);
      g.beginPath();
      g.moveTo(px, base);
      g.lineTo(px, top2);
      g.lineTo(px - side * W * 0.035, top2);
      g.stroke();
      const lx = px - side * W * 0.035;
      const halo = g.createRadialGradient(lx, top2 + 3, 0, lx, top2 + 3, W * 0.08);
      halo.addColorStop(0, "rgba(255,226,170,0.9)");
      halo.addColorStop(0.15, "rgba(255,210,150,0.35)");
      halo.addColorStop(1, "rgba(255,210,150,0)");
      g.fillStyle = halo;
      g.fillRect(lx - W * 0.08, top2 - W * 0.08, W * 0.16, W * 0.16);
      const cone = g.createLinearGradient(0, top2, 0, base + H * 0.25);
      cone.addColorStop(0, "rgba(255,214,150,0.16)");
      cone.addColorStop(1, "rgba(255,214,150,0)");
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(lx - 4, top2 + 4);
      g.lineTo(lx + 4, top2 + 4);
      g.lineTo(lx + W * 0.16, base + H * 0.25);
      g.lineTo(lx - W * 0.16, base + H * 0.25);
      g.closePath();
      g.fill();
      const pool = g.createRadialGradient(lx, base + H * 0.06, 0, lx, base + H * 0.06, W * 0.22);
      pool.addColorStop(0, "rgba(255,214,150,0.16)");
      pool.addColorStop(1, "rgba(255,214,150,0)");
      g.fillStyle = pool;
      g.beginPath();
      g.ellipse(lx, base + H * 0.06, W * 0.22, H * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    }
    const mid = g.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, W * 0.4);
    mid.addColorStop(0, "rgba(120,170,255,0.08)");
    mid.addColorStop(1, "rgba(120,170,255,0)");
    g.fillStyle = mid;
    g.fillRect(0, horizon, W, H - horizon);
    return c;
  }

  /** Scanlines, vignette and colour grade, drawn over everything. */
  private paintFx() {
    const [c, g] = this.layer();
    const W = this.W;
    const H = this.H;
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.62)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    return c;
  }

  private paintGrain() {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const g = c.getContext("2d")!;
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  private draw() {
    const g = this.ctx;
    const W = this.W;
    const H = this.H;
    if (!W || !this.bg || !this.fx) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const font = clamp(W / 38, 10, 14);

    if (this.mode === "connecting") {
      this.drawConnecting(g, font);
      return;
    }

    // zoom towards the stranger on the result
    const s = this.actors.find((a) => a.stranger)!;
    const z = this.mode === "result" ? 1 + 0.32 * ease((this.modeT - 0.7) / 1.1) : 1;
    g.save();
    if (z > 1) {
      const cx = clamp(s.sx, W / (2 * z), W - W / (2 * z));
      const cy = clamp(s.sy - s.sh * 0.5, H / (2 * z), H - H / (2 * z));
      g.translate(W / 2, H / 2);
      g.scale(z, z);
      g.translate(-cx, -cy);
    }
    g.drawImage(this.bg, 0, 0, W, H);
    const list = this.actors.filter((a) => a.visible).sort((a, b) => a.z - b.z);
    for (const a of list) {
      g.globalAlpha = this.alpha(a) * (0.78 + 0.22 * a.z);
      drawPerson(g, a.p, a.sx, a.sy, a.sh, a.phase, a.moving, a.facing, a.look);
    }
    g.globalAlpha = 1;

    // machine boxes: a scan sweep reveals them on the result; in the demo they are always on
    if (this.mode === "result" || this.mode === "demo") {
      const sweep = this.mode === "demo" ? W * 2 : ease(this.modeT / 0.7) * (W + 40);
      if (this.mode === "result" && sweep < W + 40) {
        g.fillStyle = "rgba(77,208,255,0.18)";
        g.fillRect(sweep - 30, 0, 30, H);
        g.fillStyle = "rgba(77,208,255,0.8)";
        g.fillRect(sweep, 0, 2, H);
      }
      // spotlight on the stranger: the rest of the yard darkens and the known boxes fade back
      const k = this.mode === "result" && s.visible ? ease((this.modeT - 0.5) / 0.8) : 0;
      if (k > 0) {
        const cx = s.sx;
        const cy = s.sy - s.sh * 0.5;
        const r = s.sh * 0.75;
        const spot = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6);
        spot.addColorStop(0, "rgba(0,0,0,0)");
        spot.addColorStop(1, `rgba(2,4,10,${0.62 * k})`);
        g.fillStyle = spot;
        g.fillRect(-W, -H, W * 3, H * 3);
        // the stranger steps out of the crowd: drawn again on top, so people in front cannot hide them
        g.globalAlpha = k;
        drawPerson(g, s.p, s.sx, s.sy, s.sh, s.phase, s.moving, s.facing, s.look, false);
        g.globalAlpha = 1;
      }
      const crowded = list.length > 8;
      for (const a of list) {
        if (a.sx >= sweep || a.unknown) continue;
        this.box(g, a, CYAN, crowded && a.sh < this.H * 0.22 ? "" : a.label, font, false, 1 - 0.7 * k);
      }
      if (this.clicked && !this.clicked.stranger && this.clicked.visible) this.box(g, this.clicked, AMBER, `✕ ${this.clicked.p.name}`, font, true);
      for (const a of list) if (a.sx < sweep && a.unknown) this.box(g, a, RED, a.label, font * 1.15, false, 1, 3);
    }
    // keyboard selection
    const sel = this.actors[this.sel];
    if (this.mode === "live" && sel?.visible) this.box(g, sel, "#ffffff", "▶", font, true);
    g.restore();

    // colour grade, grain, scanlines, vignette
    g.fillStyle = "rgba(8,40,52,0.16)";
    g.fillRect(0, 0, W, H);
    const gi = this.o.reduce ? 0 : this.frame % this.grain.length;
    const pat = g.createPattern(this.grain[gi], "repeat");
    if (pat) {
      g.globalAlpha = 0.07;
      g.globalCompositeOperation = "overlay";
      g.save();
      if (!this.o.reduce) g.translate(pick(160), pick(160));
      g.fillStyle = pat;
      g.fillRect(-160, -160, W + 320, H + 320);
      g.restore();
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
    }
    g.drawImage(this.fx, 0, 0, W, H);

    if (this.miss) {
      g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - this.miss.t / 0.5)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(this.miss.x, this.miss.y, 10 + this.miss.t * 40, 0, Math.PI * 2);
      g.stroke();
    }
    this.hud(g, font);
    if (this.mode === "countdown") this.drawCountdown(g);
  }

  private box(g: CanvasRenderingContext2D, a: Actor, color: string, label: string, font: number, dashed = false, alpha = 1, line = 2) {
    const w = a.sh * 0.5;
    const x = a.sx - w / 2;
    const y = a.sy - a.sh * 1.04;
    const h = a.sh * 1.08;
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = line - 0.5;
    g.setLineDash(dashed ? [5, 4] : []);
    g.strokeRect(x, y, w, h);
    g.setLineDash([]);
    // corner ticks like the app overlay
    g.lineWidth = line + 1;
    const t = Math.min(10, w * 0.25);
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      g.beginPath();
      g.moveTo(cx, cy + sy * t);
      g.lineTo(cx, cy);
      g.lineTo(cx + sx * t, cy);
      g.stroke();
    }
    if (label) {
      const fs = Math.max(9, font * 0.82);
      g.font = `700 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const tw = g.measureText(label).width + 8;
      g.fillStyle = color;
      g.fillRect(x - 1, y - fs - 5, tw, fs + 5);
      g.fillStyle = color === "#ffffff" || color === CYAN || color === AMBER ? "#04121c" : "#fff";
      g.fillText(label, x + 3, y - 4);
    }
    g.restore();
  }

  private hud(g: CanvasRenderingContext2D, font: number) {
    const W = this.W;
    const H = this.H;
    g.font = `600 ${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.fillStyle = "rgba(235,245,255,0.9)";
    g.shadowColor = "rgba(0,0,0,0.8)";
    g.shadowBlur = 4;
    g.fillText("CAM 02 · YARD", 12, 12 + font);
    const t = new Date(this.stamp + this.clock * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
    g.fillText(ts, 12, H - 12);
    const rec = this.mode === "result" ? "SLOW ×0.12" : "REC";
    const rw = g.measureText(rec).width;
    g.fillText(rec, W - 12 - rw, 12 + font);
    if (this.mode !== "result" && Math.floor(this.clock * 2) % 2 === 0) {
      g.fillStyle = "#ff3b3b";
      g.beginPath();
      g.arc(W - 20 - rw, 12 + font * 0.62, font * 0.32, 0, Math.PI * 2);
      g.fill();
    }
    if (this.mode === "live") {
      const s = (this.humanMs / 1000).toFixed(1);
      g.fillStyle = "rgba(235,245,255,0.9)";
      const label = `${s} s`;
      g.fillText(label, W - 12 - g.measureText(label).width, H - 12);
    }
    g.shadowBlur = 0;
  }

  private drawCountdown(g: CanvasRenderingContext2D) {
    const n = 3 - Math.floor(this.modeT / 0.7);
    if (n < 1) return;
    const f = (this.modeT % 0.7) / 0.7;
    const size = Math.min(this.W, this.H) * (this.o.reduce ? 0.3 : 0.42 - 0.12 * f);
    g.fillStyle = `rgba(2,6,14,${0.35 * (1 - f)})`;
    g.fillRect(0, 0, this.W, this.H);
    g.globalAlpha = this.o.reduce ? 1 : 1 - f * 0.7;
    g.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#e8f6ff";
    g.shadowColor = "rgba(77,208,255,0.8)";
    g.shadowBlur = 24;
    g.fillText(String(n), this.W / 2, this.H / 2);
    g.shadowBlur = 0;
    g.textAlign = "start";
    g.textBaseline = "alphabetic";
    g.globalAlpha = 1;
  }

  private drawConnecting(g: CanvasRenderingContext2D, font: number) {
    const W = this.W;
    const H = this.H;
    const k = ease((this.modeT - 0.55) / 0.6);
    g.fillStyle = "#03060c";
    g.fillRect(0, 0, W, H);
    if (k > 0 && (this.o.reduce || Math.random() > 0.25)) {
      g.globalAlpha = k;
      g.drawImage(this.bg!, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    const pat = g.createPattern(this.grain[this.frame % this.grain.length], "repeat");
    if (pat) {
      g.globalAlpha = 0.28 * (1 - k);
      g.fillStyle = pat;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (!this.o.reduce) {
      g.fillStyle = "rgba(200,230,255,0.08)";
      for (let i = 0; i < 3; i++) g.fillRect(0, rand(0, H), W, rand(2, 14));
    }
    g.drawImage(this.fx!, 0, 0, W, H);
    g.font = `600 ${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.fillStyle = "rgba(220,240,255,0.9)";
    const dots = ".".repeat(1 + (Math.floor(this.modeT * 6) % 3));
    const txt = `CONNECTING CAM 02${dots}`;
    g.fillText(txt, W / 2 - g.measureText("CONNECTING CAM 02...").width / 2, H / 2);
  }
}
