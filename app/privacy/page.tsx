import type { Metadata } from "next";

import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";
import { team } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/privacy/",
  title: "Nau-ino · Privacy",
  description: "What the Nau-ino website collects (sign-ups, pilot requests, anonymous analytics), why, where it is stored, for how long, and how to have it deleted.",
});

const UPDATED = "26 November 2026";

/**
 * Privacy page for the website (not for the camera product). Written to match what the site actually does:
 * lib/collect.ts (analytics, consent), lib/replay.ts (recordings), the landing forms and collector/*.gs.
 * Keep it in sync when any of those change.
 */
export default function PrivacyPage() {
  const contact = team[0].email;
  const rows: [string, string, string, string][] = [
    ["Updates sign-up", "E-mail, optional role", "Your consent", "Until you unsubscribe, at most 12 months after the project ends"],
    ["Book a pilot", "Name and e-mail from Google sign-in, school, role, optional phone and preferred call time", "Steps you asked for before an agreement; your consent", "12 months after the last contact"],
    ["Quick survey", "Your answers (no name, no e-mail)", "Your consent", "Until the end of the project"],
    ["Visit statistics", "Anonymous visitor id, pages, clicks, where you came from, device type, browser; country and region only if you click Accept (no IP address is stored)", "Our legitimate interest in knowing which channels work; consent for the id kept between visits", "Totals kept; detailed rows at most 12 months"],
    ["Session recordings", "Mouse moves, clicks and scrolling on our pages, with every typed field hidden; only if you click Accept", "Your consent", "30 days"],
  ];
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section id="privacy" level={1} eyebrow="Privacy" title="What this website collects, and why" lead={`Short and plain. Last updated ${UPDATED}.`}>
          <div className="max-w-3xl space-y-8 text-sm leading-relaxed text-neutral-300 sm:text-[15px]">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Who we are</h2>
              <p>
                Nau-ino is a student project at the National University of Science and Technology POLITEHNICA Bucharest. The team decides what this
                website collects. Contact: <a className="text-sky-300 underline underline-offset-2" href={`mailto:${contact}`}>{contact}</a>.
              </p>
              <p>This page is about the website only. The Nau-ino camera software keeps its data inside each school and has its own rules.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">What we collect</h2>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-white/[0.04] text-neutral-200">
                    <tr>
                      <th className="p-3 font-medium">When</th>
                      <th className="p-3 font-medium">What</th>
                      <th className="p-3 font-medium">Why we may</th>
                      <th className="p-3 font-medium">How long</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([when, what, why, howLong]) => (
                      <tr key={when} className="border-t border-white/10 align-top">
                        <td className="p-3 font-medium text-white">{when}</td>
                        <td className="p-3">{what}</td>
                        <td className="p-3">{why}</td>
                        <td className="p-3">{howLong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>We never sell or share your data with advertisers. We do not collect anything from the camera demos on this site: the photos and videos are fictional people or stock footage.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Your choice on the cookie bar</h2>
              <p>
                <b className="text-white">Accept</b> lets us keep an anonymous id in your browser between visits, look up your approximate location
                (country and region, never the IP address or city) and record your visit with typed fields hidden.{" "}
                <b className="text-white">Decline</b> keeps the visit anonymous for this tab only, with no location lookup and no recording. Browsers that send
                Do Not Track or Global Privacy Control are not counted at all. You can change your mind by clearing this site&apos;s data in your browser.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Where it is stored</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Form answers, sign-ups and visit statistics: a Google Sheet and Google Drive folder in the team&apos;s Google account (Google acts as our processor).</li>
                <li>Google sign-in on the pilot form: Google confirms your name and e-mail; we receive nothing else from your Google account.</li>
                <li>Web statistics may also go to PostHog, hosted in the European Union.</li>
                <li>The website itself is hosted on GitHub Pages; GitHub may keep standard server logs.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Your rights</h2>
              <p>
                You can ask to see, correct or delete what we hold about you, withdraw your consent, or object, by writing to{" "}
                <a className="text-sky-300 underline underline-offset-2" href={`mailto:${contact}`}>{contact}</a>. We answer within 30 days. You can also complain
                to the Romanian data protection authority (ANSPDCP, dataprotection.ro).
              </p>
            </section>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
