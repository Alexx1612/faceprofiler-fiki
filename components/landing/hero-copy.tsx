"use client";

import { useEffect, useState } from "react";

/**
 * Landing hero headline and lead with a rotating place word ("school", "company", "office"...).
 * The headline and the lead change together, so both always name the same place. The first word is
 * "school", which is also what screen readers, search engines and visitors with reduced motion get:
 * the rotating text is aria-hidden and a fixed sentence sits beside it for assistive technology.
 */

const PLACES = ["school", "company", "office", "warehouse", "building"];
const HOLD_MS = 2600;

export function HeroCopy() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % PLACES.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, []);

  const place = PLACES[i];

  return (
    <>
      <h1>
        <span className="lp-sr">Know who walks into your school tonight.</span>
        <span aria-hidden="true">
          Know who walks into your
          <br />
          <span className="lp-swap">
            <span key={place} className="lp-swap__word">
              {place}
            </span>
          </span>{" "}
          tonight.
        </span>
      </h1>
      <p className="lp-hero__lead">
        <span className="lp-sr">Nau-ino watches the cameras your school already has and flags every stranger.</span>
        <span aria-hidden="true">
          Nau-ino watches the cameras your{" "}
          <span key={place} className="lp-swap__soft">
            {place}
          </span>{" "}
          already has and flags every stranger.
        </span>
      </p>
    </>
  );
}
