import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { Nav } from "@/components/site/nav";
import { PitchPage } from "@/components/site/pitch";
import { Footer } from "@/components/site/team";

export const metadata: Metadata = pageMetadata({
  path: "/pitch/",
  title: "Nau-ino · Pitch",
  description: "The Nau-ino pitch: problem, product, proof, customer validation, market, business model, competition, team and the ask.",
});

/** The investor pitch as one page, with the intro video first. */
export default function Pitch() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <PitchPage />
      </main>
      <Footer />
    </>
  );
}
