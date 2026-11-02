import type { Metadata } from "next";

import { M2Hint, M2Tabs } from "@/components/site/m2-tabs";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";

export const metadata: Metadata = {
  title: "Nau-ino · M2 Validation 1",
  description: "Milestone 2: customer discovery for Nau-ino, problem first, then the solution.",
};

/** Milestone 2 (Validation 1, idea): the documented customer discovery process, in tabs. */
export default function M2() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="m2" eyebrow="Milestone 2 · Validation 1 (idea)" title="Customer discovery: problem first, then the solution" lead={<M2Hint />}>
          <M2Tabs />
        </Section>
      </main>
      <Footer />
    </>
  );
}
