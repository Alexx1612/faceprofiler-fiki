import { Fundamentals } from "@/components/site/fundamentals";
import { Hero } from "@/components/site/hero";
import { Nav } from "@/components/site/nav";
import { Overview } from "@/components/site/overview";
import { Footer, Team } from "@/components/site/team";
import { Technology } from "@/components/site/technology";

export default function Home() {
  return (
    <>
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]" />
      <Nav />
      <main>
        <Hero />
        <Overview />
        <Fundamentals />
        <Technology />
        <Team />
      </main>
      <Footer />
    </>
  );
}
