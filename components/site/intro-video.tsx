import { asset } from "@/lib/content";
import { Section } from "./section";

/** 24-second intro video right under the hero. */
export function IntroVideo() {
  return (
    <Section id="intro" eyebrow="Intro" title="Nau-ino in under 30 seconds">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
        <video
          className="aspect-video w-full"
          src={asset("/intro/nau-ino-intro.mp4")}
          poster={asset("/intro/nau-ino-intro.jpg")}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    </Section>
  );
}
