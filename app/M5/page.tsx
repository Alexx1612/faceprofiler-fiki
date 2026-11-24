import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { M5Hint, M5Tabs } from "@/components/site/m5-tabs";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";

export const metadata: Metadata = pageMetadata({
  path: "/M5/",
  title: "Nau-ino · M5 Lead generation: forms, analytics, campaign",
  description: "Milestone 5: lead forms and PostHog analytics on the landing page, the posts per channel, and which channel brought the most leads.",
});

/** Milestone 5 (lead generation): lead forms, analytics, campaign kit, log and channel comparison, in tabs. */
export default function M5() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="m5" level={1} eyebrow="Milestone 5 · Lead generation" title="Bringing people to the landing page, and counting who stays" lead={<M5Hint />}>
          <M5Tabs />
        </Section>
      </main>
      <Footer />
    </>
  );
}
