"use client";

import { useEffect, useState } from "react";

import { analyticsOn, consentStatus, initAnalytics, setConsent } from "@/lib/analytics";
import { testMode } from "@/lib/collect";

/**
 * Starts PostHog and/or our own collector (when configured) and shows a small consent bar until the visitor chooses.
 * Without a choice, or after "Decline", visits are still counted but without cookies (cookieless mode).
 */
export function Analytics() {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!analyticsOn) return;
    // the team's own browsers (test mode) are not counted, so they are not asked either
    initAnalytics().then(() => consentStatus().then((s) => setAsk(s === "pending" && !testMode())));
  }, []);
  if (!ask) return null;
  const choose = (accept: boolean) => {
    setConsent(accept);
    setAsk(false);
  };
  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-[#0a1529]/95 p-3 text-sm text-neutral-200 shadow-2xl backdrop-blur sm:p-4"
    >
      <p className="min-w-0 flex-1 basis-60">
        We count visits to improve this page. Accept allows a cookie, an approximate location (country, region) and anonymised session recordings (inputs hidden); Decline counts the visit without any of them.
      </p>
      <div className="flex gap-2">
        <button onClick={() => choose(false)} className="min-h-10 rounded-full border border-white/20 px-4 hover:bg-white/10">
          Decline
        </button>
        <button onClick={() => choose(true)} className="min-h-10 rounded-full bg-sky-600 px-4 font-medium text-white hover:bg-sky-500">
          Accept
        </button>
      </div>
    </div>
  );
}
