import { Advantage, Competition, Problem, Solution } from "@/components/site/business";
import { DemoClips } from "@/components/site/demo-clips";
import { Hero } from "@/components/site/hero";
import { Metrics } from "@/components/site/metrics";
import { Costs, Revenue } from "@/components/site/money";
import { Nav } from "@/components/site/nav";
import { Segments } from "@/components/site/segments";
import { Footer, Team } from "@/components/site/team";

export default function Home() {
  return (
    <>
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]" />
      <Nav />
      <main>
        <Hero />
        <DemoClips />
        <Problem />
        <Solution />
        <Segments />
        <Competition />
        <Advantage />
        <Metrics />
        <Costs />
        <Revenue />
        <Team />
      </main>
      <Footer />
    </>
  );
}
