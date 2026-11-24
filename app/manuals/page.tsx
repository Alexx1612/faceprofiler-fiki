import type { Metadata } from "next";

import { Manuals } from "@/components/site/manuals";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/manuals/",
  title: "Nau-ino · User manuals (PDF, English and Romanian)",
  description: "Step-by-step user manuals for the Nau-ino camera app, Worker Analytics, the Android app and the 3D face demo. Read online or download.",
});

/** User manuals page: the PDFs made by Nau-ino's tools/make_manuals.py, readable inline or downloadable. */
export default function ManualsPage() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="manuals" level={1} eyebrow="User manuals · PDF" title="How to use each Nau-ino app" lead="Read a manual here or download it. Every manual is in English and Romanian, with screenshots from the apps.">
          <Manuals />
        </Section>
      </main>
      <Footer />
    </>
  );
}
