"use client";

import { useEffect, useMemo, useState } from "react";

import { m3Apps, type AppDemo } from "@/lib/m3";
import { cn } from "@/lib/utils";
import { Avatar, CamFeed } from "./m3-art";
import { StatusBadge, TechPeek } from "./tech-peek";

/**
 * Small interactive demos of the three working apps (camera app, Worker Analytics, Face Search).
 *
 * Methodology: each demo is a drawn mock of the real app's main screen, not a recording. Every part
 * that matters is wrapped in TechPeek, so hovering or focusing it shows the same kind of technical card
 * as the wireframe. Numbers shown as results are the apps' own measured numbers (see lib/m3.ts);
 * numbers that only animate the mock (live shift counters, scores of drawn faces) are labelled as demo.
 */

const spot = (app: AppDemo, id: string) => {
  const s = app.spots.find((x) => x.id === id)!;
  return { title: `${app.name}: ${s.label}`, tech: s };
};

function AppHeader({ app }: { app: AppDemo }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="text-lg font-semibold text-white">{app.name}</h3>
      <span className="jet text-xs text-sky-300">{/^\d/.test(app.version) ? `v${app.version}` : app.version}</span>
      <span className="text-xs text-neutral-400">{app.runs}</span>
      <p className="basis-full text-sm text-neutral-300">{app.oneLine}</p>
    </div>
  );
}

function SpotList({ app }: { app: AppDemo }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {app.spots.map((s) => (
        <li key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-sm">
          <div className="mb-1 flex items-center gap-2">
            <b className="text-white">{s.label}</b>
            <span className="ml-auto">
              <StatusBadge status={s.status} />
            </span>
          </div>
          <p className="text-neutral-400">{s.does[0]}</p>
        </li>
      ))}
    </ul>
  );
}

const frame = "rounded-xl border border-zinc-400 bg-zinc-50 p-3 shadow-xl";

/* ---------- 1. camera app ---------- */

const PEOPLE = ["Anna", "Clara", "Daniel", "Emma", "Liam", "Marcus", "Mei", "Sofia"];
const RESULT = { photos: 405, correct: 358, wrong: 0, missed: 1, rejected: 42 };

function CameraApp({ app }: { app: AppDemo }) {
  const [tab, setTab] = useState<"people" | "photos" | "video" | "phone">("video");
  const [run, setRun] = useState(0);
  const [boxes, setBoxes] = useState(true);
  useEffect(() => {
    if (run <= 0 || run >= 100) return;
    const id = setTimeout(() => setRun((r) => Math.min(100, r + 4)), 90);
    return () => clearTimeout(id);
  }, [run]);
  const f = run / 100;
  const tabs = [
    ["people", "People"],
    ["photos", "Photos test"],
    ["video", "Video"],
    ["phone", "Android"],
  ] as const;
  return (
    <div className={cn(frame, "w-full max-w-[640px]")}>
      <div className="mb-3 flex gap-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("rounded-full px-3 py-1 text-xs transition-colors", tab === id ? "bg-zinc-800 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-200")}
          >
            {label}
          </button>
        ))}
      </div>
      <TechPeek {...spot(app, tab)} className="p-1">
        {tab === "people" && (
          <div className="grid grid-cols-4 gap-2">
            {PEOPLE.map((p, i) => (
              <div key={p} className="animate-in fade-in zoom-in-95 rounded border border-zinc-300 bg-white p-1.5" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <Avatar className="aspect-[4/5]" hue={(i * 47) % 360} />
                <span className="mt-1 block text-[11px] font-semibold text-zinc-800">{p}</span>
                <span className="block text-[10px] text-zinc-500">3 face vectors</span>
              </div>
            ))}
          </div>
        )}
        {tab === "photos" && (
          <div className="flex flex-col gap-3 p-1">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setRun(4)} className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700">
                {run >= 100 ? "Run again" : run > 0 ? "Checking..." : "Run the photo test"}
              </button>
              <span className="jet text-xs text-zinc-600">{Math.round(RESULT.photos * f)} / 405 photos</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-zinc-200">
              <div className="h-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${run}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["Correct", RESULT.correct, "text-emerald-700"],
                  ["Wrong", RESULT.wrong, "text-red-700"],
                  ["Missed", RESULT.missed, "text-amber-700"],
                  ["Strangers rejected", RESULT.rejected, "text-sky-700"],
                ] as const
              ).map(([k, v, c]) => (
                <div key={k} className="rounded border border-zinc-300 bg-white p-2">
                  <span className={cn("jet block text-xl font-bold", c)}>{Math.round(v * f)}</span>
                  <span className="text-[10px] text-zinc-500">{k}</span>
                </div>
              ))}
            </div>
            <span className="text-[11px] text-zinc-500">Real result of the packaged app&apos;s self-check, 2026-11-16.</span>
          </div>
        )}
        {tab === "video" && (
          <div className="flex gap-3">
            <CamFeed className="aspect-video flex-1" label="clip 315 · fictional people" scene="corridor" boxes={boxes} />
            <div className="flex w-32 flex-col gap-1.5 text-[11px] text-zinc-700">
              <span className="font-semibold">Overlays</span>
              {["Face box", "Name", "Score", "Track ID"].map((o) => (
                <label key={o} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={boxes} onChange={() => setBoxes((b) => !b)} className="accent-zinc-700" /> {o}
                </label>
              ))}
              <span className="mt-1 text-zinc-500">Green: enrolled. Red: Unknown_N.</span>
            </div>
          </div>
        )}
        {tab === "phone" && (
          <div className="flex justify-center">
            <div className="flex h-72 w-40 flex-col gap-2 rounded-[22px] border-4 border-zinc-500 bg-zinc-200 p-2">
              <span className="mx-auto h-1 w-10 rounded-full bg-zinc-400" />
              <CamFeed className="aspect-[3/4]" scene="room" />
              <span className="rounded bg-white p-1.5 text-center text-[10px] text-zinc-700">Night guard · 0.91</span>
            </div>
          </div>
        )}
      </TechPeek>
    </div>
  );
}

/* ---------- 2. Worker Analytics ---------- */

const ZONES = [
  { id: "A", name: "Work A", x: 10, y: 10, w: 120, h: 70, fill: "#d1fae5", stroke: "#10b981" },
  { id: "B", name: "Work B", x: 140, y: 10, w: 100, h: 70, fill: "#dbeafe", stroke: "#3b82f6" },
  { id: "R", name: "Restricted", x: 250, y: 10, w: 60, h: 70, fill: "#fee2e2", stroke: "#ef4444" },
  { id: "K", name: "Break", x: 10, y: 95, w: 110, h: 55, fill: "#fef3c7", stroke: "#f59e0b" },
  { id: "E", name: "Exit", x: 270, y: 110, w: 40, h: 40, fill: "#e5e7eb", stroke: "#6b7280" },
];
const WORKERS = [
  { id: "W1", path: "M40 45 L110 40 L100 65 L45 60 Z", dur: "14s", helmet: true, vest: true },
  { id: "W2", path: "M170 40 L225 35 L230 60 L180 65 Z M170 40 L80 120 L170 40", dur: "22s", helmet: true, vest: false },
  { id: "W3", path: "M200 50 L280 45 L290 130 L200 60 Z", dur: "18s", helmet: false, vest: true },
];

function WorkerApp({ app }: { app: AppDemo }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const rows = useMemo(
    () => [
      { w: "W1", own: 96, exits: 0, helmet: 100, restricted: 0 },
      { w: "W2", own: 71, exits: 1, helmet: 100, restricted: 0 },
      { w: "W3", own: 64, exits: 0, helmet: 0, restricted: 1 },
    ],
    []
  );
  return (
    <div className={cn(frame, "w-full max-w-[640px]")}>
      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <TechPeek {...spot(app, "zones")} className="p-1">
          <svg viewBox="0 0 320 160" className="w-full rounded border border-zinc-300 bg-white" aria-label="Floor plan with zones and moving workers">
            {ZONES.map((z) => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={z.fill} stroke={z.stroke} strokeWidth="1.2" strokeDasharray={z.id === "R" ? "4 3" : undefined} />
                <text x={z.x + 5} y={z.y + 12} fontSize="9" fill="#374151" fontWeight="600">
                  {z.name}
                </text>
              </g>
            ))}
            {WORKERS.map((w) => (
              <g key={w.id}>
                <circle r="7" fill={w.helmet ? "#facc15" : "#f87171"} stroke="#111827" strokeWidth="1">
                  <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
                </circle>
                <text fontSize="7" fontWeight="700" fill="#111827" textAnchor="middle" dy="2.5">
                  {w.id}
                  <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
                </text>
              </g>
            ))}
          </svg>
        </TechPeek>
        <div className="flex flex-col gap-2">
          <TechPeek {...spot(app, "tracking")} className="p-1.5">
            <span className="block text-[11px] font-semibold text-zinc-800">On the floor now</span>
            {WORKERS.map((w) => (
              <span key={w.id} className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-700">
                <span className={cn("size-2.5 rounded-full border border-zinc-800", w.helmet ? "bg-yellow-400" : "bg-red-400")} />
                {w.id} · track {w.id.slice(1)}7 · badge vote
              </span>
            ))}
          </TechPeek>
          <TechPeek {...spot(app, "gear")} className="p-1.5">
            <span className="block text-[11px] font-semibold text-zinc-800">Gear</span>
            {WORKERS.map((w) => (
              <span key={w.id} className="mt-1 flex items-center gap-2 text-[11px] text-zinc-700">
                {w.id}
                <span className={w.helmet ? "text-emerald-700" : "m3-pulse font-semibold text-red-700"}>helmet {w.helmet ? "yes" : "no"}</span>
                <span className={w.vest ? "text-emerald-700" : "text-red-700"}>vest {w.vest ? "yes" : "no"}</span>
              </span>
            ))}
          </TechPeek>
        </div>
      </div>
      <TechPeek {...spot(app, "report")} className="mt-3 p-1">
        <table className="w-full text-left text-[11px] text-zinc-700">
          <thead>
            <tr className="border-b border-zinc-300 text-zinc-500">
              <th className="py-1">Worker</th>
              <th>Own zone</th>
              <th>Exits</th>
              <th>Helmet</th>
              <th>Restricted entries</th>
              <th className="text-right">Shift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.w} className="border-b border-zinc-200">
                <td className="py-1 font-semibold">{r.w}</td>
                <td>{r.own}%</td>
                <td>{r.exits}</td>
                <td className={r.helmet < 50 ? "font-semibold text-red-700" : ""}>{r.helmet}%</td>
                <td className={r.restricted ? "font-semibold text-red-700" : ""}>{r.restricted}</td>
                <td className="jet text-right">
                  {String(Math.floor((5400 + t) / 3600)).padStart(2, "0")}:{String(Math.floor((5400 + t) / 60) % 60).padStart(2, "0")}:{String((5400 + t) % 60).padStart(2, "0")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="mt-1 block text-[10px] text-zinc-500">Demo numbers for the drawing; the real report is per shift, as JSON, CSV and HTML.</span>
      </TechPeek>
    </div>
  );
}

/* ---------- 3. Face Search ---------- */

const GROUP = [
  { hue: 20, name: "Face 1", matches: [0.95, 0.94, 0.93, 0.91, 0.62, 0.48] },
  { hue: 150, name: "Face 2", matches: [0.89, 0.88, 0.86, 0.71, 0.52] },
  { hue: 260, name: "Face 3", matches: [0.41, 0.38] },
];
const band = (s: number) => (s >= 0.55 ? ["Strong", "text-emerald-700 bg-emerald-50"] : s >= 0.45 ? ["Likely", "text-amber-700 bg-amber-50"] : ["Possible", "text-zinc-600 bg-zinc-100"]);

/** Rotating ASCII head: an ellipsoid with eye, nose and mouth marks, lit from the front-left. */
function AsciiHead() {
  const [yaw, setYaw] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setYaw((y) => y + 0.08), 80);
    return () => clearInterval(id);
  }, []);
  const ramp = " .:-=+*#%@";
  const W = 34,
    H = 17;
  let out = "";
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = ((i + 0.5) / W) * 2 - 1,
        y = ((j + 0.5) / H) * 2 - 1;
      const ex = x / 0.72,
        q = ex * ex + y * y;
      if (q > 1) {
        out += " ";
        continue;
      }
      const z = Math.sqrt(1 - q);
      const ox = x * c - z * s,
        oz = x * s + z * c; // object coordinates after turning the head back
      let lum = Math.max(0, (-0.4 * x - 0.3 * y + 0.85 * z) / 1.0);
      const front = oz > 0.55;
      if (front && Math.hypot(Math.abs(ox) - 0.3, y + 0.15) < 0.13) lum *= 0.15;
      if (front && Math.abs(ox) < 0.25 && Math.abs(y - 0.45) < 0.06) lum *= 0.2;
      if (front && Math.abs(ox) < 0.07 && y > -0.05 && y < 0.25) lum = Math.min(1, lum + 0.25);
      out += ramp[Math.min(ramp.length - 1, 1 + Math.floor(lum * (ramp.length - 1)))];
    }
    out += "\n";
  }
  return <pre className="jet rounded bg-[#0e1116] p-2 text-[9px] leading-[9px] text-amber-200">{out}</pre>;
}

function SearchApp({ app }: { app: AppDemo }) {
  const [face, setFace] = useState(0);
  const [excluded, setExcluded] = useState<number[]>([]);
  const g = GROUP[face];
  const shown = excluded.includes(face) ? [] : g.matches;
  return (
    <div className={cn(frame, "w-full max-w-[640px]")}>
      <div className="grid gap-3 md:grid-cols-[1fr_170px]">
        <TechPeek {...spot(app, "pick")} className="p-1">
          <div className="relative flex aspect-[2.4/1] items-end justify-around overflow-hidden rounded border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-300 px-4">
            {GROUP.map((p, i) => (
              <button key={i} type="button" onClick={() => setFace(i)} className="relative h-[85%] w-[24%]" aria-label={`Search ${p.name}`}>
                <Avatar className="absolute inset-0 border-0 bg-transparent" hue={p.hue} />
                <span className={cn("absolute top-[28%] left-[24%] h-[38%] w-[52%] rounded-sm border-2 transition-colors", face === i ? "border-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.3)]" : "border-white/90")}>
                  <span className={cn("absolute -top-2.5 -left-2.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white", face === i ? "bg-sky-600" : "bg-zinc-700")}>{i + 1}</span>
                </span>
              </button>
            ))}
          </div>
          <span className="mt-1 block text-[11px] text-zinc-500">A group photo: click a numbered face to search only that one.</span>
        </TechPeek>
        <TechPeek {...spot(app, "mesh")} className="p-1">
          <AsciiHead />
          <span className="mt-1 block text-[11px] text-zinc-500">3D face mesh, as ASCII</span>
        </TechPeek>
      </div>
      <TechPeek {...spot(app, "results")} className="mt-3 p-1">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-zinc-800">
          <b>{shown.length} files match</b> <span className="text-zinc-500">· {g.name} of 3</span>
        </div>
        <div key={`${face}-${shown.length}`} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {shown.length === 0 && <span className="col-span-full text-[12px] text-zinc-500">{excluded.includes(face) ? "This person is excluded: never shown again." : "No match."}</span>}
          {shown.map((sc, i) => {
            const [b, cls] = band(sc);
            return (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-1 rounded border border-zinc-300 bg-white p-1" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}>
                {i === 1 ? <CamFeed className="aspect-square" scene="room" boxes={false} hud={false} /> : <Avatar className="aspect-square" hue={g.hue} />}
                <span className={cn("mt-1 block rounded px-1 text-[10px] font-semibold", cls)}>
                  {b} {sc.toFixed(2)}
                </span>
                <span className="block text-[9px] text-zinc-500">{i === 1 ? "video · 0:04, 0:12" : `photo_${String(i + 11)}.jpg`}</span>
              </div>
            );
          })}
        </div>
      </TechPeek>
      <TechPeek {...spot(app, "privacy")} className="mt-3 p-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => setExcluded((e) => (e.includes(face) ? e.filter((x) => x !== face) : [...e, face]))}
            className="rounded border border-zinc-400 bg-white px-2 py-1 text-zinc-700 hover:bg-zinc-100"
          >
            {excluded.includes(face) ? "Undo exclusion" : `Exclude ${g.name} (opt-out)`}
          </button>
          <span className="text-zinc-500">Scores of the drawn faces are illustrative; the bands are the measured ones.</span>
        </div>
      </TechPeek>
    </div>
  );
}

const DEMOS = { camera: CameraApp, worker: WorkerApp, search: SearchApp } as const;

/** One working app as a demo: header, the interactive mock, and its parts with status. */
export function M3AppDemo({ id }: { id: AppDemo["id"] }) {
  const app = m3Apps.find((a) => a.id === id)!;
  const Demo = DEMOS[id];
  return (
    <div>
      <AppHeader app={app} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,640px)_1fr]">
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#1a1f2a] p-4">
          <Demo app={app} />
        </div>
        <div>
          <p className="mb-2 text-xs text-neutral-400">Hover or focus any dashed part of the demo for its technical details.</p>
          <SpotList app={app} />
        </div>
      </div>
    </div>
  );
}
