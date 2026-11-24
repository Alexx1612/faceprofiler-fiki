import type { Metadata } from "next";

import { AnalyticsDashboard } from "@/components/site/analytics-dashboard";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";
import { pageMetadata } from "@/lib/seo";

/** Site analytics from our own collector; kept out of search engines and the sitemap. */
export const metadata: Metadata = {
  ...pageMetadata({
    path: "/analytics/",
    title: "Nau-ino · Site analytics",
    description: "Visitors, sources, clicks, funnel, survey and game results per site version, from the team's own collector.",
  }),
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="analytics" level={1} eyebrow="Site analytics · own collector" title="Who visits, from where, and what they do">
          <AnalyticsDashboard />
        </Section>
      </main>
      <Footer />
    </>
  );
}
