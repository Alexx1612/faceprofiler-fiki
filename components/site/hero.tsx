"use client";

import { ArrowDown, Play } from "lucide-react";

import { BgAnimateButton } from "@/components/ui/bg-animate-button";
import {
  HeroDitheringContainer,
  HeroDitheringContent,
  HeroDitheringMobileVisual,
  HeroDitheringRoot,
  HeroDitheringVisual,
} from "@/components/ui/hero-dithering";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import { TextAnimate } from "@/components/ui/text-animate";
import { asset, project } from "@/lib/content";

const shader = { colorBack: "#00000000", colorFront: "#38bdf8", shape: "sphere", type: "4x4", size: 2, speed: 0.6, scale: 0.75 } as const;

const facts = [
  ["1-2", "photos to enrol a person"],
  ["0", "wrong names on 405 test photos"],
  ["100%", "on site, nothing sent to a cloud"],
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
      className="pt-28 sm:pt-32"
    >
      <HeroDitheringContainer className="mx-auto max-w-6xl px-4 sm:px-6">
        <HeroDitheringContent className="sm:px-0 md:px-0 lg:pl-0 xl:pl-0">
          <NeumorphEyebrow intent="night">{project.eyebrow}</NeumorphEyebrow>
          <TextAnimate
            text={project.name}
            type="calmInUp"
            className="-my-2 py-2 text-5xl leading-[1.1] font-semibold tracking-[-0.04em] text-white sm:text-7xl xl:text-8xl"
          />
          <p className="max-w-xl text-xl leading-snug font-medium text-sky-100 sm:text-2xl">{project.tagline}</p>
          <p className="text-muted-foreground max-w-xl text-base leading-relaxed">{project.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <BgAnimateButton gradient="ocean" animation="spin-slow" shadow="deep" rounded="full" onClick={() => scrollTo("demo")}>
              <span className="flex items-center gap-2 px-1">
                <Play className="size-4 fill-current" /> Watch it work
              </span>
            </BgAnimateButton>
            <button
              onClick={() => scrollTo("problem")}
              className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-white/5"
            >
              Read the overview <ArrowDown className="size-4" />
            </button>
          </div>
          <dl className="mt-4 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {facts.map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold text-white sm:text-3xl">{value}</dt>
                <dd className="text-muted-foreground mt-1 text-xs leading-snug sm:text-sm">{label}</dd>
              </div>
            ))}
          </dl>
        </HeroDitheringContent>

        <div className="relative">
          <HeroDitheringVisual />
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
      </HeroDitheringContainer>
      <HeroDitheringMobileVisual />
    </HeroDitheringRoot>
  );
}
