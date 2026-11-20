import type { Metadata } from "next";

import { Distance } from "@/components/site/distance";
import { Fundamentals } from "@/components/site/fundamentals";
import { Hero } from "@/components/site/hero";
import { IntroVideo } from "@/components/site/intro-video";
import { Nav } from "@/components/site/nav";
import { Overview } from "@/components/site/overview";
import { Footer, Team } from "@/components/site/team";
import { Technology } from "@/components/site/technology";
import { project } from "@/lib/content";
import { pageMetadata, siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "Nau-ino · Security on the CCTV cameras you already have",
  description: project.tagline,
});

/** schema.org description of the site and product, for search engines and AI answers. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: `${siteUrl}/`, name: siteName, description: project.tagline },
    {
      "@type": "SoftwareApplication",
      name: siteName,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Windows, Android",
      description: project.tagline,
      url: `${siteUrl}/`,
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]" />
      <Nav />
      <main>
        <Hero />
        <IntroVideo />
        <Overview />
        <Distance />
        <Fundamentals />
        <Technology />
        <Team />
      </main>
      <Footer />
    </>
  );
}
