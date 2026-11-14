"use client";

import { useEffect, useRef } from "react";

/**
 * Two ASCII eyes that follow the pointer and blink.
 *
 * The eyes are shapes sampled onto a coarse character grid: every cell asks "what is under me?"
 * (eyelid edge, white, iris, pupil, highlight) and is printed as a character whose density and colour
 * match. The idea of sampling shapes onto a glyph grid comes from Pawan-webdeveloper/Ascii-Animals-extension
 * (MIT); this is an independent implementation.
 *
 * - The pupils turn towards the mouse or the last touch, eased so they glide rather than jump.
 * - The eyes blink every few seconds (sometimes twice), and on a click or tap anywhere.
 * - The irises are multi-coloured: hues sweep around the iris and drift slowly over time.
 * - With no pointer for a while, the eyes look around on their own.
 * - With "reduce motion" on, there is no idle wandering or colour drift; blinking stays rare.
 * - Drawing pauses while the eyes are off screen.
 */

const RAMP = " .,:-=+*#%@";
const IRIS = [
  [56, 189, 248], // sky
  [45, 212, 191], // teal
  [167, 139, 250], // violet
  [251, 191, 36], // amber
  [244, 114, 182], // pink
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function palette(t: number) {
  const n = IRIS.length;
  const x = ((t % 1) + 1) % 1 * n;
  const i = Math.floor(x);
  const f = x - i;
  const a = IRIS[i % n];
  const b = IRIS[(i + 1) % n];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

function hash(i: number, j: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function AsciiEyes({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, cell = 9, cols = 0, rows = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cell = W < 420 ? 6 : 7;
      cols = Math.floor(W / cell);
      rows = Math.floor(H / cell);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // pointer target (page coordinates) and eased gaze per eye
    const pointer = { x: 0, y: 0, seen: 0 };
    const gaze = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    const blink = { start: -10, twice: false, next: 2 + Math.random() * 3 };
    let visible = true, raf = 0, last = performance.now(), time = 0;

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = time;
    };
    const onDown = () => {
      blink.start = time;
      blink.twice = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", resize);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);

    // lid openness 0..1 from the blink timer (160 ms close + 160 ms open; sometimes a second blink)
    const openness = () => {
      const d = time - blink.start;
      const one = (x: number) => (x < 0 || x > 0.32 ? 1 : Math.abs(x - 0.16) / 0.16);
      return Math.min(one(d), blink.twice ? one(d - 0.42) : 1);
    };

    function frame(now: number) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      if (time > blink.next) {
        blink.start = time;
        blink.twice = Math.random() < 0.25;
        blink.next = time + (reduce ? 8 : 2.5 + Math.random() * 4);
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      ctx!.clearRect(0, 0, W, H);
      ctx!.font = `${cell + 1}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      const eyeW = Math.min(W * 0.22, H * 0.95); // half-width of one eye, px
      const eyeH = eyeW * 0.52; // half-height at the widest point
      const centres = [
        { x: W * 0.5 - eyeW * 1.18, y: H * 0.52 },
        { x: W * 0.5 + eyeW * 1.18, y: H * 0.52 },
      ];
      const open = openness();
      const idle = time - pointer.seen > 3 || pointer.seen === 0;

      centres.forEach((c, k) => {
        // where to look: the pointer, or a slow wander when idle
        let tx: number, ty: number;
        if (idle && !reduce) {
          tx = Math.cos(time * 0.45 + k * 0.3) * 0.75;
          ty = Math.sin(time * 0.7) * 0.45;
        } else if (pointer.seen === 0) {
          tx = 0;
          ty = 0;
        } else {
          const dx = pointer.x - (rect.left + c.x);
          const dy = pointer.y - (rect.top + c.y);
          const d = Math.hypot(dx, dy) || 1;
          const reach = Math.min(1, d / 260);
          tx = (dx / d) * reach;
          ty = (dy / d) * reach;
        }
        const g = gaze[k];
        g.x = lerp(g.x, tx, 1 - Math.pow(0.0008, 1 / 60 * (reduce ? 6 : 1)));
        g.y = lerp(g.y, ty, 1 - Math.pow(0.0008, 1 / 60 * (reduce ? 6 : 1)));

        const irisR = eyeH * 0.78;
        const px = c.x + g.x * (eyeW - irisR * 1.05);
        const py = c.y + g.y * (eyeH - irisR * 0.55);
        const hueShift = reduce ? 0 : time * 0.04;

        const i0 = Math.max(0, Math.floor((c.x - eyeW - cell * 2) / cell));
        const i1 = Math.min(cols - 1, Math.ceil((c.x + eyeW + cell * 2) / cell));
        const j0 = Math.max(0, Math.floor((c.y - eyeH - cell * 3) / cell));
        const j1 = Math.min(rows - 1, Math.ceil((c.y + eyeH + cell * 3) / cell));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const x = (i + 0.5) * cell, y = (j + 0.5) * cell;
            const u = (x - c.x) / eyeW; // -1..1 across the eye
            const v = (y - c.y) / eyeH;
            const lid = (1 - u * u) * open; // almond: lids meet at the corners, close together on a blink
            const inside = Math.abs(u) < 1 && Math.abs(v) < lid;
            const edge = Math.abs(u) < 1.04 && Math.abs(Math.abs(v) - Math.max(lid, 0.02)) < 0.16;
            let ch = "", col = [0, 0, 0], a = 1;

            if (inside) {
              const dx = x - px, dy = y - py, r = Math.hypot(dx, dy);
              if (r < irisR * 0.38) {
                continue; // the pupil is the dark page showing through
              } else if (r < irisR) {
                const ang = Math.atan2(dy, dx) / (Math.PI * 2);
                const c2 = palette(ang + hueShift + k * 0.13);
                const shade = 0.55 + 0.45 * (1 - r / irisR);
                col = [c2[0] * shade, c2[1] * shade, c2[2] * shade];
                const streak = 0.5 + 0.5 * Math.sin(ang * 40 + hash(i, j) * 2);
                ch = RAMP[Math.min(RAMP.length - 1, 5 + Math.floor(streak * 6))];
              } else {
                const depth = 1 - Math.abs(v) / Math.max(lid, 0.01); // whiter in the middle, shaded under the lids
                const lum = 175 + 75 * depth;
                col = [lum, lum + 3, lum + 8];
                ch = RAMP[3 + Math.min(4, Math.floor(depth * 3.5 + hash(i, j) * 1.2))];
                a = 0.9;
              }
              // highlight: a small bright spot up and left of the pupil
              if (Math.hypot(x - (px - irisR * 0.3), y - (py - irisR * 0.32)) < cell * 1.1) {
                ch = "o";
                col = [255, 255, 255];
                a = 1;
              }
            } else if (edge) {
              const upper = v < 0;
              ch = open < 0.25 ? "=" : upper ? (Math.abs(u) > 0.7 ? (u < 0 ? "/" : "\\") : "~") : "-";
              col = upper ? [125, 211, 252] : [56, 120, 160];
            }
            if (!ch || ch === " ") continue;
            ctx!.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`;
            ctx!.fillText(ch, x, y);
          }
        }
      });
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none block h-[130px] w-full sm:h-[160px] ${className}`} />;
}
