"use client";

import { ArrowDown, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

/**
 * The demo clip with a pause button. It loops on its own, except when the visitor asked for reduced motion:
 * then it holds its poster until they press play.
 */
function DemoClip() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => undefined);
    else {
      v.pause();
      setPlaying(false);
    }
  };
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-1 text-[11px] text-neutral-300">
        <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
        <span className="jet tracking-wider uppercase">Cam 02 · Entrance</span>
        <span className="jet ml-auto">3 people · 0 unknown</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the demo clip" : "Play the demo clip"}
          className="-mr-2 flex size-9 items-center justify-center rounded-full text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-300"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
      </div>
      <video
        ref={ref}
        className="aspect-video w-full object-cover"
        src={asset("/clips/46446.mp4")}
        poster={asset("/clips/46446.jpg")}
        muted
        loop
        playsInline
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        aria-label="Demo clip: three colleagues recognised by name while walking"
      />
    </>
  );
}

/** Hero: Cult UI dithering shader behind the title, a live clip floating over it. */
export function Hero() {
  // With reduced motion asked for, the shader draws one still frame (speed 0) instead of a moving loop.
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setStill(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const desk = still ? { ...shader, speed: 0 } : shader;
  return (
    <HeroDitheringRoot
      id="top"
      srTitle={`${project.name}: ${project.tagline}`}
      showBadges={false}
      showCta={false}
      desktopShaderProps={desk}
      mobileShaderProps={{ ...desk, scale: 0.6 }}
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
            <button
              type="button"
              onClick={() => scrollTo("problem")}
              className="flex min-h-11 items-center gap-2 rounded-full bg-sky-400 px-5 text-sm font-medium text-sky-950 transition-colors hover:bg-sky-300"
            >
              Read the overview <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo("team")}
              className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm text-neutral-200 transition-colors hover:bg-white/5"
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
            <DemoClip />
          </figure>
        </div>
          <MetricsStrip />
        </div>
      </HeroDitheringContainer>
      <HeroDitheringMobileVisual />
    </HeroDitheringRoot>
  );
}
