"use client";

import { ArrowDown } from "lucide-react";

import { BgAnimateButton } from "@/components/ui/bg-animate-button";
import {
  HeroDitheringContainer,
  HeroDitheringContent,
  HeroDitheringMobileVisual,
  HeroDitheringRoot,
  HeroDitheringVisual,
} from "@/components/ui/hero-dithering";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import { asset, project } from "@/lib/content";
import { MetricsStrip } from "./metrics";

const shader = { colorBack: "#00000000", colorFront: "#38bdf8", shape: "sphere", type: "4x4", size: 2, speed: 0.6, scale: 0.75 } as const;

const proof = [
  ["99.7%", "known people named"],
  ["0", "wrong names in 405 photos"],
  ["7 of 10", "teachers need it"],
  ["80%", "of camera sites want a demo"],
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/** Hero: Cult UI dithering shader behind the title, a live clip floating over it. */
export function Hero() {
  return (
    <HeroDitheringRoot
      id="top"
      srTitle={`${project.name}: ${project.tagline}`}
      showBadges={false}
      showCta={false}
      desktopShaderProps={shader}
      mobileShaderProps={{ ...shader, scale: 0.6 }}
      className="pt-20 sm:pt-20"
    >
      <HeroDitheringContainer className="mx-auto max-w-6xl gap-4 px-4 pb-2 sm:gap-6 sm:px-6 sm:pb-2 lg:pb-2">
        <HeroDitheringContent className="sm:px-0 md:px-0 lg:pl-0 xl:pl-0">
          <NeumorphEyebrow intent="night">{project.eyebrow}</NeumorphEyebrow>
          <p aria-hidden="true" className="animate-in fade-in slide-in-from-bottom-4 text-5xl leading-none font-semibold tracking-[-0.04em] text-white duration-700 sm:text-6xl">
            {project.name}
          </p>
          <p className="max-w-xl text-lg leading-snug font-medium text-sky-100 sm:text-xl">{project.tagline}</p>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed sm:text-[15px]">{project.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <BgAnimateButton gradient="ocean" animation="spin-slow" shadow="deep" rounded="full" onClick={() => scrollTo("problem")}>
              <span className="flex items-center gap-2 px-1">
                Read the overview <ArrowDown className="size-4" />
              </span>
            </BgAnimateButton>
            <button
              onClick={() => scrollTo("team")}
              className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-white/5"
            >
              Meet the team
            </button>
          </div>
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {proof.map(([v, l]) => (
              <li key={l} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-300">
                <b className="font-semibold text-white">{v}</b> {l}
              </li>
            ))}
          </ul>
        </HeroDitheringContent>

        <div className="flex flex-col gap-3">
          <div className="relative">
          <HeroDitheringVisual className="lg:h-[320px] xl:h-[340px]" />
          <figure className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl shadow-sky-500/10 backdrop-blur lg:absolute lg:top-1/2 lg:left-1/2 lg:w-[88%] lg:-translate-x-1/2 lg:-translate-y-1/2">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-neutral-400">
              <span className="size-2 animate-pulse rounded-full bg-red-500" />
              <span className="jet tracking-wider uppercase">Cam 02 · Entrance</span>
              <span className="jet ml-auto">3 people · 0 unknown</span>
            </div>
            <video
              className="aspect-video w-full object-cover"
              src={asset("/clips/46446.mp4")}
              poster={asset("/clips/46446.jpg")}
              autoPlay
              muted
              loop
              playsInline
              aria-label="Demo clip: three colleagues recognised by name while walking"
            />
          </figure>
        </div>
          <MetricsStrip />
        </div>
      </HeroDitheringContainer>
      <HeroDitheringMobileVisual />
    </HeroDitheringRoot>
  );
}
