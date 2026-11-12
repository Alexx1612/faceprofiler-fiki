"use client";

import { useState } from "react";

import { asset, distance } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Meter } from "./charts";
import { Section } from "./section";

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

/** Distance test: two featured far frames with their numbers, the trained model's accuracy, two more cases. */
export function Distance() {
  const [masked, setMasked] = useState(true);
  const { correct, wrong, missed } = distance.accuracy;
  const known = correct + wrong + missed;
  const featured = distance.cases.filter((c) => distance.featured.includes(c.k));
  const others = distance.cases.filter((c) => !distance.featured.includes(c.k));
  const src = (k: number) => asset(`/distance/far-${k}${masked ? "-m" : ""}.jpg`);
  return (
    <Section id="proof" eyebrow="Proof · trained YOLOv8-nano" title="Tested from 30 metres away, mask on or off" lead={distance.evidence}>
      <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
        {[
          [true, "Mask on"],
          [false, "No mask"],
        ].map(([m, label]) => (
          <button
            key={String(label)}
            onClick={() => setMasked(m as boolean)}
            className={cn("inline-flex min-h-11 items-center rounded-full px-4 transition-colors sm:min-h-8", masked === m ? "bg-sky-400 text-sky-950" : "text-neutral-300 hover:text-white")}
          >
            {label as string}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {featured.map((c) => (
          <figure key={c.k} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(c.k)} alt={`${c.subject}, ${c.setting.toLowerCase()}, ${c.metres} m${masked ? ", masked" : ""}`} className="aspect-video w-full object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(`/distance/ref-${c.k}.jpg`)} alt={`${c.subject}: reference close-up`} className="absolute top-3 left-3 h-[38%] rounded-lg border border-white/40 shadow-lg" />
              <span className="jet absolute top-3 left-3 rounded-tl-lg rounded-br-lg bg-black/60 px-1.5 text-[11px] text-white uppercase">enrolled</span>
              <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-lg font-semibold text-white backdrop-blur">{c.metres} m</span>
            </div>
            <figcaption className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
              {[
                ["Distance", `${c.metres} m`],
                ["Mask", masked ? "On" : "Off"],
                ["Person size", `${c.px} px of 2,160 (${pct(c.px, 2160)})`],
                ["Result", "Not in the error log"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs tracking-wide text-neutral-400 uppercase">{k}</p>
                  <p className="text-sm font-medium text-white">{v}</p>
                </div>
              ))}
              <p className="col-span-2 text-xs text-neutral-400 sm:col-span-4">
                {c.subject} · {c.setting}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.05] p-4">
          <p className="text-sm font-semibold text-white">Trained model, 405-photo real-world test</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { v: pct(correct, correct + wrong), l: "of the names it gave were right", part: correct, whole: correct + wrong },
              { v: pct(correct, known), l: "of known faces found and named", part: correct, whole: known },
              { v: pct(wrong, known), l: "wrong names", part: wrong, whole: known },
            ].map(({ v, l, part, whole }) => (
              <div key={l}>
                <p className="text-2xl font-semibold text-white">{v}</p>
                <p className="text-xs leading-snug text-neutral-300">{l}</p>
                <Meter part={part} whole={whole} label={`${l}: ${part} of ${whole}`} />
                <p className="jet mt-1 text-xs text-neutral-400">
                  {part} of {whole}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">Dry run on harder real-world photos; the 58 missed faces got no name rather than a wrong one.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {others.map((c) => (
            <figure key={c.k} className="overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(c.k)} alt={`${c.subject}, ${c.setting.toLowerCase()}, ${c.metres} m`} className="aspect-video w-full object-cover" />
              <figcaption className="px-2 py-1.5 text-[11px] text-neutral-300">
                {c.subject} · {c.setting} · <b className="text-white">{c.metres} m</b>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{distance.pipeline}</p>
      <p className="text-xs text-neutral-400">{distance.caveat}</p>
    </Section>
  );
}
