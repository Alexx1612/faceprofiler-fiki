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
import { TextAnimate } from "@/components/ui/text-animate";
import { asset, project } from "@/lib/content";

const shader = { colorBack: "#00000000", colorFront: "#38bdf8", shape: "sphere", type: "4x4", size: 2, speed: 0.6, scale: 0.75 } as const;

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
      className="pt-20 sm:pt-24"
    >
      <HeroDitheringContainer className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8 lg:pb-8">
        <HeroDitheringContent className="sm:px-0 md:px-0 lg:pl-0 xl:pl-0">
          <NeumorphEyebrow intent="night">{project.eyebrow}</NeumorphEyebrow>
          <TextAnimate
            text={project.name}
            type="calmInUp"
            className="-my-2 py-2 text-5xl leading-[1.1] font-semibold tracking-[-0.04em] text-white sm:text-7xl"
          />
          <p className="max-w-xl text-xl leading-snug font-medium text-sky-100 sm:text-2xl">{project.tagline}</p>
          <p className="text-muted-foreground max-w-xl text-base leading-relaxed">{project.description}</p>
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
        </HeroDitheringContent>

        <div className="relative">
          <HeroDitheringVisual className="lg:h-[340px] xl:h-[380px]" />
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
