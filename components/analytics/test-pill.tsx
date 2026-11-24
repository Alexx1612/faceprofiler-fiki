"use client";

import { useEffect, useState } from "react";

import { setTestMode, testMode } from "@/lib/collect";

/**
 * Small fixed "TEST MODE" pill while this browser's visits are marked as the team's own (not counted).
 * Tap to turn test mode off. Shown whenever testMode() is on: ?test=1, localhost or automated browsers.
 */
export function TestPill() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(testMode());
    const sync = () => setOn(testMode());
    window.addEventListener("nauino:test", sync);
    return () => window.removeEventListener("nauino:test", sync);
  }, []);
  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => setTestMode(false)}
      title="Your visits are marked as test and left out of the analytics. Tap to turn off."
      className="fixed bottom-3 left-3 z-[70] flex min-h-9 items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-400/90 px-3 text-[11px] font-bold tracking-wide text-amber-950 shadow-lg hover:bg-amber-300"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-950" />
      TEST MODE
      <span aria-hidden className="font-normal opacity-70">· off</span>
    </button>
  );
}
