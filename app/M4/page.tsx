import type { Metadata } from "next";

import { M4Hint, M4Tabs } from "@/components/site/m4-tabs";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";

export const metadata: Metadata = {
  title: "Nau-ino · M4 UX",
  description: "Milestone 4: interviews with a night guard, a principal, an event-hall owner and three teachers; personas, user stories, use cases, user flows and the wireframe changes.",
};

/** Milestone 4 (UX): interviews, personas, stories, flows and wireframe changes, in tabs. */
export default function M4() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="m4" level={1} eyebrow="Milestone 4 · UX" title="Who uses Nau-ino at night, and what they need" lead={<M4Hint />}>
          <M4Tabs />
        </Section>
      </main>
      <Footer />
    </>
  );
}
