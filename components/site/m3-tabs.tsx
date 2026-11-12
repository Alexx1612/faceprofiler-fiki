"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { m3Landing, m3Method } from "@/lib/m3";
import { M3Flow } from "./m3-flow";
import { M3Wireframe } from "./m3-wireframe";
import { NextArrow, TabHint, TabLabel } from "./tab-hint";

const box = "rounded-2xl border border-white/10 bg-white/[0.02] p-4";

/** The landing page link, shown above the tabs so it is never hidden. */
export function LandingLink() {
  return (
    <Link
      href={m3Landing.path}
      className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] px-4 py-3 transition-colors hover:bg-sky-400/[0.12]"
    >
      <span className="text-base font-semibold text-white">Landing page</span>
      <span className="jet text-sm break-all text-sky-300">{m3Landing.url}</span>
      <ArrowUpRight className="ml-auto size-5 text-sky-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function Landing() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={box}>
        <p className="mb-2 text-sm font-semibold text-white">What it is</p>
        <p className="text-sm text-neutral-300">{m3Landing.summary}</p>
        <Link href={m3Landing.path} className="mt-3 inline-flex items-center gap-1 rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600">
          Open the landing page <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className={box}>
        <p className="mb-2 text-sm font-semibold text-white">Sections, top to bottom</p>
        <ol className="flex flex-col gap-1.5 text-sm text-neutral-300">
          {m3Landing.sections.map((s, i) => (
            <li key={s}>
              <span className="jet mr-2 text-xs text-sky-400">0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Method() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {m3Method.map((m) => (
        <div key={m.title} className={box}>
          <p className="mb-1 text-sm font-semibold text-white">{m.title}</p>
          <p className="text-sm text-neutral-400">{m.text}</p>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { label: "Wireframe", el: <M3Wireframe /> },
  { label: "Screen map", el: <M3Flow /> },
  { label: "Landing page", el: <Landing /> },
  { label: "How we made it", el: <Method /> },
];

export const M3Hint = () => <TabHint text={`${TABS.length} tabs. In the wireframe, click any numbered box to open the screen it leads to`} />;

/** Milestone 3 content as numbered tabs, same style as M2. */
export function M3Tabs() {
  return (
    <DirectionAwareTabs
      tabs={TABS.map((t, i) => ({ id: i, label: <TabLabel n={i + 1} text={t.label} />, content: <div className="mt-4 text-left">{t.el}</div> }))}
      trailing={(next) => <NextArrow onClick={next} />}
      className="max-w-full min-w-0 justify-start overflow-x-auto border border-white/10 bg-white/[0.06] [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] lg:[mask-image:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
    />
  );
}
