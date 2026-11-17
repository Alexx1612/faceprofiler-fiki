"use client";

import { ArrowLeft, MousePointer2, Play, Square } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { m3Products, type Product, type ProductId } from "@/lib/m3-products";
import { cn } from "@/lib/utils";
import { Avatar, CamFeed } from "./m3-art";
import { StatusBadge, usePeek } from "./tech-peek";

/**
 * Clickable grey-box wireframes of the three apps: the school console (camera app), Worker Analytics
 * and Face Search, each with its own scenario; "Play all 3 scenarios" chains them.
 *
 * Methodology: every screen is drawn from a handful of primitives (placeholder bars, image boxes with a
 * cross, outlined buttons). Numbered click targets come from `p.screens[screen].hot` (lib/m3-products), so the badge in the
 * frame and the line in the list under it always agree. Clicking a target with a destination opens that
 * screen, which is how the wireframe shows the relations between views. Hovering or focusing a target
 * shows its technical details (what it does, what it needs, status). Camera tiles and photos are drawn,
 * animated placeholders (m3-art). Each app's Play button moves a cursor through its `tour` by itself.
 */

const Nav = createContext<{ screen: string; go: (s: string) => void; p: Product }>({ screen: "live", go: () => {}, p: m3Products[0] });

/** Placeholder text line. */
const Bar = ({ w = "100%", dark }: { w?: string; dark?: boolean }) => (
  <span className={cn("block h-2 rounded-sm", dark ? "bg-zinc-500" : "bg-zinc-300")} style={{ width: w }} />
);

/** Small real label (headings, button text). */
const T = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("text-[11px] leading-tight text-zinc-700", className)}>{children}</span>
);


const Btn = ({ children, primary }: { children: React.ReactNode; primary?: boolean }) => (
  <span className={cn("inline-flex items-center justify-center rounded border px-2.5 py-1 text-[11px]", primary ? "border-zinc-700 bg-zinc-700 text-zinc-50" : "border-zinc-400 bg-zinc-50 text-zinc-700")}>
    {children}
  </span>
);

/** Numbered click target. `i` is the index into the current screen's `hot` list. */
function Hot({ i, children, className, on }: { i: number; children: React.ReactNode; className?: string; on?: string }) {
  const { screen, go, p } = useContext(Nav);
  const h = p.screens[on ?? screen].hot[i];
  const { handlers, card } = usePeek(h.label, h);
  const body = (
    <>
      <span className="absolute -top-2.5 -left-2.5 z-10 flex size-5 items-center justify-center rounded-full bg-sky-700 text-[11px] font-bold text-white shadow">{i + 1}</span>
      {children}
      {card}
    </>
  );
  const cls = cn("relative block rounded outline-2 outline-offset-2 outline-sky-500 outline-dashed transition-[background-color,box-shadow] hover:bg-sky-500/10 hover:shadow-[0_0_0_4px_rgba(14,165,233,0.25)]", className);
  return h.to ? (
    <button type="button" data-hot={`${screen}-${i}`} onClick={() => go(h.to!)} {...handlers} className={cn(cls, "cursor-pointer text-left focus-visible:bg-sky-500/15 focus-visible:outline-solid")}>
      {body}
    </button>
  ) : (
    <span tabIndex={0} data-hot={`${screen}-${i}`} {...handlers} className={cn(cls, "cursor-help")}>
      {body}
    </span>
  );
}

/** Desktop frame: title bar, sidebar (every item clickable), content. */
function Desktop({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  const { screen, go, p } = useContext(Nav);
  return (
    <div className="flex min-h-[440px] w-[860px] flex-col overflow-hidden rounded-lg border border-zinc-400 bg-zinc-50 shadow-xl">
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-zinc-300 bg-zinc-200 px-3">
        <span className="size-2 rounded-full bg-zinc-400" />
        <span className="size-2 rounded-full bg-zinc-400" />
        <span className="size-2 rounded-full bg-zinc-400" />
        <span className="ml-3 h-3.5 w-64 rounded-sm bg-zinc-50" />
      </div>
      <div className="flex min-h-0 flex-1">
        {!bare && (
          <aside className="flex w-36 shrink-0 flex-col gap-1 border-r border-zinc-300 bg-zinc-100 p-2">
            <T className="mb-2 px-1.5 font-semibold text-zinc-800">{p.brand}</T>
            {p.sidebar.map((s) => (
              <button
                key={s.to}
                type="button"
                onClick={() => go(s.to)}
                className={cn("rounded px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-sky-500/10", screen === s.to ? "bg-zinc-300 font-semibold text-zinc-900" : "text-zinc-600")}
              >
                {s.label}
              </button>
            ))}
            <span className="mt-auto flex items-center gap-1.5 px-1.5">
              <span className="size-5 rounded-full border border-zinc-400 bg-zinc-200" />
              <Bar w="50%" />
            </span>
          </aside>
        )}
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}

const Head = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="mb-3 flex items-center gap-2">
    <T className="text-[13px] font-semibold text-zinc-900">{title}</T>
    <div className="ml-auto flex items-center gap-2">{children}</div>
  </div>
);

const Row = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center gap-2 rounded border border-zinc-300 bg-white p-2", className)}>{children}</div>
);

/* ---------- the screens ---------- */

function SignIn() {
  return (
    <Desktop bare>
      <div className="flex h-full items-center justify-center">
        <div className="flex w-64 flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-5">
          <T className="text-[13px] font-semibold text-zinc-900">Nau-ino</T>
          <Bar w="70%" />
          <T>School e-mail</T>
          <span className="h-6 rounded border border-zinc-400" />
          <T>Password</T>
          <span className="h-6 rounded border border-zinc-400" />
          <Hot i={0} className="mt-1">
            <span className="flex h-7 items-center justify-center rounded bg-zinc-700 text-[11px] text-zinc-50">Sign in</span>
          </Hot>
        </div>
      </div>
    </Desktop>
  );
}

function Live() {
  return (
    <Desktop>
      <Head title="Live: 6 cameras">
        <Hot i={2}>
          <span className="flex overflow-hidden rounded border border-zinc-400 text-[11px]">
            <span className="px-2 py-0.5 text-zinc-600">Day</span>
            <span className="bg-zinc-700 px-2 py-0.5 text-zinc-50">Night</span>
          </span>
        </Hot>
      </Head>
      <div className="flex gap-3">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Hot i={0} className="w-full self-start">
            <CamFeed className="aspect-video w-full" label="Main entrance" scene="room" />
          </Hot>
          {(
            [
              ["Side gate", "gate"],
              ["Corridor A", "empty"],
              ["Corridor B", "corridor"],
              ["Gym", "empty"],
              ["Yard", "yard"],
            ] as const
          ).map(([c, sc]) => (
            <CamFeed key={c} className="aspect-video" label={c} scene={sc} />
          ))}
        </div>
        <div className="flex w-48 shrink-0 flex-col gap-2">
          <T className="flex items-center gap-1.5 font-semibold">
            <span className="m3-blink size-1.5 rounded-full bg-red-500" /> Tonight
          </T>
          <Hot i={1}>
            <Row className="border-red-400 bg-red-50">
              <Avatar className="size-7 shrink-0 rounded-full" hue={0} ring="ring-red-400" />
              <span className="flex flex-col gap-0.5">
                <T className="font-semibold">Unknown_1</T>
                <T className="text-zinc-500">Side gate, 02:17</T>
              </span>
            </Row>
          </Hot>
          {["Night guard · Corridor A · 01:58", "Cleaning staff · Gym · 01:31", "Night guard · Main entrance · 00:47"].map((e) => (
            <Row key={e}>
              <Avatar className="size-6 shrink-0 rounded-full" hue={150} />
              <span className="flex flex-1 flex-col gap-0.5">
                <T>{e.split(" · ")[0]}</T>
                <T className="text-zinc-500">{e.split(" · ").slice(1).join(", ")}</T>
              </span>
            </Row>
          ))}
        </div>
      </div>
    </Desktop>
  );
}

function Alert() {
  return (
    <Desktop>
      <Head title="Unknown person at the side gate" />
      <div className="flex gap-4">
        <CamFeed className="aspect-video w-[58%]" label="Snapshot, 02:17 · side gate" scene="gate" />
        <div className="flex flex-1 flex-col gap-2">
          <Row className="border-red-300">
            <Avatar className="size-12" hue={0} ring="ring-red-400" />
            <span className="flex flex-col gap-1">
              <T className="font-semibold">Unknown_1</T>
              <T className="text-zinc-500">Not in People</T>
            </span>
          </Row>
          <T className="font-semibold">Seen on</T>
          <Row>
            <T>Side gate 02:17</T>
            <span className="text-zinc-400">→</span>
            <T>Corridor B 02:19</T>
          </Row>
          <div className="mt-1 flex flex-wrap gap-3">
            <Hot i={0}>
              <Btn primary>Send guard</Btn>
            </Hot>
            <Hot i={1}>
              <Btn>It&apos;s someone we know</Btn>
            </Hot>
            <Hot i={2}>
              <Btn>Find in recordings</Btn>
            </Hot>
            <Hot i={3}>
              <Btn>Dismiss</Btn>
            </Hot>
          </div>
        </div>
      </div>
    </Desktop>
  );
}

function Camera() {
  return (
    <Desktop>
      <Head title="Corridor B">
        <Hot i={1}>
          <Btn>Back to Live</Btn>
        </Hot>
      </Head>
      <div className="relative">
        <CamFeed className="aspect-[16/8] w-full" scene="empty" />
        <Hot i={0} className="absolute top-[16%] left-[22%]">
          <span className="relative flex h-20 w-16 items-end justify-center overflow-hidden border-2 border-emerald-400">
            <Avatar className="absolute inset-0 border-0" hue={150} />
            <span className="relative mb-1 bg-emerald-800 px-1 text-[11px] text-zinc-50">Ana 0.84</span>
          </span>
        </Hot>
        <span className="m3-pulse absolute top-[24%] left-[60%] flex h-16 w-14 items-end justify-center overflow-hidden border-2 border-dashed border-red-400">
          <Avatar className="absolute inset-0 border-0" hue={0} />
          <span className="relative mb-1 bg-red-900 px-1 text-[11px] text-zinc-50">Unknown_1</span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Btn>Play</Btn>
        <span className="h-1.5 flex-1 rounded bg-zinc-300">
          <span className="block h-full w-2/3 rounded bg-zinc-500" />
        </span>
        <T>02:19</T>
      </div>
    </Desktop>
  );
}

function People() {
  return (
    <Desktop>
      <Head title="People">
        <span className="h-6 w-40 rounded border border-zinc-400" />
        <Hot i={0}>
          <Btn primary>Add person</Btn>
        </Hot>
      </Head>
      <div className="mb-3 flex gap-1">
        {["Staff", "Students", "Visitors"].map((g, i) => (
          <span key={g} className={cn("rounded-full px-3 py-0.5 text-[11px]", i === 0 ? "bg-zinc-700 text-zinc-50" : "border border-zinc-400 text-zinc-600")}>
            {g}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-3">
        <Hot i={1}>
          <div className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <Avatar className="aspect-[4/5]" />
            <T className="font-semibold">Ana Pop</T>
            <Bar w="60%" />
          </div>
        </Hot>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <Avatar className="aspect-[4/5]" />
            <Bar w="80%" dark />
            <Bar w="55%" />
          </div>
        ))}
      </div>
    </Desktop>
  );
}

function AddPerson() {
  return (
    <Desktop>
      <Head title="Add person" />
      <div className="flex gap-6">
        <div className="flex flex-col gap-2">
          <T className="font-semibold">Photos (1 or 2)</T>
          <div className="flex gap-2">
            <div className="flex aspect-[4/5] w-28 items-center justify-center rounded border-2 border-dashed border-zinc-400">
              <T className="text-zinc-500">Drop or take photo</T>
            </div>
            <Avatar className="aspect-[4/5] w-28" hue={150} />
          </div>
        </div>
        <div className="flex w-72 flex-col gap-2">
          <T>Name</T>
          <span className="h-6 rounded border border-zinc-400" />
          <T>Group</T>
          <span className="flex h-6 items-center justify-end rounded border border-zinc-400 px-2 text-[11px] text-zinc-500">▾</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="size-3.5 rounded-sm border border-zinc-500" />
            <T>Consent recorded (staff, or a parent for students)</T>
          </span>
          <div className="mt-3 flex gap-3">
            <Hot i={0}>
              <Btn primary>Save</Btn>
            </Hot>
            <Hot i={1}>
              <Btn>Cancel</Btn>
            </Hot>
          </div>
        </div>
      </div>
    </Desktop>
  );
}

function Profile() {
  return (
    <Desktop>
      <Head title="Ana Pop">
        <Hot i={2}>
          <Btn>Edit photos</Btn>
        </Hot>
        <Hot i={1}>
          <Btn primary>Find all appearances</Btn>
        </Hot>
      </Head>
      <div className="flex gap-5">
        <div className="flex w-40 flex-col gap-2">
          <Avatar className="aspect-[4/5]" />
          <T>Staff, cleaning</T>
          <div className="flex gap-1.5">
            <Avatar className="size-10" />
            <Avatar className="size-10" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <T className="font-semibold">Seen today</T>
          <Hot i={0}>
            <Row>
              <CamFeed className="h-8 w-14" scene="room" boxes={false} hud={false} />
              <T>Corridor B, 22:30</T>
            </Row>
          </Hot>
          {["Main entrance, 21:55", "Gym, 23:10", "Main entrance, 23:58"].map((s) => (
            <Row key={s}>
              <CamFeed className="h-8 w-14" scene="room" boxes={false} hud={false} />
              <T className="text-zinc-500">{s}</T>
            </Row>
          ))}
        </div>
      </div>
    </Desktop>
  );
}

function Search() {
  return (
    <Desktop>
      <Head title="Search recordings" />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 flex-1 items-center rounded border border-zinc-400 px-2 text-[11px] text-zinc-500">Name, or drop a photo</span>
        <span className="flex h-7 w-40 items-center rounded border border-zinc-400 px-2 text-[11px] text-zinc-500">Last 24 hours</span>
        <Btn primary>Search</Btn>
      </div>
      <T className="font-semibold">12 moments</T>
      <div className="mt-2 grid grid-cols-4 gap-3">
        <Hot i={0}>
          <div className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <CamFeed className="aspect-video" scene="gate" hud={false} />
            <T>Side gate, 02:17</T>
          </div>
        </Hot>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <CamFeed className="aspect-video" scene="gate" hud={false} />
            <Bar w="70%" />
          </div>
        ))}
      </div>
    </Desktop>
  );
}

function Reports() {
  return (
    <Desktop>
      <Head title="Night report, Tuesday">
        <Hot i={1}>
          <Btn>Export PDF</Btn>
        </Hot>
      </Head>
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2 rounded border border-zinc-300 bg-white p-3">
          <T className="font-semibold">Summary</T>
          <Bar />
          <Bar />
          <Bar w="85%" />
          <Bar w="60%" />
          <T className="mt-2 font-semibold">Last 7 nights</T>
          <div className="flex h-16 items-end gap-2">
            {[30, 50, 20, 70, 40, 25, 90].map((h, i) => (
              <span key={i} className={cn("flex-1 rounded-sm", i === 6 ? "bg-zinc-600" : "bg-zinc-300")} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="flex w-56 flex-col gap-2">
          <T className="font-semibold">Events</T>
          <Hot i={0}>
            <Row className="border-zinc-700">
              <T className="font-semibold">Unknown_1, side gate 02:17</T>
            </Row>
          </Hot>
          {[1, 2, 3].map((i) => (
            <Row key={i}>
              <Bar w="80%" />
            </Row>
          ))}
        </div>
      </div>
    </Desktop>
  );
}

function Settings() {
  return (
    <Desktop>
      <Head title="Settings" />
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <T className="font-semibold">Cameras</T>
          {["Main entrance", "Side gate", "Corridor A"].map((c) => (
            <Row key={c}>
              <T>{c}</T>
            </Row>
          ))}
          <Hot i={0}>
            <Btn>Add camera</Btn>
          </Hot>
        </div>
        <div className="flex flex-col gap-2">
          <T className="font-semibold">School hours</T>
          <Row>
            <T>Mon to Fri, 07:30 to 19:00</T>
          </Row>
          <T className="text-zinc-500">Night mode outside these hours</T>
        </div>
        <div className="flex flex-col gap-2">
          <T className="font-semibold">Alerts go to</T>
          {["Night guard (phone)", "Deputy head (e-mail)"].map((c) => (
            <Row key={c}>
              <T>{c}</T>
            </Row>
          ))}
        </div>
      </div>
    </Desktop>
  );
}

function Phone() {
  return (
    <div className="flex w-[860px] justify-center">
      <div className="flex h-[520px] w-[260px] flex-col overflow-hidden rounded-[28px] border-4 border-zinc-500 bg-zinc-200 p-3 shadow-xl">
        <span className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-zinc-400" />
        <T className="mb-6 text-center text-[22px] font-semibold text-zinc-600">02:17</T>
        <Hot i={0}>
          <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-400 bg-white p-3">
            <T className="font-semibold">Nau-ino</T>
            <T>Unknown person at the side gate</T>
            <CamFeed className="mt-1 aspect-video" scene="gate" />
          </div>
        </Hot>
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-zinc-100 p-3">
          <Bar w="60%" />
          <Bar w="80%" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Worker Analytics screens ---------- */

/** Floor plan with zones and workers walking (SVG animateMotion; the site's reduced-motion rule applies to CSS only). */
function FloorPlan({ suggest = false, alarm = true }: { suggest?: boolean; alarm?: boolean }) {
  const zones = [
    { id: "A", name: "Station A", x: 10, y: 10, w: 120, h: 70, fill: "#d1fae5", stroke: "#10b981" },
    { id: "B", name: "Station B", x: 140, y: 10, w: 100, h: 70, fill: "#dbeafe", stroke: "#3b82f6" },
    { id: "R", name: "Restricted", x: 250, y: 10, w: 60, h: 70, fill: "#fee2e2", stroke: "#ef4444" },
    { id: "K", name: "Break", x: 10, y: 95, w: 110, h: 55, fill: "#fef3c7", stroke: "#f59e0b" },
    { id: "E", name: "Exit", x: 270, y: 110, w: 40, h: 40, fill: "#e5e7eb", stroke: "#6b7280" },
  ];
  const walkers = [
    { id: "W1", path: "M40 45 L110 40 L100 65 L45 60 Z", dur: "14s", ok: true },
    { id: "W2", path: "M170 40 L225 35 L230 60 L180 65 Z", dur: "18s", ok: true },
    { id: "W3", path: "M200 50 L280 45 L290 60 L200 60 Z", dur: "12s", ok: !alarm },
  ];
  return (
    <svg viewBox="0 0 320 160" className="w-full rounded border border-zinc-300 bg-white" aria-hidden="true">
      {zones.map((z) => (
        <g key={z.id}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={z.fill} stroke={z.stroke} strokeWidth="1.2" strokeDasharray={z.id === "R" ? "4 3" : undefined} />
          <text x={z.x + 5} y={z.y + 12} fontSize="9" fill="#374151" fontWeight="600">
            {z.name}
          </text>
        </g>
      ))}
      {suggest && <rect x="150" y="96" width="90" height="50" rx="6" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="5 3" className="m3-pulse" />}
      {suggest && (
        <text x="155" y="108" fontSize="8.5" fill="#5b21b6" fontWeight="700">
          Suggested: stood here 20 s
        </text>
      )}
      {walkers.map((w) => (
        <g key={w.id}>
          <circle r="7" fill={w.ok ? "#facc15" : "#f87171"} stroke="#111827" strokeWidth="1">
            <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
          </circle>
          <text fontSize="7" fontWeight="700" fill="#111827" textAnchor="middle" dy="2.5">
            {w.id}
            <animateMotion dur={w.dur} repeatCount="indefinite" path={w.path} />
          </text>
        </g>
      ))}
    </svg>
  );
}

function WShift() {
  return (
    <Desktop>
      <Head title="Start a shift" />
      <div className="grid grid-cols-2 gap-3">
        <Hot i={0}>
          <div className="flex flex-col gap-2 rounded border border-zinc-300 bg-white p-2">
            <CamFeed className="aspect-video" label="Floor camera (USB)" scene="yard" />
            <T className="font-semibold">Floor camera</T>
            <Btn primary>Start shift</Btn>
          </div>
        </Hot>
        <Hot i={1}>
          <div className="flex flex-col gap-2 rounded border border-zinc-300 bg-white p-2">
            <CamFeed className="aspect-video" label="Industrial floor (Intel, CC BY 4.0)" scene="corridor" boxes={false} />
            <T className="font-semibold">Real footage: industrial floor</T>
            <Btn>Run the clip</Btn>
          </div>
        </Hot>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["Layout: Industrial floor", "Analysis: 5 per second", "Gear check: helmet + vest"].map((s) => (
          <Row key={s}>
            <T>{s}</T>
          </Row>
        ))}
      </div>
    </Desktop>
  );
}

function WFloor() {
  return (
    <Desktop>
      <Head title="Floor · 07:42">
        <Hot i={1}>
          <Btn>Zones</Btn>
        </Hot>
        <Hot i={2}>
          <Btn primary>End shift</Btn>
        </Hot>
      </Head>
      <div className="flex gap-3">
        <div className="flex-1">
          <FloorPlan />
        </div>
        <div className="flex w-48 shrink-0 flex-col gap-2">
          <T className="font-semibold">On the floor</T>
          <Row>
            <span className="size-3 rounded-full border border-zinc-800 bg-yellow-400" />
            <T>W1 · Station A · own zone</T>
          </Row>
          <Row>
            <span className="size-3 rounded-full border border-zinc-800 bg-yellow-400" />
            <T>W2 · Station B · own zone</T>
          </Row>
          <Hot i={0}>
            <Row className="border-red-400 bg-red-50">
              <span className="m3-pulse size-3 rounded-full border border-zinc-800 bg-red-400" />
              <T className="font-semibold text-red-700">W3 · Restricted · no helmet</T>
            </Row>
          </Hot>
        </div>
      </div>
    </Desktop>
  );
}

function WAlert() {
  return (
    <Desktop>
      <Head title="W3 in the restricted area, no helmet" />
      <div className="flex gap-4">
        <CamFeed className="aspect-video w-[58%]" label="Floor camera · 07:42" scene="gate" />
        <div className="flex flex-1 flex-col gap-2">
          <Row className="border-red-300">
            <Avatar className="size-12" hue={0} ring="ring-red-400" />
            <span className="flex flex-col gap-1">
              <T className="font-semibold">W3</T>
              <T className="text-zinc-500">Restricted zone since 07:41:52</T>
            </span>
          </Row>
          <Row>
            <T>Helmet: not seen for 8 s · Vest: worn</T>
          </Row>
          <div className="mt-1 flex flex-wrap gap-3">
            <Hot i={0}>
              <Btn primary>Open W3</Btn>
            </Hot>
            <Hot i={1}>
              <Btn>Back to the floor</Btn>
            </Hot>
          </div>
        </div>
      </div>
    </Desktop>
  );
}

function WWorker() {
  const segs = [
    ["#10b981", 38],
    ["#f59e0b", 12],
    ["#10b981", 30],
    ["#ef4444", 6],
    ["#6b7280", 4],
    ["#10b981", 10],
  ] as const;
  return (
    <Desktop>
      <Head title="W3 · today">
        <Hot i={0}>
          <Btn primary>Shift report</Btn>
        </Hot>
      </Head>
      <div className="flex gap-4">
        <Avatar className="aspect-[4/5] w-32" hue={20} />
        <div className="flex flex-1 flex-col gap-2">
          <T className="font-semibold">Where W3 was, 07:00 to 15:00</T>
          <div className="flex h-5 overflow-hidden rounded border border-zinc-300">
            {segs.map(([c, w], i) => (
              <span key={i} style={{ background: c, width: `${w}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Own zone 78 %", "Exits 2", "Idle 41 min", "Helmet 91 %", "Vest 100 %", "Restricted 1"].map((m) => (
              <Row key={m} className={m.startsWith("Restricted") ? "border-red-300" : ""}>
                <T>{m}</T>
              </Row>
            ))}
          </div>
          <T className="text-zinc-500">Demo numbers for the drawing.</T>
        </div>
      </div>
    </Desktop>
  );
}

function WZones() {
  return (
    <Desktop>
      <Head title="Zones · Industrial floor">
        <Hot i={0}>
          <Btn>Suggest work areas</Btn>
        </Hot>
        <Hot i={1}>
          <Btn primary>Save layout</Btn>
        </Hot>
      </Head>
      <FloorPlan suggest alarm={false} />
      <div className="mt-2 flex gap-2">
        {["Work", "Break", "Exit", "Restricted"].map((k) => (
          <span key={k} className="rounded-full border border-zinc-400 px-2.5 py-0.5 text-[11px] text-zinc-600">
            + {k}
          </span>
        ))}
      </div>
    </Desktop>
  );
}

function WReport() {
  const rows = [
    ["W1", "96 %", "0", "100 %", "0"],
    ["W2", "71 %", "1", "100 %", "0"],
    ["W3", "78 %", "2", "91 %", "1"],
  ];
  return (
    <Desktop>
      <Head title="Shift report · 07:00 to 15:00">
        <Hot i={1}>
          <Btn>Export CSV · HTML</Btn>
        </Hot>
      </Head>
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Row className="bg-zinc-100">
            {["Worker", "Own zone", "Exits", "Helmet", "Restricted"].map((h) => (
              <T key={h} className="w-20 font-semibold">
                {h}
              </T>
            ))}
          </Row>
          {rows.map((r) => {
            const body = (
              <Row className={r[0] === "W3" ? "border-red-300" : ""}>
                {r.map((c, j) => (
                  <T key={j} className={cn("w-20", j === 4 && c !== "0" ? "font-semibold text-red-700" : "")}>
                    {c}
                  </T>
                ))}
              </Row>
            );
            return r[0] === "W3" ? (
              <Hot key={r[0]} i={0}>
                {body}
              </Hot>
            ) : (
              <div key={r[0]}>{body}</div>
            );
          })}
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <T className="font-semibold">Where people were</T>
          <div className="aspect-[4/3] rounded border border-zinc-300" style={{ background: "radial-gradient(circle at 30% 40%, #ef4444aa, transparent 35%), radial-gradient(circle at 65% 30%, #f59e0baa, transparent 30%), radial-gradient(circle at 25% 75%, #3b82f6aa, transparent 30%), #f8fafc" }} />
        </div>
      </div>
    </Desktop>
  );
}

/* ---------- Face Search screens ---------- */

function SLibrary() {
  return (
    <Desktop>
      <Head title="Library · on this computer">
        <Hot i={0}>
          <Btn>Add folder</Btn>
        </Hot>
        <Hot i={1}>
          <Btn primary>Search a face</Btn>
        </Hot>
      </Head>
      <div className="flex flex-col gap-2">
        {[
          ["Recordings / Side gate", "312 videos · 4,870 faces"],
          ["Recordings / Corridor B", "298 videos · 3,915 faces"],
          ["Photos / School events 2026", "1,204 photos · 6,310 faces"],
        ].map(([f, n]) => (
          <Row key={f}>
            <span className="h-6 w-8 rounded border border-zinc-400 bg-zinc-100" />
            <T className="flex-1 font-semibold">{f}</T>
            <T className="text-zinc-500">{n}</T>
          </Row>
        ))}
        <T className="text-zinc-500">Demo numbers for the drawing. Nothing online is searched.</T>
      </div>
    </Desktop>
  );
}

function SSearch() {
  return (
    <Desktop>
      <Head title="Search">
        <Hot i={1}>
          <Btn>3D face</Btn>
        </Hot>
      </Head>
      <div className="relative flex aspect-[2.6/1] items-end justify-around overflow-hidden rounded border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-300 px-8">
        {[20, 150, 260].map((hue, i) => (
          <div key={i} className="relative h-[88%] w-[22%]">
            <Avatar className="absolute inset-0 border-0 bg-transparent" hue={hue} />
            {i === 1 ? (
              <Hot i={0} className="absolute top-[26%] left-[24%] h-[38%] w-[52%]">
                <span className="block size-full border-2 border-sky-500" />
              </Hot>
            ) : (
              <span className="absolute top-[26%] left-[24%] h-[38%] w-[52%] border-2 border-white/90" />
            )}
            <span className="absolute top-[20%] left-[18%] flex size-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-white">{i + 1}</span>
          </div>
        ))}
      </div>
      <T className="mt-2 block text-zinc-500">Group photo: 3 faces found. Each card shows its best match before you choose.</T>
    </Desktop>
  );
}

function SResults() {
  const cards = [
    ["Strong 0.93", "photo"],
    ["Strong 0.91", "video"],
    ["Strong 0.88", "photo"],
    ["Strong 0.86", "photo"],
    ["Likely 0.52", "photo"],
    ["Likely 0.47", "photo"],
  ];
  return (
    <Desktop>
      <Head title="6 files match · face 2">
        <Hot i={1}>
          <Btn>Exclude this person</Btn>
        </Hot>
      </Head>
      <div className="grid grid-cols-6 gap-2">
        {cards.map(([b, k], i) => {
          const body = (
            <div className="flex flex-col gap-1 rounded border border-zinc-300 bg-white p-1">
              {k === "video" ? <CamFeed className="aspect-square" scene="room" boxes={false} hud={false} /> : <Avatar className="aspect-square" hue={150} />}
              <span className={cn("rounded px-1 text-[10px] font-semibold", b.startsWith("Strong") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{b}</span>
              <T className="text-[10px] text-zinc-500">{k === "video" ? "video · 0:04, 0:12" : `photo_${11 + i}.jpg`}</T>
            </div>
          );
          return k === "video" ? (
            <Hot key={i} i={0}>
              {body}
            </Hot>
          ) : (
            <div key={i}>{body}</div>
          );
        })}
      </div>
    </Desktop>
  );
}

function SMoment() {
  return (
    <Desktop>
      <Head title="Corridor B · 14 Nov · 0:12">
        <Hot i={0}>
          <Btn>Back to results</Btn>
        </Hot>
      </Head>
      <div className="relative">
        <CamFeed className="aspect-[16/8] w-full" scene="empty" />
        <span className="m3-pulse absolute top-[20%] left-[44%] flex h-20 w-16 items-end justify-center overflow-hidden border-2 border-emerald-400">
          <Avatar className="absolute inset-0 border-0" hue={150} />
          <span className="relative mb-1 bg-emerald-800 px-1 text-[11px] text-zinc-50">Strong 0.91</span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Btn>Play</Btn>
        <span className="relative h-1.5 flex-1 rounded bg-zinc-300">
          <span className="block h-full w-1/3 rounded bg-zinc-500" />
          {[13, 40].map((x) => (
            <span key={x} className="absolute -top-1 size-3.5 rounded-full border-2 border-white bg-emerald-500" style={{ left: `${x}%` }} />
          ))}
        </span>
        <T>0:12</T>
      </div>
    </Desktop>
  );
}

function SExclude() {
  return (
    <Desktop>
      <Head title="Excluded people" />
      <div className="flex flex-col gap-2">
        <Row className="border-amber-300 bg-amber-50">
          <Avatar className="size-10" hue={150} />
          <span className="flex flex-1 flex-col gap-0.5">
            <T className="font-semibold">Face 2 from the group photo</T>
            <T className="text-zinc-500">Asked not to be found · today 10:14 · 38 faces hidden</T>
          </span>
          <Hot i={0}>
            <Btn>Undo</Btn>
          </Hot>
        </Row>
        <T className="text-zinc-500">Excluded faces never appear in any search or watch on this computer, even after re-indexing.</T>
      </div>
    </Desktop>
  );
}

function SFace3d() {
  const rows = Array.from({ length: 9 }, (_, i) => i);
  return (
    <Desktop>
      <Head title="3D face · 3 photos fused">
        <Hot i={0}>
          <Btn>New photo</Btn>
        </Hot>
        <Hot i={1}>
          <Btn primary>Export .glb</Btn>
        </Hot>
      </Head>
      <div className="flex gap-4">
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((k) => (
            <Avatar key={k} className="size-16" hue={150} />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center rounded border border-zinc-300 bg-[#141b24] p-3">
          <svg viewBox="-60 -75 120 150" className="h-56" aria-hidden="true">
            <g style={{ animation: "m3-orbit 14s linear infinite", transformOrigin: "0 0", transformBox: "fill-box" }}>
              {rows.map((i) => (
                <ellipse key={`h${i}`} cx="0" cy={-60 + i * 15} rx={Math.sqrt(Math.max(0, 1 - ((-60 + i * 15) / 70) ** 2)) * 48} ry="4" fill="none" stroke="#7aa2ff" strokeWidth="0.7" opacity="0.8" />
              ))}
            </g>
            {rows.map((i) => (
              <ellipse key={`v${i}`} cx="0" cy="0" rx={6 + i * 5} ry="68" fill="none" stroke="#f2a33a" strokeWidth="0.6" opacity="0.55" />
            ))}
          </svg>
        </div>
        <div className="flex w-36 flex-col gap-1.5">
          {["Photo", "Clay", "Wire", "Depth", "ASCII"].map((m, i) => (
            <span key={m} className={cn("rounded border px-2 py-1 text-[11px]", i === 2 ? "border-zinc-700 bg-zinc-700 text-zinc-50" : "border-zinc-400 text-zinc-600")}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </Desktop>
  );
}

const SCHOOL: Record<string, () => React.ReactElement> = {
  signin: SignIn,
  live: Live,
  alert: Alert,
  camera: Camera,
  people: People,
  addperson: AddPerson,
  profile: Profile,
  search: Search,
  reports: Reports,
  settings: Settings,
  phone: Phone,
};
const RENDER: Record<ProductId, Record<string, () => React.ReactElement>> = {
  school: SCHOOL,
  worker: { shift: WShift, floor: WFloor, alert: WAlert, worker: WWorker, zones: WZones, report: WReport },
  search: { library: SLibrary, search: SSearch, results: SResults, moment: SMoment, exclude: SExclude, face3d: SFace3d },
};

/** Screen list, the frame, the night-scenario tour, and what each numbered target does. */
export function M3Wireframe() {
  const [pid, setPid] = useState<ProductId>("school");
  const p = m3Products.find((x) => x.id === pid)!;
  const [chain, setChain] = useState(false); // "Play all 3 scenarios"
  const [queued, setQueued] = useState(false); // next app's scenario waiting to start
  const [screen, setScreen] = useState<string>("live");
  const [trail, setTrail] = useState<string[]>([]);
  const [tour, setTour] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; click: number } | null>(null);
  const [say, setSay] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (s: string) => {
      if (s === screen) return;
      setTrail((t) => [...t, screen].slice(-20));
      setScreen(s);
    },
    [screen]
  );
  const back = () => {
    const prev = trail.at(-1);
    if (!prev) return;
    setTrail((t) => t.slice(0, -1));
    setScreen(prev);
  };
  const stop = () => {
    setTour(null);
    setCursor(null);
    setSay("");
    setChain(false);
    setQueued(false);
  };
  useEffect(() => {
    if (!queued) return;
    const id = window.setTimeout(() => {
      setQueued(false);
      setTour(0);
    }, 1400);
    return () => window.clearTimeout(id);
  }, [queued]);

  /** Switches the wireframe to another app, on its start screen. */
  const choose = (id: ProductId) => {
    const next = m3Products.find((x) => x.id === id)!;
    setPid(id);
    setTrail([]);
    setScreen(next.start);
  };
  const playAll = () => {
    choose("school");
    setChain(true);
    setTour(0);
  };

  /**
   * One tour step: show its screen, glide the cursor to the numbered target, play a click ripple,
   * then open the screen the target leads to and move on. Timers are cleared if the step changes or
   * the visitor presses Stop.
   */
  useEffect(() => {
    if (tour === null) return;
    const st = p.tour[tour];
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    setScreen(st.screen);
    setSay(st.say);
    at(450, () => {
      const frame = frameRef.current;
      const el = frame?.querySelector<HTMLElement>(`[data-hot="${st.screen}-${st.hot}"]`);
      if (!frame || !el) return stop();
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      el.classList.add("m3-target"); // pulsing glow on the box about to be clicked
      timers.push(window.setTimeout(() => el.classList.remove("m3-target"), 2100));
      at(350, () => {
        const fr = frame.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        setCursor((c) => ({ x: r.left - fr.left + frame.scrollLeft + r.width / 2, y: r.top - fr.top + frame.scrollTop + r.height / 2, click: c?.click ?? 0 }));
      });
      at(1600, () => setCursor((c) => c && { ...c, click: c.click + 1 }));
      at(2050, () => {
        const h = p.screens[st.screen].hot[st.hot];
        if (h.to) {
          setTrail((t) => [...t, st.screen].slice(-20));
          setScreen(h.to);
        }
        if (tour + 1 < p.tour.length) setTour(tour + 1);
        else
          at(1200, () => {
            const i = m3Products.findIndex((x) => x.id === pid);
            if (chain && i + 1 < m3Products.length) {
              // next app's scenario: switch, then start its first step
              const next = m3Products[i + 1];
              setPid(next.id);
              setTrail([]);
              setScreen(next.start);
              setCursor(null);
              setSay(`Next: ${next.label}.`);
              setTour(null);
              setQueued(true); // started by its own effect: this effect's timers are cleared when tour changes
              return;
            }
            setTour(null);
            setCursor(null);
            setChain(false);
            setSay(chain ? "All three scenarios finished. Hover any numbered box for its technical details." : "Scenario finished. Hover any numbered box for its technical details.");
          });
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [tour, pid]);

  const s = p.screens[screen] ?? p.screens[p.start];
  const Screen = RENDER[pid][screen] ?? RENDER[pid][p.start];
  const target = tour !== null ? p.screens[p.tour[tour].screen].hot[p.tour[tour].hot] : null;

  return (
    <Nav.Provider value={{ screen, go, p }}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs tracking-wide text-neutral-400 uppercase">App</span>
        {m3Products.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              stop();
              choose(x.id);
            }}
            aria-pressed={pid === x.id}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              pid === x.id ? "border-sky-400 bg-sky-400/15 text-white" : "border-white/10 text-neutral-300 hover:bg-white/5"
            )}
          >
            {x.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (chain ? stop() : playAll())}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            chain ? "border border-white/15 text-neutral-200 hover:bg-white/5" : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
          )}
        >
          {chain ? <Square className="size-3.5" /> : <Play className="size-4" />}
          {chain ? "Stop" : "Play all 3 scenarios"}
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
        <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible xl:flex-col xl:flex-nowrap">
          {p.order.map((id, n) => (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={screen === id ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                  screen === id ? "bg-sky-400/15 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="jet w-5 text-xs text-sky-400">{String(n + 1).padStart(2, "0")}</span>
                {p.screens[id].title}
              </button>
            </li>
          ))}
        </ol>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={back}
              disabled={!trail.length || tour !== null}
              className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => (tour === null ? (setChain(false), setTour(0)) : stop())}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-medium transition-colors",
                tour === null ? "bg-sky-600 text-white hover:bg-sky-500" : "border border-white/15 text-neutral-200 hover:bg-white/5"
              )}
            >
              {tour === null ? <Play className="size-4" /> : <Square className="size-3.5" />}
              {tour === null ? p.tourLabel : "Stop"}
            </button>
            <p className="text-sm text-neutral-300">
              <b className="text-white">{s.title}.</b> {s.purpose}
            </p>
          </div>

          {say && (
            <div
              key={tour ?? "done"}
              aria-live="polite"
              className="m3-step animate-in fade-in slide-in-from-left-4 mb-3 overflow-hidden rounded-2xl border-2 border-sky-400/60 bg-gradient-to-r from-sky-500/20 via-sky-400/10 to-transparent duration-500"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                {tour !== null && (
                  <span className="jet flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-500 leading-none font-bold text-white shadow-[0_0_24px_rgba(56,189,248,0.6)]">
                    <span className="text-lg">{String(tour + 1).padStart(2, "0")}</span>
                    <span className="text-[10px] opacity-80">of {String(p.tour.length).padStart(2, "0")}</span>
                  </span>
                )}
                <span className="min-w-0 flex-1 text-lg leading-snug font-semibold text-white sm:text-xl">{say}</span>
                {target && (
                  <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-neutral-200">
                    <MousePointer2 className="size-4 text-sky-300" /> clicking <b className="text-white">{target.label}</b> <StatusBadge status={target.status} />
                  </span>
                )}
              </div>
              {tour !== null && (
                <div className="flex gap-1 px-4 pb-3" aria-hidden="true">
                  {p.tour.map((_, i) => (
                    <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i < tour ? "bg-sky-400" : i === tour ? "m3-bar bg-sky-300" : "bg-white/15")} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={frameRef} className="relative overflow-x-auto rounded-2xl border border-white/10 bg-[#1a1f2a] p-4 [scrollbar-width:thin]">
            <div key={screen} className="animate-in fade-in w-fit duration-200">
              <Screen />
            </div>
            {cursor && (
              <div className="pointer-events-none absolute z-20 transition-[left,top] duration-700 ease-out" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">
                {cursor.click > 0 && <span key={cursor.click} className="m3-ripple absolute -top-3 -left-3 size-6 rounded-full border-2 border-sky-400" />}
                <MousePointer2 className="size-6 fill-white text-zinc-900 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-400 lg:hidden">The frame is wider than this screen: scroll it sideways.</p>

          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {s.hot.map((h, i) => (
              <li key={h.label} className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-700 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="text-neutral-300">
                  <b className="text-white">{h.label}</b>
                  {h.to ? (
                    <>
                      {" "}opens{" "}
                      <button type="button" onClick={() => go(h.to!)} className="text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:text-sky-200">
                        {p.screens[h.to].title}
                      </button>
                      .
                    </>
                  ) : (
                    ":"
                  )}{" "}
                  {h.note}
                  <span className="mt-1.5 flex items-center gap-2 text-xs text-neutral-400">
                    <StatusBadge status={h.status} /> hover the box for the technical details
                  </span>
                </span>
              </li>
            ))}
            {s.device === "desktop" && screen !== "signin" && (
              <li className="flex gap-2 rounded-xl border border-dashed border-white/10 p-2.5 text-sm text-neutral-400 sm:col-span-2">
                The sidebar ({p.sidebar.map((x) => x.label).join(", ")}) is on every screen and is clickable here too.
              </li>
            )}
          </ol>
        </div>
      </div>
    </Nav.Provider>
  );
}
