"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Landing hero headline with two rotating words: the place ("school", "company"...) and the time
 * ("tonight", "today"...). Each sits on its own line, so a longer or shorter word never rewraps the
 * headline or moves the text and buttons below it. The old word blurs out upwards while the new one
 * blurs in. Screen readers, search engines and visitors with reduced motion get the fixed sentence
 * "Know who walks into your school tonight."
 */

const PLACES = ["school", "company", "office", "warehouse", "building"];
const TIMES = ["tonight", "today", "this weekend", "after hours"];
const HOLD_MS = 2800;

/** One word slot: the outgoing word and the incoming word share a grid cell and cross-fade with a blur. */
function Swap({ word, className }: { word: string; className?: string }) {
  const prev = useRef(word);
  const [old, setOld] = useState<string | null>(null);

  useEffect(() => {
    if (prev.current === word) return;
    setOld(prev.current);
    prev.current = word;
    const t = window.setTimeout(() => setOld(null), 600);
    return () => window.clearTimeout(t);
  }, [word]);

  return (
    <span className={`lp-swap ${className ?? ""}`}>
      {old && (
        <span key={`out-${old}`} className="lp-swap__out">
          {old}
        </span>
      )}
      <span key={word} className={old ? "lp-swap__in" : undefined}>
        {word}
      </span>
    </span>
  );
}

export function HeroCopy() {
  const [p, setP] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tick = 0;
    // The two words take turns, so only one changes at a time.
    const id = window.setInterval(() => {
      if (document.hidden) return;
      tick += 1;
      if (tick % 2) setP((n) => (n + 1) % PLACES.length);
      else setT((n) => (n + 1) % TIMES.length);
    }, HOLD_MS / 2);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <h1>
        <span className="lp-sr">Know who walks into your school tonight.</span>
        <span aria-hidden="true">
          Know who walks into your
          <br />
          <Swap word={PLACES[p]} className="lp-swap--place" />
          <br />
          {/* The full stop is part of the word, so it fades with it instead of jumping when the slot narrows. */}
          <Swap word={`${TIMES[t]}.`} />
        </span>
      </h1>
      <p className="lp-hero__lead">Nau-ino watches the cameras you already have and flags every stranger.</p>
    </>
  );
}
