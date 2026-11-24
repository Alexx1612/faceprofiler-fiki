/**
 * Canvas engine for the "Spot the stranger" game: a CCTV view where an authored cast moves, and the
 * visitor taps the stranger (rounds 1-3) or the person about to cause harm (bonus round).
 *
 * Methodology:
 * - Scenarios (spot-scenarios.ts) give the place, the time, the cast and each person's behaviour. This
 *   file runs those behaviours (patrol, work, wait, cross, play, chat, sit, pace, visit, and for the bonus:
 *   follow, dealer/buyer hand-offs, aggressor escalation, play-fighting, a parent rushing, dancing), eases
 *   faces between expressions, and projects everyone into the view (spot-settings.ts) back to front.
 * - Rounds' "machine" is honest and small: every frame it turns each visible person into a feature vector
 *   (colours and shape traits, spot-cast.ts), finds the nearest remembered person and calls anyone
 *   farther than THRESH "Unknown_1". Its time per frame is measured over PASSES repeats and averaged.
 * - The bonus "machine" only uses OBSERVABLE BEHAVIOUR measured from the tracks: speed, approach speed
 *   towards the nearest person, closest distance, contacts, hand-offs, pushes, kicks, following the same
 *   person, reciprocity (play-fighting goes both ways). It never reads faces or emotions; expressions are
 *   animation only. Its risk score and readouts are computed from those numbers every frame.
 * - Look: camera drift, depth of field (far people slightly blurred where the browser supports canvas
 *   filters), per-place lighting and ambience, grain, scanlines, vignette, timestamp. The loop pauses when
 *   the canvas is off-screen or the tab is hidden; the human timer only counts while it runs.
 */

import {
  AGE_H, AGE_SPEED, NEUTRAL, drawCharacter, features, headOf, layoutOf,
  type Act, type Expr, type Mood, type Pose,
} from "@/components/landing/spot-cast";
import { type Beh, type Line, type Member, type Prop, type Scenario } from "@/components/landing/spot-scenarios";
import { SETTINGS, projector, seeded, type Projector, type Setting } from "@/components/landing/spot-settings";

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = (n: number) => Math.floor(Math.random() * n);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** World size in metres (x across, z deep), for the behaviour numbers. */
const MX = 20;
const MZ = 14;
const THRESH = 0.35;
const PASSES = 10;
const CYAN = "#4dd0ff";
const RED = "#ff4d5e";
const AMBER = "#ffb347";

export type SceneMode = "connecting" | "countdown" | "live" | "result" | "demo";
export type Lang = "en" | "ro";
export type SceneResult = {
  correct: boolean;
  picked: string;
  pickedRole: Line;
  pickedReadout: Line;
  targetReadout: Line;
  human_ms: number;
  machine_ms: number;
};

type Options = {
  scenario: Scenario;
  demo: boolean;
  reduce: boolean;
  lang: Lang;
  onLive?: () => void;
  onResult?: (r: SceneResult) => void;
  onSelect?: (index: number, total: number) => void;
  onMachine?: (ms: number) => void;
};

type Stats = {
  seen: number; // visible time (s)
  moved: number; // metres
  fast: number; // time running (s)
  approaches: number; // fast approaches ending close to someone, not returned
  vApproach: number; // max approach speed (m/s)
  minDist: number; // closest distance to anyone (m)
  contacts: number;
  handoffs: number;
  pushes: number;
  kicks: number;
  followT: number;
  mutual: number; // contacts that went both ways (play)
  call: number;
  dance: number;
  near: Set<number>;
};

type Actor = {
  m: Member;
  i: number;
  target: boolean;
  beh: Beh;
  mood: Mood;
  x: number;
  z: number;
  tx: number;
  tz: number;
  state: "walk" | "idle" | "away";
  timer: number;
  speed: number;
  run: number;
  runT: number;
  phase: number;
  moving: number;
  facing: number;
  look: number;
  back: number;
  sit: number;
  act: Act;
  actT: number;
  burst: number;
  toward: number;
  t: number;
  step: number;
  expr: Expr;
  blink: number;
  blinkT: number;
  gaze: number;
  gazeY: number;
  gazeT: number;
  breath: number;
  heart: number;
  sway: number;
  lv: number; // escalation level 0..1 (aggressor) or anxiety (rush, victim)
  carry: Member["carry"];
  visibleFor: number;
  sx: number;
  sy: number;
  sh: number;
  visible: boolean;
  label: string;
  unknown: boolean;
  risk: number;
  st: Stats;
  // behaviour memory
  bState: string;
  bT: number;
  other: number;
};

export class SpotScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private o: Options;
  private set: Setting;
  private sc: Scenario;
  private bonus: boolean;
  private P: Projector = projector(1, 1);
  private W = 0;
  private H = 0;
  private dpr = 1;
  private bg: HTMLCanvasElement | null = null;
  private fx: HTMLCanvasElement | null = null;
  private far: HTMLCanvasElement | null = null;
  private grain: HTMLCanvasElement[] = [];
  private actors: Actor[] = [];
  private props: (Prop & { hidden: boolean; wob: number })[] = [];
  private knownF: number[][] = [];
  private knownIdx: number[] = [];
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
  private blurOk: boolean;
  private lang: Lang;

  constructor(canvas: HTMLCanvasElement, o: Options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.o = o;
    this.lang = o.lang;
    this.sc = o.scenario;
    this.set = SETTINGS[this.sc.setting];
    this.bonus = this.sc.round === 3;
    this.mode = o.demo ? "demo" : "connecting";
    this.blurOk = "filter" in this.ctx;
    const t = new Date();
    t.setHours(this.sc.clock[0], this.sc.clock[1], pick(60));
    this.stamp = t.getTime();
    this.actors = this.sc.cast.map((m, i) => this.spawn(m, i));
    if (!this.bonus) {
      this.knownIdx = this.sc.cast.map((_, i) => i).filter((i) => i !== this.sc.target);
      this.knownF = this.knownIdx.map((i) => features(this.sc.cast[i]));
    }
    this.props = (this.sc.props ?? []).map((p) => ({ ...p, hidden: p.kind === "backpack", wob: 0 }));
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

  /** The CCTV clock (advances only while the scene runs). */
  sceneTime(): Date {
    return new Date(this.stamp + this.clock * 1000);
  }

  setLang(l: Lang) {
    this.lang = l;
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

  /* -------------------------------------------------------------- people */

  private spawn(m: Member, i: number): Actor {
    const s = this.set;
    const a: Actor = {
      m, i, target: i === this.sc.target, beh: m.beh, mood: m.mood ?? "calm",
      x: rand(s.area.x0, s.area.x1), z: rand(s.area.z0, s.area.z1), tx: 0, tz: 0, state: "walk", timer: 0,
      speed: 0.075 * AGE_SPEED[m.age] * rand(0.9, 1.1), run: 0, runT: 0, phase: rand(0, 6), moving: 0, facing: rand(-0.3, 0.3),
      look: 0, back: 0, sit: 0, act: "none", actT: 0, burst: 0, toward: 1, t: rand(0, 20), step: 0,
      expr: { ...NEUTRAL }, blink: 0, blinkT: rand(0.5, 3), gaze: 0, gazeY: 0, gazeT: rand(0.5, 2), breath: rand(0, 6),
      heart: rand(0, 6), sway: 0, lv: 0, carry: m.carry, visibleFor: 0, sx: 0, sy: 0, sh: 0, visible: false,
      label: "", unknown: false, risk: 0, bState: "", bT: 0, other: -1,
      st: { seen: 0, moved: 0, fast: 0, approaches: 0, vApproach: 0, minDist: 99, contacts: 0, handoffs: 0, pushes: 0, kicks: 0, followT: 0, mutual: 0, call: 0, dance: 0, near: new Set() },
    };
    a.tx = a.x;
    a.tz = a.z;
    this.initBeh(a);
    return a;
  }

  private gatePos(name: string): [number, number] {
    return this.set.gates[name] ?? [-0.12, 0.5];
  }

  private walkTo(a: Actor, x: number, z: number, run = 0) {
    a.tx = x;
    a.tz = z;
    a.state = "walk";
    a.run = run;
  }

  private idle(a: Actor, secs: number, act: Act = "none") {
    a.state = "idle";
    a.timer = secs;
    a.act = act;
  }

  private inArea(b: [number, number, number, number]) {
    return [rand(b[0], b[1]), rand(b[2], b[3])] as [number, number];
  }

  private initBeh(a: Actor) {
    const b = a.beh;
    switch (b.k) {
      case "patrol":
        [a.x, a.z] = b.pts[pick(b.pts.length)];
        a.step = pick(b.pts.length);
        this.walkTo(a, ...b.pts[a.step]);
        break;
      case "work":
      case "play":
      case "playfight": {
        [a.x, a.z] = this.inArea(b.area);
        this.walkTo(a, ...this.inArea(b.area), b.k === "work" ? 0 : 1);
        if (b.k === "work") this.idle(a, rand(1, 4), b.act ?? "none");
        break;
      }
      case "wait":
      case "dance":
      case "dealer":
        a.x = b.at[0] + rand(-0.02, 0.02);
        a.z = b.at[1] + rand(-0.02, 0.02);
        this.idle(a, rand(1, 4), b.k === "dance" ? "dance" : b.k === "wait" ? b.act ?? "none" : "none");
        break;
      case "chat":
        [a.x, a.z] = b.at;
        this.idle(a, 999);
        break;
      case "sit": {
        const seat = this.set.seats?.[b.seat];
        if (seat) [a.x, a.z] = seat;
        a.sit = 1;
        this.idle(a, 999, b.act ?? "none");
        break;
      }
      case "pace":
        [a.x, a.z] = b.a;
        this.walkTo(a, ...b.b);
        break;
      case "cross": {
        const f = this.gatePos(b.from);
        const t = this.gatePos(b.to);
        const k = rand(0.15, 0.75);
        a.x = lerp(f[0], t[0], k);
        a.z = clamp(lerp(f[1], t[1], k), 0.06, 0.94);
        if (b.from === b.to) this.walkTo(a, ...this.inArea([0.3, 0.7, 0.3, 0.7]));
        else this.walkTo(a, ...t);
        a.bState = "out";
        break;
      }
      case "visit":
      case "buyer":
      case "rush":
        a.state = "away";
        a.timer = b.k === "visit" ? rand(0.2, 0.9) : b.k === "buyer" ? b.delay : rand(1, 4);
        a.x = -1;
        break;
      case "follow": {
        const t = this.actors[b.target];
        a.x = t ? t.x - 0.08 : 0.3;
        a.z = t ? t.z - 0.04 : 0.4;
        break;
      }
      case "aggressor":
        [a.x, a.z] = this.inArea(b.area);
        this.idle(a, rand(2, 4), "phone");
        a.bState = "calm";
        break;
      default:
        break;
    }
  }

  /** Re-enter from a gate (used by visit, buyer, rush, cross). */
  private enterFrom(a: Actor, gate: string) {
    const [gx, gz] = this.gatePos(gate);
    a.x = gx;
    a.z = gz;
    a.state = "walk";
    a.visibleFor = 0;
  }

  private arrive(a: Actor) {
    const b = a.beh;
    a.run = 0;
    switch (b.k) {
      case "patrol":
        a.step = (a.step + 1) % b.pts.length;
        this.idle(a, rand(0.6, 1) * (b.pause ?? 2));
        break;
      case "work":
        this.idle(a, rand(3, 6), b.act ?? "none");
        break;
      case "wait":
        this.idle(a, rand(3, 8), b.act ?? "none");
        break;
      case "play":
        this.idle(a, rand(0.3, 1.2));
        break;
      case "pace":
        this.idle(a, rand(0.6, 1.6), b.act ?? "none");
        break;
      case "cross":
        if (a.bState === "out" && Math.hypot(a.x - this.gatePos(b.to)[0], a.z - this.gatePos(b.to)[1]) < 0.05) {
          a.state = "away";
          a.timer = rand(...(b.gap ?? [2, 4]));
          a.x = -1;
          a.bState = "back";
        } else if (b.from === b.to) this.walkTo(a, ...this.gatePos(b.to));
        else this.walkTo(a, ...this.gatePos(b.to));
        break;
      case "visit": {
        const act = b.acts?.[a.step] ?? "none";
        this.idle(a, rand(1.8, 3.2), act);
        break;
      }
      case "buyer": {
        if (a.bState === "going") {
          a.bState = "deal";
          const d = this.actors[b.dealer];
          this.idle(a, 2, "exchange");
          a.toward = d.x >= a.x ? 1 : -1;
          a.facing = a.toward * 0.6;
          if (d) {
            d.toward = a.x >= d.x ? 1 : -1;
            d.facing = d.toward * 0.6;
            d.bState = "deal";
            this.idle(d, 2, "exchange");
            d.st.handoffs++;
          }
          a.st.handoffs++;
        } else if (a.bState === "leaving") {
          a.state = "away";
          a.timer = rand(16, 22);
          a.x = -1;
          a.bState = "";
        }
        break;
      }
      case "rush":
        this.idle(a, 999);
        a.bState = "with";
        break;
      case "aggressor":
        if (a.bState === "kick") {
          this.idle(a, 0.7, "kick");
          a.burst = 0;
          a.st.kicks++;
          const bin = this.props.find((p) => p.kind === "bin");
          if (bin) bin.wob = 1;
        } else if (a.bState === "close") {
          this.idle(a, rand(2.5, 3.5), "fists");
          a.bState = "square";
        } else this.idle(a, rand(0.5, 1.4), a.lv > 0.3 ? "fists" : "none");
        break;
      default:
        this.idle(a, rand(1, 3));
        break;
    }
  }

  private afterIdle(a: Actor) {
    const b = a.beh;
    a.act = "none";
    switch (b.k) {
      case "patrol":
        this.walkTo(a, ...b.pts[a.step]);
        break;
      case "work":
        this.walkTo(a, ...this.inArea(b.area));
        a.act = "none";
        break;
      case "wait": {
        const r = b.roam ?? 0.03;
        this.walkTo(a, clamp(b.at[0] + rand(-r, r), 0.03, 0.97), clamp(b.at[1] + rand(-r, r), 0.05, 0.95));
        break;
      }
      case "play":
      case "playfight":
        this.walkTo(a, ...this.inArea(b.area), 1);
        break;
      case "pace": {
        const back = Math.hypot(a.x - b.a[0], a.z - b.a[1]) < Math.hypot(a.x - b.b[0], a.z - b.b[1]);
        this.walkTo(a, ...(back ? b.b : b.a));
        a.act = b.act ?? "none";
        break;
      }
      case "visit": {
        if (a.step === 0 && a.carry === "backpack") {
          const bp = this.props.find((p) => p.kind === "backpack");
          if (bp) {
            bp.hidden = false;
            a.carry = "none";
          }
        }
        a.step = (a.step + 1) % b.pts.length;
        this.walkTo(a, ...b.pts[a.step]);
        break;
      }
      case "dealer":
        if (a.bState === "deal") {
          a.bState = "count";
          this.idle(a, 2.4, "count");
          return;
        }
        a.bState = "";
        this.idle(a, rand(1.5, 3));
        break;
      case "buyer":
        if (a.bState === "deal") {
          a.bState = "leaving";
          this.walkTo(a, ...this.gatePos(b.to));
        }
        break;
      case "dance":
        this.idle(a, rand(3, 6), "dance");
        break;
      case "chat":
      case "sit":
      case "rush":
        this.idle(a, 999, b.k === "sit" ? b.act ?? "none" : "none");
        break;
      case "aggressor":
        this.aggressorNext(a);
        break;
      default:
        this.walkTo(a, ...this.inArea([0.2, 0.8, 0.2, 0.8]));
    }
  }

  /** Escalation over ~30 s: calm -> restless (pacing, kick) -> closing in -> squaring up -> push -> restless. */
  private aggressorNext(a: Actor) {
    const b = a.beh as Extract<Beh, { k: "aggressor" }>;
    const v = this.actors[b.target];
    const T = a.t % 32;
    if (a.bState === "square") {
      a.bState = "shove";
      a.burst = 0;
      this.idle(a, 0.8, "shove");
      a.st.pushes++;
      if (v) {
        v.x = clamp(v.x + Math.sign(v.x - a.x || 1) * 0.04, 0.04, 0.96);
        v.lv = 1;
      }
      return;
    }
    if (a.bState === "shove") {
      a.bState = "restless";
      this.walkTo(a, ...this.inArea(b.area));
      return;
    }
    if (T < 7) {
      a.bState = "calm";
      this.idle(a, rand(1.5, 3), "phone");
    } else if (T < 16) {
      if (b.kick && a.st.kicks === 0 && T > 11) {
        a.bState = "kick";
        this.walkTo(a, b.kick[0] - 0.035, b.kick[1] + 0.01);
        a.toward = 1;
      } else {
        a.bState = "restless";
        this.walkTo(a, ...this.inArea(b.area));
      }
    } else if (v) {
      a.bState = "close";
      const side = a.x < v.x ? -1 : 1;
      this.walkTo(a, v.x + side * 0.035, v.z + 0.005, 1);
    }
  }

  private move(a: Actor, dt: number) {
    a.t += dt;
    const b = a.beh;
    if (a.state === "away") {
      a.timer -= dt;
      if (a.timer <= 0) {
        if (b.k === "visit") {
          this.enterFrom(a, b.from);
          this.walkTo(a, ...b.pts[a.step]);
        } else if (b.k === "buyer") {
          const d = this.actors[b.dealer];
          this.enterFrom(a, b.from);
          a.bState = "going";
          this.walkTo(a, d.x + (b.from.startsWith("right") ? 0.045 : -0.045), d.z + 0.01);
        } else if (b.k === "rush") {
          this.enterFrom(a, b.from);
          const t = this.actors[b.to];
          a.bState = "going";
          this.walkTo(a, t.x - 0.04, t.z, 1);
        } else if (b.k === "cross") {
          const from = a.bState === "back" ? b.to : b.from;
          const to = a.bState === "back" ? b.from : b.to;
          this.enterFrom(a, from);
          a.bState = "out";
          a.beh = { ...b, from, to };
          if (from === to) this.walkTo(a, ...this.inArea([0.3, 0.7, 0.3, 0.7]));
          else this.walkTo(a, ...this.gatePos(to));
        } else this.enterFrom(a, "left");
      }
      return;
    }
    // continuous behaviours
    if (b.k === "follow") {
      const t = this.actors[b.target];
      if (t && t.state !== "away") {
        const gap = b.gap ?? 0.08;
        const dir = Math.sign(t.facing) || 1;
        a.tx = clamp(t.x - dir * gap, 0.03, 0.97);
        a.tz = clamp(t.z - 0.02, 0.05, 0.95);
        a.state = "walk";
        a.run = t.run * 0.6;
        a.toward = t.x >= a.x ? 1 : -1;
      }
    }
    if (b.k === "rush" && a.bState === "going") {
      const t = this.actors[b.to];
      if (t) {
        a.tx = t.x - 0.04;
        a.tz = t.z;
      }
    }
    if (a.state === "idle") {
      a.moving = Math.max(0, a.moving - dt * 4);
      a.timer -= dt;
      if (a.act === "kick" || a.act === "shove") a.burst = Math.min(1, a.burst + dt * 2.2);
      if (a.timer <= 0) this.afterIdle(a);
      return;
    }
    a.moving = Math.min(1, a.moving + dt * 4);
    const runK = a.run;
    const dx = a.tx - a.x;
    const dz = (a.tz - a.z) * 0.75;
    const dist = Math.hypot(dx, dz);
    const sp = a.speed * (1 + runK * (a.m.age === "child" ? 1.3 : 1.1)) * (this.o.reduce ? 0.4 : 1);
    const step = sp * dt;
    if (dist <= step) {
      a.x = a.tx;
      a.z = a.tz;
      if (b.k === "follow") return;
      this.arrive(a);
      return;
    }
    a.x += (dx / dist) * step;
    a.z += ((dz / dist) * step) / 0.75;
    a.phase += step * (52 - runK * 12) / Math.max(0.6, AGE_H[a.m.age]);
    a.facing += (dx / dist - a.facing) * Math.min(1, dt * 6);
    const away = dz < 0 && -dz > Math.abs(dx) * 0.7 ? 1 : 0;
    a.back += (away - a.back) * Math.min(1, dt * 5);
    a.st.moved += Math.hypot((dx / dist) * step * MX, ((dz / dist) * step) / 0.75 * MZ);
    if (runK > 0.5) a.st.fast += dt;
  }

  /* -------------------------------------------------------------- faces */

  private face(a: Actor, dt: number) {
    const m = a.mood;
    const T: Expr = { ...NEUTRAL };
    const talkBurst = Math.max(0, Math.sin(a.t * 0.55 + a.i * 1.3));
    const talking = (a.beh.k === "chat" && talkBurst > 0.2) || (a.act === "call" && Math.sin(a.t * 0.9 + a.i) > 0);
    switch (m) {
      case "happy":
        T.smile = 0.6 + 0.25 * Math.sin(a.t * 0.8 + a.i);
        T.brow = 0.25;
        T.open = a.run > 0.5 ? 0.35 : 0;
        break;
      case "excited":
        T.smile = 0.85;
        T.brow = 0.4;
        T.open = 0.2 + 0.3 * Math.max(0, Math.sin(a.t * 4));
        break;
      case "focused":
        T.brow = -0.12;
        T.gy = 0.75;
        T.smile = 0.02;
        break;
      case "bored":
        T.eye = 0.78;
        T.smile = -0.12;
        break;
      case "tired":
        T.eye = 0.62;
        T.tilt = 0.3;
        break;
      case "furtive":
        T.brow = -0.3;
        T.eye = 1.06;
        T.smile = -0.08;
        break;
      case "hostile": {
        const k = 0.35 + 0.65 * a.lv;
        T.brow = -0.9 * k;
        T.eye = 1 - 0.18 * k;
        T.smile = -0.5 * k;
        T.flush = 0.35 * a.lv;
        break;
      }
      case "anxious":
        T.worry = 0.75;
        T.brow = 0.25;
        T.smile = -0.3;
        T.eye = 1.1;
        break;
      case "loud": {
        const shout = Math.max(0, Math.sin(a.t * 2.2));
        T.brow = 0.5 * shout;
        T.open = 0.75 * shout;
        T.smile = 0.1;
        break;
      }
      default:
        T.smile = 0.12 + 0.08 * Math.sin(a.t * 0.3 + a.i);
    }
    if (talking) T.open = Math.max(T.open, 0.12 + 0.22 * Math.abs(Math.sin(a.t * 9 + a.i)));
    if (a.act === "phone" || a.act === "read") T.gy = 0.8;
    if (a.act === "shout") T.open = Math.max(T.open, 0.8 * Math.max(0, Math.sin(a.t * 2.2)));
    // a victim of the aggressor reacts: worried, looking at them
    if (a.lv > 0 && m !== "hostile") {
      T.worry = Math.max(T.worry, 0.8 * a.lv);
      T.smile = Math.min(T.smile, -0.3 * a.lv);
      a.lv = Math.max(0, a.lv - dt * 0.12);
    }
    T.gx = a.gaze;
    T.gy = T.gy || a.gazeY;
    const k = Math.min(1, dt * (m === "hostile" || m === "furtive" ? 5 : 3));
    for (const key of Object.keys(T) as (keyof Expr)[]) a.expr[key] = lerp(a.expr[key], T[key], k);

    // blinks
    a.blinkT -= dt;
    if (a.blinkT <= 0) {
      a.blink = 1;
      a.blinkT = m === "furtive" || m === "anxious" ? rand(0.9, 2.2) : rand(2.2, 5);
    }
    a.blink = Math.max(0, a.blink - dt * 8);
    // gaze and head: the furtive ones look around a lot
    a.gazeT -= dt;
    if (a.gazeT <= 0) {
      const wide = m === "furtive" || m === "anxious";
      a.gaze = rand(-1, 1) * (wide ? 1 : 0.5);
      a.gazeY = rand(-0.2, 0.3);
      a.gazeT = wide ? rand(0.4, 1.1) : rand(1.5, 4);
    }
    const lookTarget = a.gaze * (m === "furtive" || m === "anxious" ? 0.85 : 0.35) * (a.state === "idle" ? 1 : 0.5);
    a.look = lerp(a.look, lookTarget, Math.min(1, dt * 4));
    // breathing, heart (animation only), weight shift
    const rate = m === "hostile" ? 0.35 + 0.3 * a.lv : a.run > 0.5 ? 0.6 : a.m.age === "child" ? 0.4 : 0.26;
    a.breath += dt * Math.PI * 2 * rate;
    a.heart += dt * Math.PI * 2 * 1.2;
    a.sway = a.state === "idle" ? Math.sin(a.t * (a.act === "dance" ? 5.4 : 0.6) + a.i) * (a.act === "dance" ? 1.6 : 0.5) : 0;
    // facing while standing: towards the partner / target
    if (a.state === "idle") {
      const b = a.beh;
      const other = b.k === "chat" ? this.actors[b.with] : b.k === "aggressor" || b.k === "follow" ? this.actors[b.target] : b.k === "rush" ? this.actors[b.to] : null;
      if (other && other.state !== "away") {
        const d = other.x >= a.x ? 1 : -1;
        a.facing = lerp(a.facing, d * 0.55, Math.min(1, dt * 3));
        a.toward = d;
      } else if (a.act !== "exchange" && a.act !== "kick") a.facing = lerp(a.facing, 0, Math.min(1, dt * 0.8));
      a.back = lerp(a.back, 0, Math.min(1, dt * 3));
    }
    if (this.mode === "result" && a.target) {
      a.back = 0;
      a.facing = lerp(a.facing, 0.25 * Math.sign(a.facing || 1), Math.min(1, dt * 2));
    }
    if (a.beh.k === "aggressor") {
      const target = a.bState === "close" || a.bState === "square" || a.bState === "shove" ? 1 : a.bState === "restless" || a.bState === "kick" ? 0.5 : 0.1;
      a.lv = lerp(a.lv, target, Math.min(1, dt * 0.8));
    }
  }

  /* -------------------------------------------------------------- projection */

  private project(a: Actor) {
    const P = this.P;
    a.sy = P.sy(a.z);
    a.sx = P.sx(a.x, a.z);
    a.sh = P.sh(a.z) * AGE_H[a.m.age] * (this.sc.scale ?? this.set.scale);
    a.visible = a.state !== "away" && a.sx > -a.sh * 0.15 && a.sx < this.W + a.sh * 0.15 && a.z > -0.01;
  }

  private alpha(a: Actor) {
    return clamp((a.z + 0.04) / 0.09, 0, 1);
  }

  private pose(a: Actor): Pose {
    return {
      phase: a.phase, moving: a.moving, run: a.run, facing: a.facing, look: a.look, back: a.back, sit: a.sit,
      breath: a.breath, breathAmp: a.beh.k === "aggressor" ? 0.6 + 0.6 * a.lv : 0.45, act: a.act, t: a.t, expr: a.expr,
      blink: a.blink, heart: a.heart, sway: a.sway, toward: a.toward, burst: a.burst,
    };
  }

  /* -------------------------------------------------------------- machine */

  private runMachine(list: Actor[], dt: number) {
    const t0 = performance.now();
    if (!this.bonus) {
      for (let pass = 0; pass < PASSES; pass++) {
        for (const a of list) {
          const f = features({ ...a.m, carry: a.carry });
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
            a.label = a.unknown ? "Unknown_1" : this.sc.cast[this.knownIdx[who]].name;
          }
        }
      }
    } else {
      for (let pass = 0; pass < PASSES; pass++) this.behaviour(list, pass === PASSES - 1 ? dt : 0);
    }
    const ms = (performance.now() - t0) / PASSES;
    if (this.mode === "live" || this.mode === "demo") {
      this.mSum += ms;
      this.mFrames++;
    }
  }

  /**
   * Behaviour measurements from the tracks (bonus): closest person, approach speed towards them, contacts,
   * reciprocity, following; then a risk score. Only positions, speeds and observed actions are used.
   */
  private behaviour(list: Actor[], dt: number) {
    for (const a of list) {
      let nearest: Actor | null = null;
      let nd = Infinity;
      for (const b of list) {
        if (b === a) continue;
        const d = Math.hypot((a.x - b.x) * MX, (a.z - b.z) * MZ);
        if (d < nd) [nd, nearest] = [d, b];
      }
      if (!dt || !nearest) continue;
      const st = a.st;
      st.seen += dt;
      st.minDist = Math.min(st.minDist, nd);
      // approach speed: own velocity projected on the direction to the nearest person
      if (a.state === "walk") {
        const vx = (a.tx - a.x) * MX;
        const vz = (a.tz - a.z) * MZ;
        const vl = Math.hypot(vx, vz) || 1;
        const sp = a.speed * MX * (1 + a.run);
        const dirx = (nearest.x - a.x) * MX;
        const dirz = (nearest.z - a.z) * MZ;
        const dl = Math.hypot(dirx, dirz) || 1;
        const vApp = sp * ((vx * dirx + vz * dirz) / (vl * dl));
        if (vApp > 0 && nd < 4) st.vApproach = Math.max(st.vApproach, vApp);
      }
      if (nd < 0.9 && !st.near.has(nearest.i)) {
        st.near.add(nearest.i);
        st.contacts++;
        if (nearest.st.near.has(a.i)) {
          st.mutual++;
          nearest.st.mutual++;
        }
        if (a.st.vApproach > 1.6 && a.beh.k !== "playfight") st.approaches++;
      }
      if (nd > 2.2) st.near.delete(nearest.i);
      if (a.beh.k === "follow" && nd < 2.6 && a.state === "walk") st.followT += dt;
      if (a.act === "call") st.call += dt;
      if (a.act === "dance") st.dance += dt;
    }
    for (const a of list) {
      const s = a.st;
      const play = s.mutual > 0 && a.beh.k === "playfight";
      const follow = s.seen > 3 ? s.followT / s.seen : 0;
      a.risk = s.handoffs * 1.6 + s.pushes * 3 + s.kicks * 1.5 + s.approaches * 1.2 + (a.act === "fists" ? 1.2 : 0) + follow * 4 - (play ? 2 : 0);
    }
  }

  machineMs() {
    return this.mFrames ? this.mSum / this.mFrames : 0;
  }

  /** Behaviour readout for one person, in both languages (parts ordered by how telling they are). */
  readout(a: Actor, max = 3): Line {
    const s = a.st;
    const ro = this.lang === "ro";
    void ro;
    const num = (v: number, d = 1) => [v.toFixed(d), v.toFixed(d).replace(".", ",")];
    const parts: [string, string][] = [];
    if (s.handoffs > 0) parts.push([`${s.handoffs} hand-off${s.handoffs > 1 ? "s" : ""}`, `${s.handoffs} ${s.handoffs > 1 ? "schimburi" : "schimb"} de obiecte`]);
    const follow = s.seen > 3 ? Math.round((s.followT / s.seen) * 100) : 0;
    if (follow > 40) parts.push([`follows one person ${follow}%`, `urmărește aceeași persoană ${follow} %`]);
    if (s.pushes > 0) parts.push([`pushed ×${s.pushes}`, `a împins ×${s.pushes}`]);
    if (s.kicks > 0) parts.push(["kicked an object", "a lovit un obiect"]);
    const play = s.mutual > 0 && a.beh.k === "playfight";
    if (play) parts.push(["play, back-and-forth", "joacă, de ambele părți"]);
    else if (s.vApproach > 1.4) {
      const [e, r] = num(s.vApproach);
      parts.push([`approach ${e} m/s`, `apropiere ${r} m/s`]);
    }
    if (s.minDist < 1.2 && !play) {
      const [e, r] = num(s.minDist);
      parts.push([`proximity ${e} m`, `distanță ${r} m`]);
    }
    if (s.dance > 2) parts.push(["rhythmic movement", "mișcare ritmică"]);
    if (s.call > 2) parts.push(["phone call", "vorbește la telefon"]);
    const moving = s.seen > 0 ? s.fast / s.seen > 0.3 ? ["running", "aleargă"] : s.moved / Math.max(1, s.seen) > 0.4 ? ["walking", "merge"] : ["standing", "stă pe loc"] : ["standing", "stă pe loc"];
    parts.push(moving as [string, string]);
    if (s.contacts === 0) parts.push(["no contact", "fără contact"]);
    const pick2 = parts.slice(0, max);
    return [pick2.map((p) => p[0]).join(" · "), pick2.map((p) => p[1]).join(" · ")];
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
      this.face(a, sdt);
      this.project(a);
      if (a.visible) a.visibleFor += sdt;
    }
    for (const p of this.props) p.wob = Math.max(0, p.wob - dt * 0.8);
    const vis = this.actors.filter((a) => a.visible);
    this.runMachine(vis, this.mode === "result" ? 0 : sdt);
    if (this.mode === "demo" && this.frame % 30 === 0) this.o.onMachine?.(this.machineMs());
    if (this.miss) {
      this.miss.t += dt;
      if (this.miss.t > 0.5) this.miss = null;
    }
  }

  /* -------------------------------------------------------------- input */

  private order() {
    return this.actors.filter((a) => a.visible).sort((a, b) => a.sx - b.sx);
  }

  /** True when (x, y) is on the drawn body of `a` (head, torso, legs), grown by `pad` pixels. */
  private onBody(a: Actor, x: number, y: number, pad: number) {
    const u = a.sh / 100;
    const L = layoutOf(a.m);
    const h = headOf(a.m, a.sx, a.sy, a.sh, { sit: a.sit, facing: a.facing, look: a.look, moving: a.moving, phase: a.phase });
    if (Math.hypot(x - h.x, y - h.y) < h.r * 1.15 + pad) return true;
    const drop = a.sit * L.leg * 0.45 * u;
    const shY = a.sy + L.sh * u + drop;
    const hipY = a.sy + L.hip * u + drop;
    if (Math.abs(x - a.sx) < (L.shW + 1) * u + pad && y > shY - 4 * u - pad && y < hipY) return true;
    return Math.abs(x - a.sx) < 11 * u + pad && y >= hipY && y < a.sy + 3 * u + pad;
  }

  private hit(x: number, y: number, pad: number): Actor | null {
    const vis = this.actors.filter((a) => a.visible).sort((a, b) => b.z - a.z);
    const exact = vis.find((a) => this.onBody(a, x, y, 0));
    if (exact) return exact;
    let best: Actor | null = null;
    let bestScore = Infinity;
    for (const a of vis) {
      const w = a.sh * 0.28 + pad;
      if (x < a.sx - w || x > a.sx + w || y < a.sy - a.sh - pad || y > a.sy + pad) continue;
      const score = Math.hypot((x - a.sx) / (a.sh * 0.28), (y - (a.sy - a.sh * 0.6)) / (a.sh * 0.6));
      if (score < bestScore) [best, bestScore] = [a, score];
    }
    return best;
  }

  tap(x: number, y: number, touch: boolean) {
    if (this.mode !== "live") return;
    const p = this.screenToWorld(x, y);
    const a = this.hit(p.x, p.y, touch ? 14 : 4);
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
    const s = this.actors[this.sc.target];
    s.back = 0;
    if (s.state === "away") {
      this.enterFrom(s, Object.keys(this.set.gates)[0]);
      s.x = clamp(s.x, 0.12, 0.88);
      s.z = clamp(s.z, 0.3, 0.8);
      s.state = "idle";
      s.timer = 99;
    }
    this.o.onResult?.({
      correct: a.target,
      picked: a.m.name,
      pickedRole: a.m.role,
      pickedReadout: this.bonus ? this.readout(a) : ["", ""],
      targetReadout: this.bonus ? this.readout(s) : ["", ""],
      human_ms: human,
      machine_ms: this.machineMs(),
    });
  }

  /** For automated tests only (?sgtest, webdriver): a point a tap would resolve to the target (or not). */
  testPoint(target = true) {
    if (this.mode !== "live") return null;
    const xf = this.view();
    for (const a of this.actors.filter((x) => x.visible && x.target === target)) {
      const u = a.sh / 100;
      const h = headOf(a.m, a.sx, a.sy, a.sh, { sit: a.sit, facing: a.facing, look: a.look, moving: a.moving, phase: a.phase });
      for (const [px, py] of [[h.x, h.y], [a.sx, a.sy - 60 * u], [a.sx, a.sy - 50 * u], [a.sx, a.sy - 20 * u]]) {
        if (this.hit(px, py, 0) === a) return { x: (px - xf.cx) * xf.z + this.W / 2 + xf.ox, y: (py - xf.cy) * xf.z + this.H / 2 + xf.oy };
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
    this.P = projector(this.W, this.H);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.bg = this.paintBackground();
    this.fx = this.paintFx();
    this.far = document.createElement("canvas");
    this.far.width = this.canvas.width;
    this.far.height = this.canvas.height;
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

  private paintBackground() {
    const [c, g] = this.layer();
    let h = 0;
    for (const ch of this.set.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
    this.set.paint(g, this.P, seeded(h));
    return c;
  }

  private paintFx() {
    const [c, g] = this.layer();
    const W = this.W;
    const H = this.H;
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${this.set.light === "day" ? 0.42 : 0.62})`);
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

  /** The camera transform: slow drift, and on the result a zoom towards the target. */
  private view() {
    const W = this.W;
    const H = this.H;
    const s = this.actors[this.sc.target];
    const drift = this.o.reduce ? 0 : 1;
    let z = 1.025 + 0.008 * Math.sin(this.clock * 0.07) * drift;
    let cx = W / 2 + Math.sin(this.clock * 0.11) * W * 0.006 * drift;
    let cy = H / 2 + Math.cos(this.clock * 0.09) * H * 0.005 * drift;
    if (this.mode === "result") {
      const k = ease((this.modeT - 0.7) / 1.1);
      z = lerp(z, 1.32, k);
      cx = lerp(cx, clamp(s.sx, W / (2 * 1.32), W - W / (2 * 1.32)), k);
      cy = lerp(cy, clamp(s.sy - s.sh * 0.5, H / (2 * 1.32), H - H / (2 * 1.32)), k);
    }
    return { z, cx, cy, ox: 0, oy: 0 };
  }

  private screenToWorld(x: number, y: number) {
    const v = this.view();
    return { x: (x - this.W / 2 - v.ox) / v.z + v.cx, y: (y - this.H / 2 - v.oy) / v.z + v.cy };
  }

  private drawProp(g: CanvasRenderingContext2D, p: Prop & { wob: number }) {
    const x = this.P.sx(p.at[0], p.at[1]);
    const y = this.P.sy(p.at[1]);
    const u = this.P.sh(p.at[1]) * (this.sc.scale ?? this.set.scale) / 100;
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(p.wob * 18) * p.wob * 0.25);
    if (p.kind === "bin") {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.ellipse(0, 0, 10 * u, 3 * u, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#4f6b4a";
      g.fillRect(-8 * u, -26 * u, 16 * u, 26 * u);
      g.fillStyle = "#3c5238";
      g.fillRect(-9 * u, -28 * u, 18 * u, 4 * u);
    } else {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.ellipse(0, 0, 9 * u, 2.5 * u, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3c6b3f";
      g.beginPath();
      g.moveTo(-8 * u, 0);
      g.lineTo(-7 * u, -16 * u);
      g.quadraticCurveTo(0, -21 * u, 7 * u, -16 * u);
      g.lineTo(8 * u, 0);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(-6 * u, -8 * u, 12 * u, 2 * u);
    }
    g.restore();
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
    const v = this.view();
    const s = this.actors[this.sc.target];
    g.save();
    g.translate(W / 2 + v.ox, H / 2 + v.oy);
    g.scale(v.z, v.z);
    g.translate(-v.cx, -v.cy);
    g.drawImage(this.bg, 0, 0, W, H);
    this.set.ambient?.(g, this.P, this.clock);

    // people and props back to front; the far ones go through a light blur (depth of field)
    type Item = { z: number; draw: (c: CanvasRenderingContext2D) => void };
    const items: Item[] = [];
    const list = this.actors.filter((a) => a.visible).sort((a, b) => a.z - b.z);
    const night = this.set.light === "night" || this.set.light === "dusk";
    for (const a of list) {
      items.push({
        z: a.z,
        draw: (c) => {
          c.globalAlpha = this.alpha(a) * (night ? 0.8 + 0.2 * a.z : 1);
          drawCharacter(c, { ...a.m, carry: a.carry }, a.sx, a.sy, a.sh, this.pose(a));
          c.globalAlpha = 1;
        },
      });
    }
    for (const p of this.props) if (!p.hidden) items.push({ z: p.at[1], draw: (c) => this.drawProp(c, p) });
    items.sort((a, b) => a.z - b.z);
    const farZ = 0.26;
    const farItems = items.filter((i) => i.z < farZ);
    if (this.blurOk && this.far && farItems.length && !this.o.reduce) {
      const fg = this.far.getContext("2d")!;
      fg.setTransform(1, 0, 0, 1, 0, 0);
      fg.clearRect(0, 0, this.far.width, this.far.height);
      fg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      for (const it of farItems) it.draw(fg);
      g.filter = "blur(0.9px)";
      g.drawImage(this.far, 0, 0, W, H);
      g.filter = "none";
    } else for (const it of farItems) it.draw(g);
    for (const it of items) if (it.z >= farZ) it.draw(g);
    this.set.over?.(g, this.P, this.clock);

    if (this.mode === "result" || this.mode === "demo") this.overlays(g, list, s, font);
    const sel = this.actors[this.sel];
    if (this.mode === "live" && sel?.visible) this.box(g, sel, "#ffffff", "▶", font, true);
    g.restore();

    // colour grade, grain, scanlines, vignette
    g.fillStyle = this.set.grade;
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

  /** Result overlays: scan sweep, spotlight on the target, boxes with names (rounds) or behaviour readouts (bonus). */
  private overlays(g: CanvasRenderingContext2D, list: Actor[], s: Actor, font: number) {
    const W = this.W;
    const H = this.H;
    const sweep = this.mode === "demo" ? W * 2 : ease(this.modeT / 0.7) * (W + 40);
    if (this.mode === "result" && sweep < W + 40) {
      g.fillStyle = "rgba(77,208,255,0.18)";
      g.fillRect(sweep - 30, 0, 30, H);
      g.fillStyle = "rgba(77,208,255,0.8)";
      g.fillRect(sweep, 0, 2, H);
    }
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
      g.globalAlpha = k;
      drawCharacter(g, { ...s.m, carry: s.carry }, s.sx, s.sy, s.sh, this.pose(s), false);
      g.globalAlpha = 1;
    }
    const ro = this.lang === "ro" ? 1 : 0;
    const crowded = list.length > 8;
    const narrow = W < 560;
    for (const a of list) {
      if (a.sx >= sweep || a.target) continue;
      if (this.bonus) {
        const isClicked = a === this.clicked;
        const text = isClicked ? this.readout(a, narrow ? 2 : 3)[ro] : narrow ? "" : this.readout(a, 1)[ro];
        const name = a.m.name === "?" ? a.m.role[ro] : a.m.name;
        this.box(g, a, isClicked ? AMBER : CYAN, isClicked ? `✕ ${name}` : "", font, isClicked, isClicked ? 1 : (narrow ? 0.55 : 1) - 0.5 * k, 2, text);
      } else this.box(g, a, CYAN, crowded && a.sh < H * 0.22 ? "" : a.label, font, false, 1 - 0.7 * k);
    }
    if (!this.bonus && this.clicked && !this.clicked.target && this.clicked.visible) this.box(g, this.clicked, AMBER, `✕ ${this.clicked.m.name}`, font, true);
    if (s.visible && s.sx < sweep) {
      if (this.bonus) this.box(g, s, RED, ro ? "ALERTĂ" : "ALERT", font * 1.1, false, 1, 3, this.readout(s, narrow ? 2 : 3)[ro], true);
      else this.box(g, s, RED, s.label || "Unknown_1", font * 1.15, false, 1, 3);
    }
  }

  private box(
    g: CanvasRenderingContext2D, a: Actor, color: string, label: string, font: number, dashed = false, alpha = 1, line = 2,
    readout = "", strong = false,
  ) {
    const w = a.sh * 0.52;
    const x = a.sx - w / 2;
    const top = a.sy - a.sh * (1.04 - a.sit * 0.2);
    const h = a.sy - top + a.sh * 0.04;
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = line - 0.5;
    g.setLineDash(dashed ? [5, 4] : []);
    g.strokeRect(x, top, w, h);
    g.setLineDash([]);
    g.lineWidth = line + 1;
    const t = Math.min(10, w * 0.25);
    for (const [cx, cy, sx, sy] of [[x, top, 1, 1], [x + w, top, -1, 1], [x, top + h, 1, -1], [x + w, top + h, -1, -1]]) {
      g.beginPath();
      g.moveTo(cx, cy + sy * t);
      g.lineTo(cx, cy);
      g.lineTo(cx + sx * t, cy);
      g.stroke();
    }
    const fs = Math.max(9, font * 0.82);
    let ly = top - 4;
    if (readout) {
      const rs = Math.max(8.5, font * (strong ? 0.78 : 0.68));
      g.font = `600 ${rs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const tw = g.measureText(readout).width + 8;
      const rx = clamp(x - 1, 2, this.W - tw - 2);
      g.fillStyle = "rgba(4,10,18,0.82)";
      g.fillRect(rx, ly - rs - 4, tw, rs + 5);
      g.fillStyle = strong ? "#ffd1d6" : "#d9f3ff";
      g.fillText(readout, rx + 4, ly - 3);
      if (strong) {
        // live activity trace under the readout: bursts where the person moved fast
        g.strokeStyle = RED;
        g.lineWidth = 1.4;
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const px = rx + (tw * i) / 40;
          const ph = this.clock * 6 + i * 0.6;
          const amp = (Math.sin(ph) > 0.6 ? 1 : 0.25) * 4;
          const py = ly - rs - 9 + Math.sin(ph * 2.3) * amp;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        }
        g.stroke();
        ly -= 8;
      }
      ly -= rs + 5;
    }
    if (label) {
      g.font = `700 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const tw = g.measureText(label).width + 8;
      const lx = clamp(x - 1, 2, this.W - tw - 2);
      g.fillStyle = color;
      g.fillRect(lx, ly - fs - 1, tw, fs + 5);
      g.fillStyle = color === "#ffffff" || color === CYAN || color === AMBER ? "#04121c" : "#fff";
      g.fillText(label, lx + 4, ly);
    }
    g.restore();
  }

  private hud(g: CanvasRenderingContext2D, font: number) {
    const W = this.W;
    const H = this.H;
    g.font = `600 ${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.fillStyle = "rgba(235,245,255,0.92)";
    g.shadowColor = "rgba(0,0,0,0.85)";
    g.shadowBlur = 4;
    g.fillText(this.set.cam, 12, 12 + font);
    const t = this.sceneTime();
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
      const label = `${(this.humanMs / 1000).toFixed(1)} s`;
      g.fillStyle = "rgba(235,245,255,0.9)";
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
    const cam = this.set.cam.split(" · ")[0];
    const dots = ".".repeat(1 + (Math.floor(this.modeT * 6) % 3));
    const txt = `CONNECTING ${cam}${dots}`;
    g.fillText(txt, W / 2 - g.measureText(`CONNECTING ${cam}...`).width / 2, H / 2);
  }
}
