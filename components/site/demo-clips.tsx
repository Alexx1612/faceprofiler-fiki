"use client";

import { MousePointer2 } from "lucide-react";

import { HoverVideoPlayer } from "@/components/ui/hover-video-player";
import { asset, clips } from "@/lib/content";
import { Section } from "./section";

/** The three annotated demo clips; each plays on hover (tap on a phone). */
export function DemoClips() {
  return (
    <Section
      id="demo"
      eyebrow="Live demo"
      title="It already works on real video"
      lead={
        <>
          Seven people were enrolled from one or two photos each. In every clip they are named, tracked and read for head
          direction and expression; a passer-by stays <code className="jet text-sky-300">Unknown_1</code>.
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        {clips.map((clip) => (
          <figure key={clip.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <HoverVideoPlayer
              videoSrc={asset(`/clips/${clip.id}.mp4`)}
              thumbnailSrc={asset(`/clips/${clip.id}.jpg`)}
              muted
              loop
              preload="none"
              className="aspect-video w-full"
            />
            <figcaption className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-white">{clip.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">Recognised: {clip.people.join(", ")}</p>
              </div>
              <span className="jet flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-neutral-400 uppercase">
                <MousePointer2 className="size-3" /> Hover
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="text-muted-foreground mt-4 text-xs">
        Free Mixkit stock footage with fictional names. Rendered by the CPU-only demo edition.
      </p>
    </Section>
  );
}
