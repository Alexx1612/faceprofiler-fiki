"use client";

import { MousePointer2, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { m3Apps, type AppDemo } from "@/lib/m3";
import { cn } from "@/lib/utils";
import { Avatar, CamFeed } from "./m3-art";
import { StatusBadge, TechPeek } from "./tech-peek";

/**
 * Interactive, playable demos of the three working apps (camera app, Worker Analytics, Face Search),
 * shown together in one tab with an app switcher.
 *
 * Methodology: each demo is a drawn mock of the real app's main screen, not a recording. Every part
 * that matters is wrapped in TechPeek, so hovering or focusing it shows a technical card. Each app also
 * publishes a scenario: a list of steps, each naming a `data-demo` element, a caption and the action a
 * click there performs. The player glides a cursor to that element, rings it, "clicks" (ripple plus the
 * action) and moves on, the same way the night scenario on the Wireframe tab works. "Play all 3" chains
 * the three scenarios. Numbers shown as results are the apps' own measured numbers (see lib/m3.ts);
 * numbers that only animate the mock are labelled as demo.
 */

type Step = { at: string; say: string; act?: () => void; ms?: number };
type Steps = { current: Step[] };
type DemoProps = { app: AppDemo; steps: Steps };

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
      {app.id === "search" && (
        <a
          href="../face3d/"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          Try the 3D face: stock faces, your photos or a video
        </a>
      )}
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
const btn = "rounded bg-zinc-800 px-3 py-1.5 text-xs text-white transition-colors hover:bg-zinc-700";
const btn2 = "rounded border border-zinc-400 bg-white px-2.5 py-1 text-[11px] text-zinc-700 transition-colors hover:bg-zinc-100";

/* ---------- 1. camera app ---------- */

const PEOPLE = ["Anna", "Clara", "Daniel", "Emma", "Liam", "Marcus", "Mei", "Sofia"];
const RESULT = { photos: 405, correct: 358, wrong: 0, missed: 1, rejected: 42 };
const EVENTS = [
  { t: "02:16:41", who: "Night guard", score: "0.91", cam: "Corridor A", known: true },
  { t: "02:16:52", who: "Unknown_3", score: "0.28", cam: "Corridor A", known: false },
  { t: "02:17:05", who: "Cleaning staff", score: "0.84", cam: "Gym", known: true },
];

function CameraApp({ app, steps }: DemoProps) {
  const [tab, setTab] = useState<"people" | "photos" | "video" | "phone">("people");
  const [run, setRun] = useState(0);
  const [boxes, setBoxes] = useState(true);
  const [added, setAdded] = useState(0); // 0 none, 1 capturing, 2 enrolled
  const [ev, setEv] = useState<number | null>(null);
  const [alert, setAlert] = useState(false);
  useEffect(() => {
    if (run <= 0 || run >= 100) return;
    const id = setTimeout(() => setRun((r) => Math.min(100, r + 4)), 70);
    return () => clearTimeout(id);
  }, [run]);
  useEffect(() => {
    if (added !== 1) return;
    const id = setTimeout(() => setAdded(2), 1400);
    return () => clearTimeout(id);
  }, [added]);
  steps.current = [
    { at: "tab-people", say: "Open People: everyone the app should recognise, each stored as face vectors, never as raw photos in the report.", act: () => setTab("people") },
    { at: "add-person", say: "Add a person: three photos from different angles become three face vectors.", act: () => setAdded(1), ms: 2600 },
    { at: "card-new", say: "Night guard is enrolled. Recognition works from the next frame on, no retraining.", ms: 2000 },
    { at: "tab-photos", say: "Photos test: the self-check every release runs on 405 labelled photos.", act: () => setTab("photos") },
    { at: "run-test", say: "Run it. Strangers must be rejected, not guessed as someone enrolled.", act: () => setRun(4), ms: 3200 },
    { at: "res-wrong", say: "Result of the packaged app: 0 wrong names, 1 missed face, 42 strangers rejected.", ms: 2400 },
    { at: "tab-video", say: "Video: each face gets a box, a name or Unknown_N, a score and a track ID.", act: () => setTab("video") },
    { at: "ev-1", say: "An unknown face in Corridor A at 02:16:52. Click the event to see it.", act: () => { setEv(1); setAlert(true); } },
    { at: "opt-box", say: "Overlays can be switched off for a clean recording.", act: () => setBoxes(false), ms: 1800 },
    { at: "opt-box", say: "And back on.", act: () => setBoxes(true), ms: 1400 },
    { at: "tab-phone", say: "The same engine runs on Android, on the phone itself, offline.", act: () => setTab("phone"), ms: 2600 },
  ];
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
            data-demo={`tab-${id}`}
            onClick={() => setTab(id)}
            className={cn("rounded-full px-3 py-1 text-xs transition-colors", tab === id ? "bg-zinc-800 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-200")}
          >
            {label}
          </button>
        ))}
        {alert && <span className="m3-pulse ml-auto self-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">1 unknown</span>}
      </div>
      <TechPeek {...spot(app, tab)} className="p-1">
        {tab === "people" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-600">{PEOPLE.length + (added === 2 ? 1 : 0)} people · fictional names</span>
              <button type="button" data-demo="add-person" onClick={() => setAdded(added ? 0 : 1)} className={cn(btn, "ml-auto")}>
                {added ? "Remove Night guard" : "+ Add person"}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {added > 0 && (
                <div data-demo="card-new" className="animate-in fade-in zoom-in-95 rounded border-2 border-sky-500 bg-white p-1.5">
                  <div className="relative">
                    <Avatar className="aspect-[4/5]" hue={150} />
                    {added === 1 && <span className="m3-scan absolute inset-x-0 top-0 h-0.5 bg-sky-500" />}
                  </div>
                  <span className="mt-1 block text-[11px] font-semibold text-zinc-800">Night guard</span>
                  <span className={cn("block text-[10px]", added === 1 ? "text-sky-700" : "text-emerald-700")}>{added === 1 ? "reading 3 photos…" : "3 face vectors ✓"}</span>
                </div>
              )}
              {PEOPLE.map((p, i) => (
                <div key={p} className="animate-in fade-in zoom-in-95 rounded border border-zinc-300 bg-white p-1.5" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
                  <Avatar className="aspect-[4/5]" hue={(i * 47) % 360} />
                  <span className="mt-1 block text-[11px] font-semibold text-zinc-800">{p}</span>
                  <span className="block text-[10px] text-zinc-500">3 face vectors</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "photos" && (
          <div className="flex flex-col gap-3 p-1">
            <div className="flex items-center gap-3">
              <button type="button" data-demo="run-test" onClick={() => setRun(4)} className={btn}>
                {run >= 100 ? "Run again" : run > 0 ? "Checking…" : "Run the photo test"}
              </button>
              <span className="jet text-xs text-zinc-600">{Math.round(RESULT.photos * f)} / 405 photos</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-zinc-200">
              <div className="h-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${run}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["Correct", RESULT.correct, "text-emerald-700", "res-correct"],
                  ["Wrong", RESULT.wrong, "text-red-700", "res-wrong"],
                  ["Missed", RESULT.missed, "text-amber-700", "res-missed"],
                  ["Strangers rejected", RESULT.rejected, "text-sky-700", "res-rejected"],
                ] as const
              ).map(([k, v, c, d]) => (
                <div key={k} data-demo={d} className="rounded border border-zinc-300 bg-white p-2">
                  <span className={cn("jet block text-xl font-bold", c)}>{Math.round(v * f)}</span>
                  <span className="text-[10px] text-zinc-500">{k}</span>
                </div>
              ))}
            </div>
            <span className="text-[11px] text-zinc-500">Real result of the packaged app&apos;s self-check, 2026-11-16.</span>
          </div>
        )}
        {tab === "video" && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <CamFeed className="aspect-video flex-1" label="clip 315 · fictional people" scene="corridor" boxes={boxes} />
              <div className="flex w-32 flex-col gap-1.5 text-[11px] text-zinc-700">
                <span className="font-semibold">Overlays</span>
                {["Face box", "Name", "Score", "Track ID"].map((o, i) => (
                  <label key={o} data-demo={i === 0 ? "opt-box" : undefined} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={boxes} onChange={() => setBoxes((b) => !b)} className="accent-zinc-700" /> {o}
                  </label>
                ))}
                <span className="mt-1 text-zinc-500">Green: enrolled. Red: Unknown_N.</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {EVENTS.map((e, i) => (
                <button
                  key={e.t}
                  type="button"
                  data-demo={`ev-${i}`}
                  onClick={() => setEv(ev === i ? null : i)}
                  className={cn("flex items-center gap-2 rounded border bg-white px-2 py-1 text-left text-[11px] transition-colors", ev === i ? "border-sky-500 bg-sky-50" : "border-zinc-300 hover:bg-zinc-100")}
                >
                  <span className={cn("size-2 rounded-full", e.known ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="jet text-zinc-500">{e.t}</span>
                  <b className="text-zinc-800">{e.who}</b>
                  <span className="text-zinc-500">{e.cam}</span>
                  <span className="jet ml-auto text-zinc-600">{e.score}</span>
                </button>
              ))}
              {ev !== null && (
                <span className="animate-in fade-in rounded bg-zinc-800 px-2 py-1 text-[11px] text-white">
                  {EVENTS[ev].known ? `${EVENTS[ev].who}: score ${EVENTS[ev].score} is above the match line, so the name is shown.` : `Score ${EVENTS[ev].score} is below the match line: shown as ${EVENTS[ev].who}, never as a guessed name.`}
                </span>
              )}
            </div>
          </div>
        )}
        {tab === "phone" && (
          <div className="flex items-center justify-center gap-6">
            <div className="flex h-72 w-40 flex-col gap-2 rounded-[22px] border-4 border-zinc-500 bg-zinc-200 p-2">
              <span className="mx-auto h-1 w-10 rounded-full bg-zinc-400" />
              <CamFeed className="aspect-[3/4]" scene="room" />
              <span className="rounded bg-white p-1.5 text-center text-[10px] text-zinc-700">Night guard · 0.91</span>
            </div>
            <ul className="max-w-48 list-disc pl-4 text-[11px] text-zinc-700">
              <li>Same models as the PC app</li>
              <li>Runs on the phone, no server</li>
              <li>One APK holds all three demos</li>
            </ul>
          </div>
        )}
      </TechPeek>
    </div>
  );
}

/* ---------- 2. Worker Analytics ---------- */

const ZONES = [
  { id: "A", name: "Work A", x: 10, y: 10, w: 120, h: 70, fill: "#d1fae5", stroke: "#10b981", rule: "Own zone of W1. Helmet required." },
  { id: "B", name: "Work B", x: 140, y: 10, w: 100, h: 70, fill: "#dbeafe", stroke: "#3b82f6", rule: "Own zone of W2. Helmet and vest required." },
  { id: "R", name: "Restricted", x: 250, y: 10, w: 60, h: 70, fill: "#fee2e2", stroke: "#ef4444", rule: "Restricted: every entry is counted, a missing helmet raises an alert." },
  { id: "K", name: "Break", x: 10, y: 95, w: 110, h: 55, fill: "#fef3c7", stroke: "#f59e0b", rule: "Break area: time here is not counted as work time." },
  { id: "E", name: "Exit", x: 270, y: 110, w: 40, h: 40, fill: "#e5e7eb", stroke: "#6b7280", rule: "Exit: each pass counts as one exit in the report." },
];
const WORKERS = [
  { id: "W1", path: "M40 45 L110 40 L100 65 L45 60 Z", dur: "14s", helmet: true, vest: true, own: 96, exits: 0, restricted: 0, zone: "Work A" },
  { id: "W2", path: "M170 40 L225 35 L230 60 L180 65 Z M170 40 L80 120 L170 40", dur: "22s", helmet: true, vest: false, own: 71, exits: 1, restricted: 0, zone: "Work B" },
  { id: "W3", path: "M200 50 L280 45 L290 130 L200 60 Z", dur: "18s", helmet: false, vest: true, own: 64, exits: 0, restricted: 1, zone: "Work B" },
];
const clock = (s: number) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, "0")).join(":");

function WorkerApp({ app, steps }: DemoProps) {
  const [on, setOn] = useState(false);
  const [ended, setEnded] = useState(false);
  const [t, setT] = useState(0);
  const [zone, setZone] = useState<string | null>(null);
  const [alert, setAlert] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!on || ended) return;
    const id = setInterval(() => setT((x) => x + 37), 250); // demo clock runs fast
    return () => clearInterval(id);
  }, [on, ended]);
  useEffect(() => {
    if (on && !ended && t > 900 && !alert) setAlert(true);
  }, [t, on, ended, alert]);
  steps.current = [
    { at: "start", say: "Start the shift: cameras and the floor plan go live, every worker gets a track.", act: () => setOn(true), ms: 2600 },
    { at: "zone-R", say: "Zones come from the floor plan. Restricted counts every entry.", act: () => setZone("R") },
    { at: "zone-A", say: "Each worker has an own zone; time inside it is the main number of the report.", act: () => setZone("A") },
    { at: "alert", say: "Alert: W3 walked into Restricted without a helmet. Open it.", act: () => { setSel("W3"); setZone("R"); }, ms: 2600 },
    { at: "gear-W3", say: "Gear check per worker: helmet and vest from the PPE model, smoothed over frames.", ms: 2200 },
    { at: "track-W3", say: "Who is W3 comes from a badge vote across the track, not from one frame.", act: () => setSel("W3") },
    { at: "end", say: "End the shift: the report is built from the whole shift.", act: () => setEnded(true), ms: 2400 },
    { at: "row-W3", say: "W3: 64 % in own zone, helmet 0 %, one restricted entry. Shown in red.", ms: 2400 },
    { at: "export", say: "Export the report as CSV, JSON or HTML for the shift lead.", act: () => setSaved(true), ms: 2400 },
  ];
  const z = ZONES.find((x) => x.id === zone);
  return (
    <div className={cn(frame, "w-full max-w-[640px]")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" data-demo="start" onClick={() => { setOn(true); setEnded(false); setT(0); setAlert(false); setSaved(false); }} className={btn}>
          {on && !ended ? "Shift running" : "Start shift"}
        </button>
        <button type="button" data-demo="end" disabled={!on || ended} onClick={() => setEnded(true)} className={cn(btn2, "disabled:opacity-40")}>
          End shift
        </button>
        <span className="jet ml-auto text-xs text-zinc-700">{on ? (ended ? "ended " : "") + clock(6 * 3600 + t) : "--:--:--"}</span>
        {on && !ended && <span className="m3-blink size-2 rounded-full bg-red-500" aria-label="recording" />}
      </div>
      {alert && (
        <button
          type="button"
          data-demo="alert"
          onClick={() => { setSel("W3"); setZone("R"); }}
          className="animate-in fade-in slide-in-from-top-1 mb-2 flex w-full items-center gap-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-left text-[11px] text-red-800"
        >
          <span className="m3-pulse size-2 rounded-full bg-red-600" /> <b>W3</b> entered Restricted without a helmet · {clock(6 * 3600 + 900)}
        </button>
      )}
      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <TechPeek {...spot(app, "zones")} className="p-1">
          <svg viewBox="0 0 320 160" className="w-full rounded border border-zinc-300 bg-white" aria-label="Floor plan with zones and moving workers">
            {ZONES.map((zz) => (
              <g key={zz.id} data-demo={`zone-${zz.id}`} onClick={() => setZone(zz.id)} className="cursor-pointer">
                <rect x={zz.x} y={zz.y} width={zz.w} height={zz.h} rx="4" fill={zz.fill} stroke={zz.stroke} strokeWidth={zone === zz.id ? 3 : 1.2} strokeDasharray={zz.id === "R" ? "4 3" : undefined} />
                <text x={zz.x + 5} y={zz.y + 12} fontSize="9" fill="#374151" fontWeight="600">
                  {zz.name}
                </text>
              </g>
            ))}
            {on &&
              WORKERS.map((w) => (
                <g key={w.id} opacity={ended ? 0.3 : 1}>
                  <circle r={sel === w.id ? 9 : 7} fill={w.helmet ? "#facc15" : "#f87171"} stroke={sel === w.id ? "#0ea5e9" : "#111827"} strokeWidth={sel === w.id ? 2.5 : 1}>
                    <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
                  </circle>
                  <text fontSize="7" fontWeight="700" fill="#111827" textAnchor="middle" dy="2.5">
                    {w.id}
                    <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
                  </text>
                </g>
              ))}
          </svg>
          <span className="mt-1 block min-h-4 text-[11px] text-zinc-600">{z ? z.rule : "Click a zone for its rule."}</span>
        </TechPeek>
        <div className="flex flex-col gap-2">
          <TechPeek {...spot(app, "tracking")} className="p-1.5">
            <span className="block text-[11px] font-semibold text-zinc-800">On the floor {on ? "now" : "(not started)"}</span>
            {on &&
              WORKERS.map((w) => (
                <button key={w.id} type="button" data-demo={`track-${w.id}`} onClick={() => setSel(w.id)} className={cn("mt-1 flex w-full items-center gap-1.5 rounded px-1 text-left text-[11px] text-zinc-700", sel === w.id && "bg-sky-100")}>
                  <span className={cn("size-2.5 rounded-full border border-zinc-800", w.helmet ? "bg-yellow-400" : "bg-red-400")} />
                  {w.id} · track {w.id.slice(1)}7 · {sel === w.id ? `${w.zone}, badge 9/9` : "badge vote"}
                </button>
              ))}
          </TechPeek>
          <TechPeek {...spot(app, "gear")} className="p-1.5">
            <span className="block text-[11px] font-semibold text-zinc-800">Gear</span>
            {on &&
              WORKERS.map((w) => (
                <span key={w.id} data-demo={`gear-${w.id}`} className={cn("mt-1 flex items-center gap-2 rounded px-1 text-[11px] text-zinc-700", sel === w.id && "bg-sky-100")}>
                  {w.id}
                  <span className={w.helmet ? "text-emerald-700" : "m3-pulse font-semibold text-red-700"}>helmet {w.helmet ? "yes" : "no"}</span>
                  <span className={w.vest ? "text-emerald-700" : "text-red-700"}>vest {w.vest ? "yes" : "no"}</span>
                </span>
              ))}
          </TechPeek>
        </div>
      </div>
      <TechPeek {...spot(app, "report")} className="mt-3 p-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-800">Shift report</span>
          <button type="button" data-demo="export" disabled={!ended} onClick={() => setSaved(true)} className={cn(btn2, "ml-auto disabled:opacity-40")}>
            Export CSV
          </button>
        </div>
        {ended ? (
          <table className="w-full text-left text-[11px] text-zinc-700">
            <thead>
              <tr className="border-b border-zinc-300 text-zinc-500">
                <th className="py-1">Worker</th>
                <th>Own zone</th>
                <th>Exits</th>
                <th>Helmet</th>
                <th>Restricted entries</th>
              </tr>
            </thead>
            <tbody>
              {WORKERS.map((r, i) => (
                <tr key={r.id} data-demo={`row-${r.id}`} className={cn("animate-in fade-in border-b border-zinc-200", sel === r.id && "bg-sky-50")} style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}>
                  <td className="py-1 font-semibold">{r.id}</td>
                  <td>{r.own}%</td>
                  <td>{r.exits}</td>
                  <td className={r.helmet ? "" : "font-semibold text-red-700"}>{r.helmet ? 100 : 0}%</td>
                  <td className={r.restricted ? "font-semibold text-red-700" : ""}>{r.restricted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className="block text-[11px] text-zinc-500">The report appears when the shift ends.</span>
        )}
        {saved && <span className="animate-in fade-in mt-1 block text-[11px] text-emerald-700">shift_report.csv saved (demo: nothing is downloaded here)</span>}
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
function AsciiHead({ fast }: { fast?: boolean }) {
  const [yaw, setYaw] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // still head
    const id = setInterval(() => setYaw((y) => y + (fast ? 0.22 : 0.08)), 80);
    return () => clearInterval(id);
  }, [fast]);
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

function SearchApp({ app, steps }: DemoProps) {
  const [lib, setLib] = useState(0); // indexing progress 0..100
  const [face, setFace] = useState<number | null>(null);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [moment, setMoment] = useState(false);
  const [fast, setFast] = useState(false);
  useEffect(() => {
    if (lib <= 0 || lib >= 100) return;
    const id = setTimeout(() => setLib((x) => Math.min(100, x + 5)), 60);
    return () => clearTimeout(id);
  }, [lib]);
  steps.current = [
    { at: "index", say: "Index the library: every face in every photo and video becomes a vector, on this computer.", act: () => setLib(5), ms: 2800 },
    { at: "face-1", say: "A group photo: pick the one face to search for, not the whole picture.", act: () => { setFace(1); setMoment(false); } },
    { at: "results", say: "Results are sorted by score and banded: Strong, Likely, Possible.", ms: 2400 },
    { at: "hit-1", say: "A video hit: open it to see the exact moments the face appears.", act: () => setMoment(true), ms: 2600 },
    { at: "face-2", say: "Another face: only weak Possible matches, so it says so instead of naming anyone.", act: () => { setFace(2); setMoment(false); } },
    { at: "face-0", say: "Back to Face 1, then opt them out.", act: () => { setFace(0); setMoment(false); } },
    { at: "exclude", say: "Excluded: this face is never shown again, in any later search.", act: () => setExcluded([0]), ms: 2400 },
    { at: "exclude", say: "Undo, if the opt-out was a mistake.", act: () => setExcluded([]), ms: 1800 },
    { at: "mesh", say: "The 3D face: the picked face as a mesh you can turn, here drawn in ASCII.", act: () => setFast(true), ms: 2600 },
  ];
  const g = face === null ? null : GROUP[face];
  const shown = g && !excluded.includes(face!) && lib >= 100 ? g.matches : [];
  return (
    <div className={cn(frame, "w-full max-w-[640px]")}>
      <div className="mb-2 flex items-center gap-2">
        <button type="button" data-demo="index" onClick={() => setLib(5)} className={btn}>
          {lib >= 100 ? "Library indexed" : lib > 0 ? "Indexing…" : "Index the library"}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-zinc-200">
          <div className="h-full bg-sky-500 transition-[width] duration-100" style={{ width: `${lib}%` }} />
        </div>
        <span className="jet text-[11px] text-zinc-600">{Math.round(1240 * lib / 100)} photos · {Math.round(36 * lib / 100)} videos</span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_170px]">
        <TechPeek {...spot(app, "pick")} className="p-1">
          <div className="relative flex aspect-[2.4/1] items-end justify-around overflow-hidden rounded border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-300 px-4">
            {GROUP.map((p, i) => (
              <button key={i} type="button" data-demo={`face-${i}`} onClick={() => { setFace(i); setMoment(false); }} className="relative h-[85%] w-[24%]" aria-label={`Search ${p.name}`}>
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
          <div data-demo="mesh" onClick={() => setFast((x) => !x)} className="cursor-pointer">
            <AsciiHead fast={fast} />
          </div>
          <span className="mt-1 block text-[11px] text-zinc-500">3D face mesh, as ASCII (click to spin)</span>
        </TechPeek>
      </div>
      <TechPeek {...spot(app, "results")} className="mt-3 p-1">
        <div data-demo="results" className="mb-2 flex items-center gap-2 text-[12px] text-zinc-800">
          <b>{shown.length} files match</b> <span className="text-zinc-500">· {g ? `${g.name} of 3` : "pick a face"}</span>
        </div>
        <div key={`${face}-${shown.length}`} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {shown.length === 0 && (
            <span className="col-span-full text-[12px] text-zinc-500">
              {lib < 100 ? "Index the library first." : face === null ? "Pick a face in the group photo." : excluded.includes(face) ? "This person is excluded: never shown again." : "No match."}
            </span>
          )}
          {shown.map((sc, i) => {
            const [b, cls] = band(sc);
            return (
              <button
                key={i}
                type="button"
                data-demo={`hit-${i}`}
                onClick={() => i === 1 && setMoment(true)}
                className="animate-in fade-in slide-in-from-bottom-1 rounded border border-zinc-300 bg-white p-1 text-left"
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
              >
                {i === 1 ? <CamFeed className="aspect-square" scene="room" boxes={false} hud={false} /> : <Avatar className="aspect-square" hue={g!.hue} />}
                <span className={cn("mt-1 block rounded px-1 text-[10px] font-semibold", cls)}>
                  {b} {sc.toFixed(2)}
                </span>
                <span className="block text-[9px] text-zinc-500">{i === 1 ? "video · 2 moments" : `photo_${String(i + 11)}.jpg`}</span>
              </button>
            );
          })}
        </div>
        {moment && shown.length > 1 && (
          <div className="animate-in fade-in mt-2 rounded border border-sky-300 bg-sky-50 p-2 text-[11px] text-zinc-700">
            <b>video_07.mp4</b> · face seen at
            <div className="relative mt-1 h-3 rounded bg-zinc-200">
              {[0.08, 0.24].map((x) => (
                <span key={x} className="absolute top-0 h-3 w-2 rounded bg-sky-600" style={{ left: `${x * 100}%` }} />
              ))}
            </div>
            <span className="jet mt-1 block text-zinc-500">0:04 and 0:12 of 0:50 · click a mark to jump there</span>
          </div>
        )}
      </TechPeek>
      <TechPeek {...spot(app, "privacy")} className="mt-3 p-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            data-demo="exclude"
            disabled={face === null}
            onClick={() => face !== null && setExcluded((e) => (e.includes(face) ? e.filter((x) => x !== face) : [...e, face]))}
            className={cn(btn2, "disabled:opacity-40")}
          >
            {face !== null && excluded.includes(face) ? "Undo exclusion" : `Exclude ${g ? g.name : "this face"} (opt-out)`}
          </button>
          <span className="text-zinc-500">Scores of the drawn faces are illustrative; the bands are the measured ones.</span>
        </div>
      </TechPeek>
    </div>
  );
}

const DEMOS = { camera: CameraApp, worker: WorkerApp, search: SearchApp } as const;
const ORDER: AppDemo["id"][] = ["camera", "worker", "search"];

/**
 * The three working apps in one tab: an app switcher, a playable scenario per app and "Play all 3".
 *
 * Methodology: the app's demo publishes its steps through `steps`. A step glides the cursor to the
 * element with that `data-demo` name, rings it, then after 0.9 s plays a click ripple and runs the
 * action; the next step starts after the step's own time. Starting a scenario remounts the demo
 * (new key) so it always begins from a clean state.
 */
export function M3AppDemos() {
  const [id, setId] = useState<AppDemo["id"]>("camera");
  const [run, setRun] = useState(0);
  const [step, setStep] = useState<number | null>(null);
  const [chain, setChain] = useState(false);
  const [say, setSay] = useState("");
  const [cursor, setCursor] = useState<{ x: number; y: number; click: number } | null>(null);
  const [ring, setRing] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [queued, setQueued] = useState<AppDemo["id"] | null>(null); // next app of "Play all 3"
  const steps = useRef<Step[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const app = m3Apps.find((a) => a.id === id)!;
  const Demo = DEMOS[id];

  const stop = () => {
    setStep(null);
    setQueued(null);
    setRing(null);
    setChain(false);
    setCursor(null);
    setSay("");
  };
  const start = (to: AppDemo["id"], all: boolean) => {
    setId(to);
    setRun((r) => r + 1);
    setChain(all);
    setSay("");
    setStep(0);
  };

  useEffect(() => {
    if (step === null) return;
    const st = steps.current[step];
    if (!st) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    setSay(st.say);
    const box = frameRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-demo="${st.at}"]`);
    if (box && el) {
      const r = el.getBoundingClientRect(),
        f = box.getBoundingClientRect();
      const x = r.left - f.left + box.scrollLeft,
        y = r.top - f.top + box.scrollTop;
      setCursor((c) => ({ x: x + Math.min(r.width / 2, 40), y: y + r.height / 2, click: c?.click ?? 0 }));
      setRing({ x: x - 3, y: y - 3, w: r.width + 6, h: r.height + 6 });
    } else setRing(null);
    at(900, () => {
      setCursor((c) => (c ? { ...c, click: c.click + 1 } : c));
      st.act?.();
    });
    at(900 + (st.ms ?? 2200), () => {
      setRing(null);
      if (step + 1 < steps.current.length) return setStep(step + 1);
      const i = ORDER.indexOf(id);
      if (chain && i + 1 < ORDER.length) {
        setCursor(null);
        setSay(`Next: ${m3Apps.find((a) => a.id === ORDER[i + 1])!.name}.`);
        setStep(null);
        setQueued(ORDER[i + 1]);
        return;
      }
      setStep(null);
      setCursor(null);
      setChain(false);
      setSay(chain ? "All three demos finished. Hover any dashed part for its technical details, or click around yourself." : "Scenario finished. Hover any dashed part for its technical details, or click around yourself.");
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, id, run]);

  // the next app of "Play all 3" starts in its own effect, so resetting the step cannot cancel it
  useEffect(() => {
    if (!queued) return;
    const t = window.setTimeout(() => {
      setQueued(null);
      start(queued, true);
    }, 1200);
    return () => clearTimeout(t);
  }, [queued]);

  const total = steps.current.length || 1;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs tracking-wide text-neutral-400 uppercase">App</span>
        {ORDER.map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={id === x}
            onClick={() => {
              stop();
              setId(x);
            }}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", id === x ? "border-sky-400 bg-sky-400/15 text-white" : "border-white/10 text-neutral-300 hover:bg-white/5")}
          >
            {m3Apps.find((a) => a.id === x)!.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (step !== null && !chain ? stop() : start(id, false))}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:ml-auto",
            step !== null && !chain ? "border border-white/15 text-neutral-200 hover:bg-white/5" : "bg-sky-600 text-white hover:bg-sky-500"
          )}
        >
          {step !== null && !chain ? <Square className="size-3.5" /> : <Play className="size-4" />}
          {step !== null && !chain ? "Stop" : "Play this demo"}
        </button>
        <button
          type="button"
          onClick={() => (chain ? stop() : start("camera", true))}
          className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", chain ? "border border-white/15 text-neutral-200 hover:bg-white/5" : "bg-amber-500 text-zinc-950 hover:bg-amber-400")}
        >
          {chain ? <Square className="size-3.5" /> : <Play className="size-4" />}
          {chain ? "Stop" : "Play all 3 demos"}
        </button>
      </div>

      <AppHeader app={app} />

      {say && (
        <div
          key={`${id}-${step ?? "done"}`}
          aria-live="polite"
          className="m3-step animate-in fade-in slide-in-from-left-4 mb-3 overflow-hidden rounded-2xl border-2 border-sky-400/60 bg-gradient-to-r from-sky-500/20 via-sky-400/10 to-transparent duration-500"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            {step !== null && (
              <span className="jet flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-500 leading-none font-bold text-white shadow-[0_0_24px_rgba(56,189,248,0.6)]">
                <span className="text-lg">{String(step + 1).padStart(2, "0")}</span>
                <span className="text-[10px] opacity-80">of {String(total).padStart(2, "0")}</span>
              </span>
            )}
            <span className="min-w-0 flex-1 text-lg leading-snug font-semibold text-white sm:text-xl">{say}</span>
            {step !== null && (
              <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-neutral-200">
                <MousePointer2 className="size-4 text-sky-300" /> {app.name}
              </span>
            )}
          </div>
          {step !== null && (
            <div className="flex gap-1 px-4 pb-3" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i < step ? "bg-sky-400" : i === step ? "m3-bar bg-sky-300" : "bg-white/15")} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,640px)_1fr]">
        <div ref={frameRef} className="relative overflow-x-auto rounded-2xl border border-white/10 bg-[#13233d] p-4">
          <Demo key={`${id}-${run}`} app={app} steps={steps} />
          {ring && <div className="m3-target pointer-events-none absolute z-10 rounded-lg !bg-sky-400/10 transition-all duration-500" style={{ left: ring.x, top: ring.y, width: ring.w, height: ring.h }} aria-hidden="true" />}
          {cursor && (
            <div className="pointer-events-none absolute z-20 transition-[left,top] duration-700 ease-out" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">
              {cursor.click > 0 && <span key={cursor.click} className="m3-ripple absolute -top-3 -left-3 size-6 rounded-full border-2 border-sky-400" />}
              <MousePointer2 className="size-6 fill-white text-zinc-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs text-neutral-400">Press Play, or click around yourself. Hover or focus any dashed part of the demo for its technical details.</p>
          <SpotList app={app} />
        </div>
      </div>
    </div>
  );
}
