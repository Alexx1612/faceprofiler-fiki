"use client";

import { Circle, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { useAccount } from "@/lib/account";
import { collectUrl, isTeamEmail } from "@/lib/collect";
import { resumeShowcase, SHOWCASE_EVENT, showcaseInfo, startShowcase, stopShowcase } from "@/lib/replay";
import { cn } from "@/lib/utils";

/**
 * Showcase recording for the team: a Record button (in the account pill, team accounts only) and, while a
 * showcase runs, a REC pill with the time and Stop. The recording keeps going across page loads in the tab
 * (resumed here on mount) and appears under "Showcase" in the analytics Replays tab (lib/replay.ts).
 * The REC pill is excluded from the recording itself (data-no-replay).
 */

/** Whether the signed-in account is one of the team's (hash check; the collector still decides who sees replays). */
export function useTeamAccount(): boolean {
  const user = useAccount();
  const [team, setTeam] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!user) setTeam(false);
    else void isTeamEmail(user.email).then((t) => alive && setTeam(t));
    return () => {
      alive = false;
    };
  }, [user]);
  return team;
}

function useShowcase() {
  const [info, setInfo] = useState<{ session: string; started: number } | null>(null);
  useEffect(() => {
    const sync = () => setInfo(showcaseInfo());
    sync();
    window.addEventListener(SHOWCASE_EVENT, sync);
    return () => window.removeEventListener(SHOWCASE_EVENT, sync);
  }, []);
  return info;
}

/** Record button for the account pill (team accounts only, hidden while recording). */
export function RecordButton({ className }: { className?: string }) {
  const team = useTeamAccount();
  const info = useShowcase();
  if (!team || info || !collectUrl) return null;
  return (
    <button
      type="button"
      onClick={() => void startShowcase()}
      title="Record a showcase of the site (yours only, appears under Showcase in Analytics → Replays)"
      aria-label="Start a showcase recording"
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-red-300 hover:bg-white/10", className)}
    >
      <Circle className="size-3.5 fill-red-500 text-red-500" aria-hidden />
    </button>
  );
}

/** REC pill with time and Stop; mounted once in the root layout. Also resumes a showcase after navigation. */
export function ShowcaseRecorder() {
  const info = useShowcase();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (info) void resumeShowcase();
  }, [info]);
  useEffect(() => {
    if (!info) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [info]);
  if (!info) return null;
  const s = Math.max(0, Math.floor((now - info.started) / 1000));
  const left = Math.max(0, 15 * 60 - s);
  return (
    <div
      data-no-replay
      role="status"
      className="fixed right-3 bottom-3 z-[75] flex items-center gap-2 rounded-full border border-red-400/50 bg-[#1a0b0f]/95 py-1 pr-1 pl-3 text-xs font-semibold text-red-100 shadow-lg"
    >
      <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
      <span className="tabular-nums">
        REC {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
      </span>
      <span className="hidden font-normal text-red-200/70 sm:inline">· {Math.ceil(left / 60)} min left</span>
      <button
        type="button"
        onClick={stopShowcase}
        className="flex min-h-8 items-center gap-1 rounded-full bg-red-500 px-3 text-white hover:bg-red-400"
        aria-label="Stop the showcase recording"
      >
        <Square className="size-3 fill-white" aria-hidden /> Stop
      </button>
    </div>
  );
}
