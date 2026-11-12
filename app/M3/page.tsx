import type { Metadata } from "next";

import { LandingLink, M3Hint, M3Tabs } from "@/components/site/m3-tabs";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";

export const metadata: Metadata = {
  title: "Nau-ino · M3 Wireframe and landing page",
  description: "Milestone 3: a clickable wireframe of the Nau-ino school console, its screen map, and the landing page.",
};

/** Milestone 3 (wireframe and landing page): the landing link first, then the wireframe in tabs. */
export default function M3() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="m3" level={1} eyebrow="Milestone 3 · Wireframe and landing page" title="How the console works, screen by screen" lead={<M3Hint />}>
          <div className="mb-4">
            <LandingLink />
          </div>
          <M3Tabs />
        </Section>
      </main>
      <Footer />
    </>
  );
}
