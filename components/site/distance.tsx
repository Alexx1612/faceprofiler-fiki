"use client";

import { useState } from "react";

import { asset, distance } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Section } from "./section";

/** Distance test: close-up reference next to the farthest frame, mask on or off. */
export function Distance() {
  const [masked, setMasked] = useState(false);
  return (
    <Section
      id="proof"
      eyebrow="Proof · trained YOLOv8-nano"
      title="Tested from 30 steps away, mask on or off"
      lead={distance.evidence}
    >
      <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
        {[
          [false, "No mask"],
          [true, "Mask on"],
        ].map(([m, label]) => (
          <button
            key={String(label)}
            onClick={() => setMasked(m as boolean)}
            className={cn("rounded-full px-4 py-1.5 transition-colors", masked === m ? "bg-sky-400 text-sky-950" : "text-neutral-300 hover:text-white")}
          >
            {label as string}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {distance.cases.map((c) => (
          <figure key={c.k} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(`/distance/far-${c.k}${masked ? "-m" : ""}.jpg`)}
                alt={`${c.subject}, ${c.setting.toLowerCase()}, step ${c.step}${masked ? ", masked" : ""}`}
                className="aspect-video w-full object-cover"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(`/distance/ref-${c.k}.jpg`)}
                alt={`${c.subject}: reference close-up`}
                className="absolute top-2 left-2 h-[46%] rounded-lg border border-white/40 shadow-lg"
              />
              <span className="jet absolute top-2 left-2 rounded-br-lg rounded-tl-lg bg-black/60 px-1.5 text-[9px] text-white uppercase">enrolled</span>
            </div>
            <figcaption className="px-3 py-2 text-xs">
              <p className="text-neutral-200">
                {c.subject} · {c.setting}
              </p>
              <p className="jet text-[10px] text-neutral-400">
                step {c.step} · person {c.px} px of 2,160
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-400">{distance.pipeline}</p>
      <p className="text-[11px] text-neutral-500">{distance.caveat}</p>
    </Section>
  );
}
