/**
 * Places for the "Spot the stranger" game: the camera view's projection, a static background painted once
 * per size, and animated ambience (passing trains and cars, flickering lights, string lights, flags).
 *
 * Methodology: every setting uses the same simple perspective (`project`): world x in [0, 1] across the
 * view, z in [0, 1] from the back (0) to the camera (1); the horizon sits at 40 % of the height. Seats,
 * doors and racks are painted with that same projection, so people stand and sit on them correctly.
 * Painting uses a seeded random generator, so a resize repaints the same picture.
 */

export type Light = "night" | "dusk" | "day" | "indoor";
export type Projector = {
  W: number;
  H: number;
  horizon: number;
  sx: (x: number, z: number) => number;
  sy: (z: number) => number;
  /** Height in pixels of an adult standing at depth z. */
  sh: (z: number) => number;
};

export type Setting = {
  id: string;
  cam: string;
  light: Light;
  /** Colour grade drawn over the whole frame. */
  grade: string;
  /** People scale (bonus scenes come closer to the camera). */
  scale: number;
  area: { x0: number; x1: number; z0: number; z1: number };
  /** Named entry/exit points (off-screen or at doors). */
  gates: Record<string, [number, number]>;
  seats?: [number, number][];
  paint: (g: CanvasRenderingContext2D, P: Projector, rnd: () => number) => void;
  ambient?: (g: CanvasRenderingContext2D, P: Projector, t: number) => void;
  over?: (g: CanvasRenderingContext2D, P: Projector, t: number) => void;
};

export function projector(W: number, H: number, scale = 1): Projector {
  const horizon = H * 0.4;
  return {
    W,
    H,
    horizon,
    sx: (x, z) => W / 2 + (x - 0.5) * W * (0.7 + 0.3 * z),
    sy: (z) => horizon + (H - horizon) * (0.05 + 0.9 * z),
    sh: (z) => Math.min(H * 0.3, W * 0.42) * (0.5 + 0.62 * z) * scale,
  };
}

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ shared painting helpers */

function grad(g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const l = g.createLinearGradient(0, y0, 0, y1);
  for (const [k, c] of stops) l.addColorStop(k, c);
  return l;
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${color},${a})`);
  gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Tiled or planked floor from the horizon to the bottom, with perspective lines. */
function floor(g: CanvasRenderingContext2D, P: Projector, top: string, bottom: string, lines: string, rows = 14, cols = 8) {
  const { W, H, horizon } = P;
  g.fillStyle = grad(g, horizon, H, [[0, top], [1, bottom]]);
  g.fillRect(0, horizon, W, H - horizon);
  g.strokeStyle = lines;
  g.lineWidth = 1;
  for (let i = -cols; i <= cols; i++) {
    g.beginPath();
    g.moveTo(P.sx(0.5 + (i / cols) * 0.5, 0), P.sy(-0.05));
    g.lineTo(P.sx(0.5 + (i / cols) * 0.5, 1.15), H);
    g.stroke();
  }
  for (let i = 1; i < rows; i++) {
    const y = horizon + (H - horizon) * (i / rows) ** 1.7;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
}

function lamp(g: CanvasRenderingContext2D, P: Projector, side: number, warm = true) {
  const { W, H, horizon } = P;
  const px = W / 2 + side * W * 0.44;
  const base = horizon + (H - horizon) * 0.12;
  const top = base - H * 0.3;
  g.strokeStyle = "#0a0f1c";
  g.lineWidth = Math.max(2, W * 0.006);
  g.beginPath();
  g.moveTo(px, base);
  g.lineTo(px, top);
  g.lineTo(px - side * W * 0.035, top);
  g.stroke();
  const lx = px - side * W * 0.035;
  const col = warm ? "255,214,150" : "200,225,255";
  glow(g, lx, top + 3, W * 0.08, col, 0.8);
  const cone = g.createLinearGradient(0, top, 0, base + H * 0.25);
  cone.addColorStop(0, `rgba(${col},0.15)`);
  cone.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(lx - 4, top + 4);
  g.lineTo(lx + 4, top + 4);
  g.lineTo(lx + W * 0.16, base + H * 0.25);
  g.lineTo(lx - W * 0.16, base + H * 0.25);
  g.closePath();
  g.fill();
  const pool = g.createRadialGradient(lx, base + H * 0.06, 0, lx, base + H * 0.06, W * 0.22);
  pool.addColorStop(0, `rgba(${col},0.15)`);
  pool.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = pool;
  g.beginPath();
  g.ellipse(lx, base + H * 0.06, W * 0.22, H * 0.08, 0, 0, Math.PI * 2);
  g.fill();
}

function sky(g: CanvasRenderingContext2D, P: Projector, light: Light, rnd: () => number) {
  const { W, horizon } = P;
  if (light === "day") {
    g.fillStyle = grad(g, 0, horizon, [[0, "#6fa7d8"], [1, "#cfe3ef"]]);
    g.fillRect(0, 0, W, horizon);
    g.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 4; i++) {
      const cx = rnd() * W;
      const cy = rnd() * horizon * 0.4;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(cx + k * W * 0.025, cy + (k % 2) * 4, W * 0.05, horizon * 0.05, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (light === "dusk") {
    g.fillStyle = grad(g, 0, horizon, [[0, "#1b2048"], [0.55, "#6a3f6b"], [1, "#e0875a"]]);
    g.fillRect(0, 0, W, horizon);
  } else {
    g.fillStyle = grad(g, 0, horizon, [[0, "#060b18"], [1, "#13213d"]]);
    g.fillRect(0, 0, W, horizon);
    g.fillStyle = "rgba(200,220,255,0.5)";
    for (let i = 0; i < 40; i++) g.fillRect(rnd() * W, rnd() * horizon * 0.35, 1, 1);
  }
}

function trees(g: CanvasRenderingContext2D, P: Projector, color: string) {
  const { W, H, horizon } = P;
  g.fillStyle = color;
  for (const [cx, r] of [[W * 0.02, H * 0.16], [W * 0.98, H * 0.18], [W * 0.1, H * 0.1], [W * 0.9, H * 0.11]]) {
    g.beginPath();
    g.arc(cx, horizon - r * 0.6, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** School building facade with two rows of windows and doors at the given x positions. */
function school(g: CanvasRenderingContext2D, P: Projector, light: Light, doors: number[], rnd: () => number, gym = false) {
  const { W, H, horizon } = P;
  const top = H * (gym ? 0.14 : 0.1);
  const bx = W * 0.06;
  const bw = W * 0.88;
  const day = light === "day";
  const wallTop = day ? "#c9b49a" : light === "dusk" ? "#4a3d52" : "#1a2440";
  const wallBot = day ? "#b89f84" : light === "dusk" ? "#3c3346" : "#232f4f";
  g.fillStyle = grad(g, top, horizon, [[0, wallTop], [1, wallBot]]);
  g.fillRect(bx, top, bw, horizon - top);
  g.fillStyle = day ? "#8c7a66" : "#10182c";
  g.fillRect(bx - W * 0.01, top - H * 0.012, bw + W * 0.02, H * 0.014);
  if (gym) {
    // big gym hall: tall glass band and a painted sign
    g.fillStyle = light === "night" ? "#0d1528" : "#2b3450";
    g.fillRect(bx + bw * 0.05, top + (horizon - top) * 0.1, bw * 0.9, (horizon - top) * 0.32);
    for (let i = 0; i < 10; i++) {
      const lit = rnd() < 0.6;
      if (lit) {
        g.fillStyle = "rgba(255,226,170,0.75)";
        g.fillRect(bx + bw * (0.06 + i * 0.09), top + (horizon - top) * 0.12, bw * 0.08, (horizon - top) * 0.28);
      }
    }
    g.fillStyle = "#e9e3d6";
    g.font = `700 ${Math.max(10, W * 0.03)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.fillText("SALA DE SPORT", bx + bw / 2, top + (horizon - top) * 0.085);
    g.textAlign = "start";
  } else {
    const cols = W < 500 ? 7 : 12;
    const ww = (bw / cols) * 0.55;
    const wh = (horizon - top) * 0.2;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < cols; i++) {
        const x = bx + (bw / cols) * (i + 0.22);
        const y = top + (horizon - top) * (0.1 + row * 0.34);
        const lit = !day && rnd() < (light === "dusk" ? 0.5 : 0.28);
        g.fillStyle = day ? "#7f98ad" : lit ? "#ffd58a" : "#0d1528";
        g.fillRect(x, y, ww, wh);
        if (day) {
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.fillRect(x, y, ww * 0.35, wh);
        }
        if (lit) glow(g, x + ww / 2, y + wh / 2, ww * 1.4, "255,200,120", 0.22);
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.fillRect(x + ww / 2 - 0.5, y, 1, wh);
      }
    }
  }
  for (const d of doors) {
    const dx = P.sx(d, 0);
    const dh = (horizon - top) * (gym ? 0.5 : 0.42);
    const dw = dh * (gym ? 1.1 : 0.62);
    g.fillStyle = "#0b1120";
    g.fillRect(dx - dw / 2 - 3, horizon - dh - 3, dw + 6, dh + 3);
    g.fillStyle = day ? grad(g, horizon - dh, horizon, [[0, "#5b4a3a"], [1, "#4a3b2e"]]) : grad(g, horizon - dh, horizon, [[0, "#ffcf7a"], [1, "#ff9e45"]]);
    g.fillRect(dx - dw / 2, horizon - dh, dw, dh);
    if (!day) {
      const spill = g.createRadialGradient(dx, horizon, 0, dx, horizon, dw * 2.4);
      spill.addColorStop(0, "rgba(255,190,110,0.35)");
      spill.addColorStop(1, "rgba(255,190,110,0)");
      g.fillStyle = spill;
      g.fillRect(dx - dw * 2.4, horizon - dh, dw * 4.8, dh * 2.4);
    } else {
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(dx - 0.6, horizon - dh, 1.2, dh);
    }
  }
}

/** A bench (or a row of chairs) at world position (x, z), `n` seats wide. */
function bench(g: CanvasRenderingContext2D, P: Projector, x: number, z: number, n: number, color: string, chairs = false) {
  const y = P.sy(z);
  const h = P.sh(z) / 100;
  const w = n * 24 * h;
  const cx = P.sx(x, z);
  const seatY = y - 20 * h;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(cx, y, w * 0.55, 5 * h, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  if (chairs) {
    for (let i = 0; i < n; i++) {
      const sx = cx - w / 2 + (i + 0.5) * (w / n);
      g.fillRect(sx - 9 * h, seatY - 26 * h, 18 * h, 24 * h);
      g.fillRect(sx - 10 * h, seatY - 3 * h, 20 * h, 5 * h);
      g.fillStyle = "#2a2d33";
      g.fillRect(sx - 8 * h, seatY + 2 * h, 1.6 * h, 18 * h);
      g.fillRect(sx + 6.4 * h, seatY + 2 * h, 1.6 * h, 18 * h);
      g.fillStyle = color;
    }
  } else {
    g.fillRect(cx - w / 2, seatY - 18 * h, w, 4 * h);
    g.fillRect(cx - w / 2, seatY - 10 * h, w, 4 * h);
    g.fillRect(cx - w / 2, seatY - 2 * h, w, 5 * h);
    g.fillStyle = "#23262d";
    g.fillRect(cx - w / 2 + 4 * h, seatY + 2 * h, 2.5 * h, 19 * h);
    g.fillRect(cx + w / 2 - 6.5 * h, seatY + 2 * h, 2.5 * h, 19 * h);
  }
}

/** Seat positions for a bench painted by `bench` (people sit at these world coordinates). */
function seatsOf(x: number, z: number, n: number, P1 = 0.042): [number, number][] {
  return Array.from({ length: n }, (_, i) => [x + (i - (n - 1) / 2) * P1, z + 0.005] as [number, number]);
}

/* ------------------------------------------------------------------ settings */

const YARD_GATES: Record<string, [number, number]> = {
  doorL: [0.2, -0.04], doorR: [0.76, -0.04], left: [-0.12, 0.55], right: [1.12, 0.5], leftBack: [-0.12, 0.2], rightBack: [1.12, 0.22],
};

function yard(id: string, cam: string, light: Light, opts: { gym?: boolean; festival?: boolean; heat?: boolean } = {}): Setting {
  return {
    id,
    cam,
    light,
    grade: light === "day" ? "rgba(255,236,200,0.06)" : light === "dusk" ? "rgba(70,30,60,0.14)" : "rgba(8,40,52,0.16)",
    scale: 1,
    area: { x0: 0.06, x1: 0.94, z0: 0.06, z1: 0.94 },
    gates: YARD_GATES,
    paint: (g, P, rnd) => {
      sky(g, P, light, rnd);
      trees(g, P, light === "day" ? "#4f7a4a" : light === "dusk" ? "#231c30" : "#070d1a");
      school(g, P, light, opts.gym ? [0.5] : [0.2, 0.76], rnd, opts.gym);
      const day = light === "day";
      floor(g, P, day ? "#9a9184" : light === "dusk" ? "#3a3340" : "#1e2638", day ? "#b5ab9c" : light === "dusk" ? "#4a4150" : "#2b3448", day ? "rgba(70,60,50,0.15)" : "rgba(150,170,210,0.08)");
      if (day) {
        // painted court lines and a hard sun
        g.strokeStyle = "rgba(255,255,255,0.55)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(P.sx(0.15, 0.3), P.sy(0.3));
        g.lineTo(P.sx(0.85, 0.3), P.sy(0.3));
        g.lineTo(P.sx(0.85, 0.85), P.sy(0.85));
        g.lineTo(P.sx(0.15, 0.85), P.sy(0.85));
        g.closePath();
        g.stroke();
        if (opts.heat) glow(g, P.W * 0.85, P.H * 0.05, P.W * 0.4, "255,240,190", 0.55);
      } else {
        lamp(g, P, -1);
        lamp(g, P, 1);
      }
      if (opts.festival) {
        // two stalls at the back sides
        for (const [x, c] of [[0.1, "#c0392b"], [0.88, "#2e86c1"]] as [number, string][]) {
          const cx = P.sx(x, 0.08);
          const y = P.sy(0.08);
          const s = P.sh(0.08);
          g.fillStyle = "#3a2c22";
          g.fillRect(cx - s * 0.35, y - s * 0.45, s * 0.7, s * 0.45);
          for (let i = 0; i < 5; i++) {
            g.fillStyle = i % 2 ? "#f1ece4" : c;
            g.fillRect(cx - s * 0.4 + (i * s * 0.8) / 5, y - s * 0.75, (s * 0.8) / 5, s * 0.14);
          }
        }
      }
    },
    ambient: opts.festival
      ? (g, P, t) => {
          // string lights across the yard, twinkling
          const { W, horizon } = P;
          for (let row = 0; row < 2; row++) {
            const y0 = horizon - P.H * (0.12 - row * 0.06);
            for (let i = 0; i <= 18; i++) {
              const k = i / 18;
              const x = k * W;
              const y = y0 + Math.sin(k * Math.PI) * P.H * 0.05;
              const on = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7 + row);
              g.fillStyle = `rgba(255,${200 + (i % 3) * 20},${120 + (i % 2) * 60},${on})`;
              g.beginPath();
              g.arc(x, y, Math.max(1.5, W * 0.0045), 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      : undefined,
  };
}

function corridor(id: string, cam: string, evening: boolean): Setting {
  return {
    id,
    cam,
    light: "indoor",
    grade: evening ? "rgba(40,60,40,0.08)" : "rgba(10,30,40,0.2)",
    scale: 1,
    area: { x0: 0.08, x1: 0.92, z0: 0.08, z1: 0.92 },
    gates: { doorL: [0.15, -0.04], doorM: [0.5, -0.04], doorR: [0.85, -0.04], left: [-0.12, 0.6], right: [1.12, 0.6] },
    paint: (g, P, rnd) => {
      const { W, H, horizon } = P;
      // ceiling and back wall
      g.fillStyle = evening ? "#3a3f3a" : "#141a22";
      g.fillRect(0, 0, W, H * 0.12);
      g.fillStyle = grad(g, H * 0.12, horizon, [[0, evening ? "#cdd5c0" : "#2a3340"], [1, evening ? "#b7c0a8" : "#232b37"]]);
      g.fillRect(0, H * 0.12, W, horizon - H * 0.12);
      // wainscot
      g.fillStyle = evening ? "#6f8c7a" : "#1d3a33";
      g.fillRect(0, horizon - H * 0.09, W, H * 0.09);
      // lockers
      const lockY = horizon - H * 0.2;
      for (let i = 0; i < 26; i++) {
        const x = W * (0.24 + i * 0.006 * 4);
        if (x > W * 0.4 && x < W * 0.6) continue;
        if (x > W * 0.78) break;
        g.fillStyle = ["#3f6aa8", "#d06b3a", "#4b8e6a"][i % 3];
        g.fillRect(x, lockY, W * 0.022, H * 0.2);
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(x + W * 0.021, lockY, 1, H * 0.2);
      }
      // classroom doors
      for (const d of [0.15, 0.5, 0.85]) {
        const dx = P.sx(d, 0);
        const dh = H * 0.22;
        const dw = dh * 0.5;
        g.fillStyle = "#5a3e28";
        g.fillRect(dx - dw / 2, horizon - dh, dw, dh);
        g.fillStyle = evening && rnd() < 0.7 ? "rgba(255,240,200,0.8)" : "rgba(120,150,170,0.5)";
        g.fillRect(dx - dw * 0.3, horizon - dh * 0.88, dw * 0.6, dh * 0.25);
        g.fillStyle = "#c9b48a";
        g.fillRect(dx + dw * 0.32, horizon - dh * 0.5, dw * 0.08, dh * 0.03);
      }
      // notice board and poster
      g.fillStyle = "#b88a5a";
      g.fillRect(W * 0.62, horizon - H * 0.2, W * 0.14, H * 0.09);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ["#fff", "#ffe08a", "#a8d8ff", "#ffb3b3", "#fff"][i];
        g.fillRect(W * (0.63 + (i % 3) * 0.04), horizon - H * (0.19 - Math.floor(i / 3) * 0.04), W * 0.03, H * 0.03);
      }
      // ceiling light panels
      for (let i = 0; i < 4; i++) {
        const x = W * (0.12 + i * 0.25);
        g.fillStyle = evening ? "#fffbe8" : i === 2 ? "#5a6270" : "#d9ecff";
        g.fillRect(x, H * 0.04, W * 0.12, H * 0.025);
      }
      // glossy floor with reflections of the lights
      floor(g, P, evening ? "#8b8f86" : "#232a33", evening ? "#a4a89c" : "#2f3742", "rgba(0,0,0,0.12)", 10, 6);
      // soft reflections of the ceiling lights, fading towards the camera
      const refl = g.createLinearGradient(0, horizon, 0, horizon + (H - horizon) * 0.7);
      refl.addColorStop(0, evening ? "rgba(255,255,240,0.16)" : "rgba(200,225,255,0.08)");
      refl.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = refl;
      for (let i = 0; i < 4; i++) {
        const cx = W * (0.18 + i * 0.25);
        g.beginPath();
        g.ellipse(cx, horizon + (H - horizon) * 0.3, W * 0.05, (H - horizon) * 0.32, 0, 0, Math.PI * 2);
        g.fill();
      }
    },
    over: (g, P, t) => {
      // a tired fluorescent tube flickers now and then
      const f = Math.sin(t * 13) * Math.sin(t * 3.1) > 0.92 ? 0.12 : 0;
      if (f) {
        g.fillStyle = `rgba(0,0,0,${f})`;
        g.fillRect(0, 0, P.W, P.H);
      }
    },
  };
}

function gate(id: string, cam: string, light: Light): Setting {
  return {
    id,
    cam,
    light,
    grade: light === "day" ? "rgba(255,236,200,0.05)" : "rgba(255,200,150,0.08)",
    scale: 1,
    area: { x0: 0.06, x1: 0.94, z0: 0.08, z1: 0.94 },
    gates: { gate: [0.5, -0.05], left: [-0.12, 0.6], right: [1.12, 0.55], rightBack: [1.12, 0.2], leftBack: [-0.12, 0.25] },
    paint: (g, P, rnd) => {
      const { W, H, horizon } = P;
      sky(g, P, light, rnd);
      // houses beyond the street
      for (let i = 0; i < 6; i++) {
        const x = W * (i / 6);
        const hgt = H * (0.12 + rnd() * 0.1);
        g.fillStyle = ["#c9a98a", "#d8c7a8", "#b88f78", "#cfc2b0", "#a89482", "#d3b493"][i];
        g.fillRect(x, horizon - H * 0.07 - hgt, W / 6 - 4, hgt);
        g.fillStyle = "#7d4e3c";
        g.beginPath();
        g.moveTo(x - 3, horizon - H * 0.07 - hgt);
        g.lineTo(x + W / 12, horizon - H * 0.07 - hgt - H * 0.05);
        g.lineTo(x + W / 6, horizon - H * 0.07 - hgt);
        g.fill();
        g.fillStyle = "#6f8fa8";
        g.fillRect(x + W * 0.03, horizon - H * 0.07 - hgt * 0.7, W * 0.03, hgt * 0.25);
      }
      // street
      g.fillStyle = "#555a60";
      g.fillRect(0, horizon - H * 0.07, W, H * 0.06);
      g.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 10; i++) g.fillRect(W * (i / 10), horizon - H * 0.043, W * 0.04, 2);
      // the fence with an open gate in the middle
      g.strokeStyle = "#2d3b33";
      g.lineWidth = Math.max(1.5, W * 0.004);
      for (let i = 0; i <= 60; i++) {
        const x = (i / 60) * W;
        if (Math.abs(x - W / 2) < W * 0.09) continue;
        g.beginPath();
        g.moveTo(x, horizon + 2);
        g.lineTo(x, horizon - H * 0.07);
        g.stroke();
      }
      g.fillStyle = "#2d3b33";
      g.fillRect(0, horizon - H * 0.07, W / 2 - W * 0.09, 3);
      g.fillRect(W / 2 + W * 0.09, horizon - H * 0.07, W, 3);
      g.fillRect(W / 2 - W * 0.1, horizon - H * 0.11, W * 0.015, H * 0.11);
      g.fillRect(W / 2 + W * 0.085, horizon - H * 0.11, W * 0.015, H * 0.11);
      g.fillStyle = "#e7e0cc";
      g.font = `700 ${Math.max(9, W * 0.022)}px system-ui, sans-serif`;
      g.fillText("ȘCOALA GIMNAZIALĂ NR. 7", W / 2 - W * 0.16, horizon - H * 0.12);
      floor(g, P, light === "day" ? "#a39b8c" : "#8a8076", light === "day" ? "#bbb3a3" : "#9d9386", "rgba(60,50,40,0.14)");
      // bicycle stand on the right
      const bx = P.sx(0.86, 0.22);
      const by = P.sy(0.22);
      const s = P.sh(0.22) / 100;
      g.strokeStyle = "#5c6670";
      g.lineWidth = 2 * s;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(bx - 20 * s + i * 12 * s, by - 10 * s, 9 * s, Math.PI, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = "#273038";
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(bx - 18 * s + i * 12 * s, by - 9 * s, 7 * s, 0, Math.PI * 2);
        g.stroke();
      }
    },
    ambient: (g, P, t) => {
      // cars passing on the street behind the fence
      const { W, H, horizon } = P;
      for (const [speed, off, col, dir] of [[0.11, 0, "#b33a32", 1], [0.08, 0.55, "#2f5c8f", -1], [0.14, 0.3, "#e5e5e5", 1]] as [number, number, string, number][]) {
        const k = (t * speed + off) % 1.6;
        const x = dir > 0 ? -W * 0.2 + k * W * 1.0 : W * 1.2 - k * W;
        const y = horizon - H * (dir > 0 ? 0.03 : 0.055);
        g.fillStyle = col;
        g.fillRect(x, y - H * 0.025, W * 0.12, H * 0.025);
        g.fillRect(x + W * 0.025, y - H * 0.042, W * 0.06, H * 0.018);
        g.fillStyle = "#111";
        g.beginPath();
        g.arc(x + W * 0.025, y, H * 0.008, 0, Math.PI * 2);
        g.arc(x + W * 0.095, y, H * 0.008, 0, Math.PI * 2);
        g.fill();
      }
      // fence posts in front of the cars (repaint a few bars over them)
      g.strokeStyle = "#2d3b33";
      g.lineWidth = Math.max(1.5, W * 0.004);
      for (let i = 0; i <= 60; i += 1) {
        const x = (i / 60) * W;
        if (Math.abs(x - W / 2) < W * 0.09) continue;
        g.beginPath();
        g.moveTo(x, horizon + 2);
        g.lineTo(x, horizon - H * 0.07);
        g.stroke();
      }
    },
  };
}

function busstop(): Setting {
  return {
    id: "busstop",
    cam: "CAM 11 · STAȚIE",
    light: "day",
    grade: "rgba(255,220,160,0.08)",
    scale: 1.22,
    area: { x0: 0.08, x1: 0.92, z0: 0.18, z1: 0.82 },
    gates: { left: [-0.12, 0.55], right: [1.12, 0.5], leftBack: [-0.12, 0.25] },
    seats: seatsOf(0.3, 0.26, 4, 0.045),
    paint: (g, P, rnd) => {
      const { W, H, horizon } = P;
      sky(g, P, "day", rnd);
      glow(g, W * 0.82, H * 0.03, W * 0.45, "255,240,190", 0.6);
      // shops across the street
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ["#d6b28c", "#c9cfd6", "#e2c79b", "#b9a38d", "#d8d0c0"][i];
        g.fillRect(W * (i * 0.2), horizon - H * 0.22, W * 0.2 - 3, H * 0.15);
        g.fillStyle = "#5c7b8f";
        g.fillRect(W * (i * 0.2 + 0.03), horizon - H * 0.15, W * 0.14, H * 0.06);
        g.fillStyle = ["#c0392b", "#27ae60", "#2980b9", "#8e44ad", "#d35400"][i];
        g.fillRect(W * (i * 0.2 + 0.02), horizon - H * 0.18, W * 0.16, H * 0.02);
      }
      g.fillStyle = "#4d5257";
      g.fillRect(0, horizon - H * 0.07, W, H * 0.07);
      floor(g, P, "#b9b2a6", "#cfc8bb", "rgba(80,70,60,0.12)", 12, 10);
      // curb
      g.fillStyle = "#9a958c";
      g.fillRect(0, P.sy(0.03), W, Math.max(2, H * 0.01));
      // shelter: glass panels and roof
      const x0 = P.sx(0.18, 0.24);
      const x1 = P.sx(0.42, 0.24);
      const y = P.sy(0.24);
      const s = P.sh(0.24);
      g.fillStyle = "rgba(180,210,230,0.35)";
      g.fillRect(x0, y - s * 1.15, x1 - x0, s * 1.1);
      g.fillStyle = "#3b4048";
      g.fillRect(x0 - 3, y - s * 1.2, x1 - x0 + 6, s * 0.06);
      g.fillRect(x0, y - s * 1.15, 3, s * 1.15);
      g.fillRect(x1 - 3, y - s * 1.15, 3, s * 1.15);
      // bus stop sign and timetable
      const px = P.sx(0.62, 0.2);
      const py = P.sy(0.2);
      g.fillStyle = "#3b4048";
      g.fillRect(px - 2, py - P.sh(0.2) * 1.25, 4, P.sh(0.2) * 1.25);
      g.fillStyle = "#1f6fb2";
      g.fillRect(px - 12, py - P.sh(0.2) * 1.3, 24, 18);
      g.fillStyle = "#fff";
      g.font = `700 ${Math.max(8, W * 0.016)}px system-ui, sans-serif`;
      g.fillText("24", px - 7, py - P.sh(0.2) * 1.3 + 13);
      bench(g, P, 0.3, 0.26, 4, "#6d4d34");
      void rnd;
    },
    ambient: (g, P, t) => {
      const { W, H, horizon } = P;
      for (const [speed, off, col, dir] of [[0.09, 0, "#c8c8c8", 1], [0.07, 0.6, "#2a6f97", -1], [0.12, 1.1, "#d1a12d", 1]] as [number, number, string, number][]) {
        const k = (t * speed + off) % 1.8;
        const x = dir > 0 ? -W * 0.25 + k * W : W * 1.25 - k * W;
        const y = horizon - H * (dir > 0 ? 0.015 : 0.045);
        g.fillStyle = col;
        g.fillRect(x, y - H * 0.03, W * 0.15, H * 0.03);
        g.fillRect(x + W * 0.03, y - H * 0.05, W * 0.08, H * 0.022);
        g.fillStyle = "#111";
        g.beginPath();
        g.arc(x + W * 0.03, y, H * 0.009, 0, Math.PI * 2);
        g.arc(x + W * 0.12, y, H * 0.009, 0, Math.PI * 2);
        g.fill();
      }
      // heat shimmer near the ground
      g.fillStyle = `rgba(255,250,230,${0.04 + 0.03 * Math.sin(t * 3)})`;
      g.fillRect(0, horizon, W, H * 0.06);
    },
  };
}

function park(): Setting {
  return {
    id: "park",
    cam: "CAM 14 · PARC",
    light: "dusk",
    grade: "rgba(60,40,70,0.1)",
    scale: 1.22,
    area: { x0: 0.08, x1: 0.92, z0: 0.16, z1: 0.82 },
    gates: { left: [-0.12, 0.5], right: [1.12, 0.45], leftBack: [-0.12, 0.22], rightBack: [1.12, 0.22] },
    seats: [...seatsOf(0.22, 0.24, 3, 0.05), ...seatsOf(0.74, 0.24, 3, 0.05)],
    paint: (g, P, rnd) => {
      const { W, H, horizon } = P;
      sky(g, P, "dusk", rnd);
      // tree line and lamps
      for (let i = 0; i < 9; i++) {
        const x = W * (i / 8);
        const r = H * (0.08 + rnd() * 0.06);
        g.fillStyle = i % 2 ? "#2c3a2e" : "#243226";
        g.beginPath();
        g.arc(x, horizon - r * 0.7, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#1c1612";
        g.fillRect(x - 2, horizon - r * 0.3, 4, r * 0.3);
      }
      // the school roof beyond the trees
      g.fillStyle = "#4a3d52";
      g.fillRect(W * 0.58, horizon - H * 0.2, W * 0.36, H * 0.06);
      // grass and a gravel path
      g.fillStyle = grad(g, horizon, P.H, [[0, "#3b4a34"], [1, "#4f6243"]]);
      g.fillRect(0, horizon, W, P.H - horizon);
      g.fillStyle = "#a08d74";
      g.beginPath();
      g.moveTo(P.sx(0.4, 0), P.sy(0));
      g.lineTo(P.sx(0.6, 0), P.sy(0));
      g.lineTo(P.sx(0.75, 1.1), P.H);
      g.lineTo(P.sx(0.25, 1.1), P.H);
      g.fill();
      g.fillStyle = "rgba(0,0,0,0.08)";
      for (let i = 0; i < 300; i++) g.fillRect(rnd() * W, horizon + rnd() * (P.H - horizon), 2, 1);
      lamp(g, P, -1);
      lamp(g, P, 1);
      bench(g, P, 0.22, 0.24, 3, "#6d4d34");
      bench(g, P, 0.74, 0.24, 3, "#6d4d34");
    },
  };
}

export const SETTINGS: Record<string, Setting> = {};
for (const s of [
  yard("yard-night", "CAM 02 · CURTE", "night"),
  yard("yard-gym", "CAM 03 · SALA SPORT", "dusk", { gym: true }),
  yard("yard-day", "CAM 02 · CURTE", "day"),
  yard("yard-heat", "CAM 02 · CURTE", "day", { heat: true }),
  yard("yard-festival", "CAM 02 · CURTE", "dusk", { festival: true }),
  corridor("corridor-night", "CAM 05 · HOL PARTER", false),
  corridor("corridor-evening", "CAM 05 · HOL PARTER", true),
  gate("gate-morning", "CAM 01 · POARTĂ", "day"),
  gate("gate-afternoon", "CAM 01 · POARTĂ", "day"),
  busstop(),
  park(),
]) {
  SETTINGS[s.id] = s;
}
