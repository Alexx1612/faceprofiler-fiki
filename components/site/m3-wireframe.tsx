"use client";

import { ArrowLeft } from "lucide-react";
import { createContext, useContext, useState } from "react";

import { m3Order, m3Screens, m3Sidebar, type ScreenId } from "@/lib/m3";
import { cn } from "@/lib/utils";

/**
 * Clickable grey-box wireframe of the school console.
 *
 * Methodology: every screen is drawn from a handful of primitives (placeholder bars, image boxes with a
 * cross, outlined buttons). Numbered click targets come from `m3Screens[screen].hot`, so the badge in the
 * frame and the line in the list under it always agree. Clicking a target with a destination opens that
 * screen, which is how the wireframe shows the relations between views.
 */

const Nav = createContext<{ screen: ScreenId; go: (s: ScreenId) => void }>({ screen: "live", go: () => {} });

/** Placeholder text line. */
const Bar = ({ w = "100%", dark }: { w?: string; dark?: boolean }) => (
  <span className={cn("block h-2 rounded-sm", dark ? "bg-zinc-500" : "bg-zinc-300")} style={{ width: w }} />
);

/** Small real label (headings, button text). */
const T = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("text-[11px] leading-tight text-zinc-700", className)}>{children}</span>
);

/** Image placeholder: a box with a cross, the classic wireframe sign for "picture here". */
function Img({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded border border-zinc-400 bg-zinc-200", className)}>
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#a1a1aa" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#a1a1aa" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {label && <span className="absolute bottom-1 left-1 rounded-sm bg-zinc-100 px-1 text-[11px] text-zinc-600">{label}</span>}
    </div>
  );
}

const Btn = ({ children, primary }: { children: React.ReactNode; primary?: boolean }) => (
  <span className={cn("inline-flex items-center justify-center rounded border px-2.5 py-1 text-[11px]", primary ? "border-zinc-700 bg-zinc-700 text-zinc-50" : "border-zinc-400 bg-zinc-50 text-zinc-700")}>
    {children}
  </span>
);

/** Numbered click target. `i` is the index into the current screen's `hot` list. */
function Hot({ i, children, className, on }: { i: number; children: React.ReactNode; className?: string; on?: ScreenId }) {
  const { screen, go } = useContext(Nav);
  const h = m3Screens[on ?? screen].hot[i];
  const body = (
    <>
      <span className="absolute -top-2.5 -left-2.5 z-10 flex size-5 items-center justify-center rounded-full bg-sky-700 text-[11px] font-bold text-white shadow">{i + 1}</span>
      {children}
    </>
  );
  const cls = cn("relative block rounded outline-2 outline-offset-2 outline-sky-500 outline-dashed", className);
  return h.to ? (
    <button type="button" onClick={() => go(h.to!)} title={`${h.label}: opens ${m3Screens[h.to].title}`} className={cn(cls, "cursor-pointer text-left transition-colors hover:bg-sky-500/10 focus-visible:bg-sky-500/15 focus-visible:outline-solid")}>
      {body}
    </button>
  ) : (
    <span title={h.label} className={cls}>
      {body}
    </span>
  );
}

/** Desktop frame: title bar, sidebar (every item clickable), content. */
function Desktop({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  const { screen, go } = useContext(Nav);
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
            <T className="mb-2 px-1.5 font-semibold text-zinc-800">Nau-ino</T>
            {m3Sidebar.map((s) => (
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
          <Hot i={0}>
            <Img className="aspect-video" label="Main entrance" />
          </Hot>
          {["Side gate", "Corridor A", "Corridor B", "Gym", "Yard"].map((c) => (
            <Img key={c} className="aspect-video" label={c} />
          ))}
        </div>
        <div className="flex w-48 shrink-0 flex-col gap-2">
          <T className="font-semibold">Tonight</T>
          <Hot i={1}>
            <Row className="border-zinc-700">
              <span className="size-6 shrink-0 rounded-full border-2 border-zinc-700" />
              <span className="flex flex-col gap-1">
                <T className="font-semibold">Unknown_1</T>
                <T className="text-zinc-500">Side gate, 02:17</T>
              </span>
            </Row>
          </Hot>
          {["Night guard", "Cleaning staff", "Night guard"].map((n, i) => (
            <Row key={i}>
              <span className="size-6 shrink-0 rounded-full bg-zinc-300" />
              <span className="flex flex-1 flex-col gap-1">
                <T>{n}</T>
                <Bar w="60%" />
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
        <Img className="aspect-video w-[58%]" label="Snapshot, 02:17" />
        <div className="flex flex-1 flex-col gap-2">
          <Row>
            <Img className="size-12" />
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
        <Img className="aspect-[16/8] w-full" />
        <Hot i={0} className="absolute top-[18%] left-[22%]">
          <span className="flex h-20 w-16 items-end justify-center border-2 border-zinc-700 bg-white/40">
            <span className="mb-1 bg-zinc-700 px-1 text-[11px] text-zinc-50">Ana 0.84</span>
          </span>
        </Hot>
        <span className="absolute top-[24%] left-[60%] flex h-16 w-14 items-end justify-center border-2 border-dashed border-zinc-600 bg-white/40">
          <span className="mb-1 bg-zinc-600 px-1 text-[11px] text-zinc-50">Unknown_1</span>
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
            <Img className="aspect-[4/5]" />
            <T className="font-semibold">Ana Pop</T>
            <Bar w="60%" />
          </div>
        </Hot>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <Img className="aspect-[4/5]" />
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
            <Img className="aspect-[4/5] w-28" />
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
          <Img className="aspect-[4/5]" />
          <T>Staff, cleaning</T>
          <div className="flex gap-1.5">
            <Img className="size-10" />
            <Img className="size-10" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <T className="font-semibold">Seen today</T>
          <Hot i={0}>
            <Row>
              <Img className="h-8 w-14" />
              <T>Corridor B, 22:30</T>
            </Row>
          </Hot>
          {["Main entrance, 21:55", "Gym, 23:10", "Main entrance, 23:58"].map((s) => (
            <Row key={s}>
              <Img className="h-8 w-14" />
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
            <Img className="aspect-video" />
            <T>Side gate, 02:17</T>
          </div>
        </Hot>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-zinc-300 bg-white p-2">
            <Img className="aspect-video" />
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
            <Img className="mt-1 aspect-video" />
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

const SCREENS: Record<ScreenId, () => React.ReactElement> = {
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

/** Screen list, the frame, and what each numbered target does. */
export function M3Wireframe() {
  const [screen, setScreen] = useState<ScreenId>("live");
  const [trail, setTrail] = useState<ScreenId[]>([]);
  const go = (s: ScreenId) => {
    if (s === screen) return;
    setTrail((t) => [...t, screen].slice(-20));
    setScreen(s);
  };
  const back = () => {
    const prev = trail.at(-1);
    if (!prev) return;
    setTrail((t) => t.slice(0, -1));
    setScreen(prev);
  };
  const s = m3Screens[screen];
  const Screen = SCREENS[screen];

  return (
    <Nav.Provider value={{ screen, go }}>
      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
        <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible xl:flex-col xl:flex-nowrap">
          {m3Order.map((id, n) => (
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
                {m3Screens[id].title}
              </button>
            </li>
          ))}
        </ol>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={back}
              disabled={!trail.length}
              className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-sm text-neutral-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <p className="text-sm text-neutral-300">
              <b className="text-white">{s.title}.</b> {s.purpose}
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#1a1f2a] p-4 [scrollbar-width:thin]">
            <div key={screen} className="animate-in fade-in w-fit duration-200">
              <Screen />
            </div>
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
                        {m3Screens[h.to].title}
                      </button>
                      .
                    </>
                  ) : (
                    ":"
                  )}{" "}
                  {h.note}
                </span>
              </li>
            ))}
            {s.device === "desktop" && screen !== "signin" && (
              <li className="flex gap-2 rounded-xl border border-dashed border-white/10 p-2.5 text-sm text-neutral-400 sm:col-span-2">
                The sidebar (Live, People, Search, Reports, Settings) is on every screen and is clickable here too.
              </li>
            )}
          </ol>
        </div>
      </div>
    </Nav.Provider>
  );
}
