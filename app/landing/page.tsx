import { Check, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import Link from "next/link";

import { HeroCopy } from "@/components/landing/hero-copy";
import { PilotForm } from "@/components/landing/pilot-form";
import { Tour } from "@/components/landing/tour";
import { Logo } from "@/components/site/nav";
import { asset, team } from "@/lib/content";
import "./landing.css";

/**
 * Customer landing page for schools (Milestone 3). Built with the Hallmark skill, Dusk theme; its stamp
 * and waivers are the first lines of landing.css. Every colour and font goes through the tokens on `.lp`,
 * so this page cannot restyle the fiki pages. No metric, quote or logo appears that the team did not supply.
 */

const display = Wix_Madefor_Display({ subsets: ["latin", "latin-ext"], weight: ["500", "600"], variable: "--font-wix-display" });
const text = Wix_Madefor_Text({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-wix-text" });

export const metadata: Metadata = {
  title: "Nau-ino · Know who walks into your school tonight",
  description: "Nau-ino watches the cameras your school already has and flags every stranger. Free 30-day pilot on your own cameras.",
  openGraph: {
    title: "Nau-ino · Know who walks into your school tonight",
    description: "Nau-ino watches the cameras your school already has and flags every stranger. Free 30-day pilot on your own cameras.",
    images: [{ url: asset("/landing/campus-dusk-1080.jpg"), width: 1080, height: 720 }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const night = [
  { i: "I", name: "Ion, night guard", place: "Main entrance", time: "21:58" },
  { i: "A", name: "Ana, cleaning staff", place: "Corridor B", time: "22:30" },
  { i: "I", name: "Ion, night guard", place: "Gym door", time: "00:12" },
];

const CheckIcon = () => <Check aria-hidden="true" strokeWidth={2.4} />;

export default function Landing() {
  return (
    <div className={`lp ${display.variable} ${text.variable}`}>
      <a href="#main" className="lp-skip">
        Skip to content
      </a>
      <header className="lp-nav">
        <div className="lp-wrap lp-nav__bar">
          <a href="#top" className="lp-brand">
            <Logo />
            Nau-ino
          </a>
          <nav className="lp-nav__links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#modes">Day and night</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <a href="#pilot" className="lp-btn lp-btn--sm lp-nav__cta">
            Book a pilot
          </a>
        </div>
      </header>

      <main id="main">
        <section id="top" className="lp-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lp-hero__photo"
            src={asset("/landing/campus-dusk-1080.jpg")}
            srcSet={`${asset("/landing/campus-dusk-1080.jpg")} 1080w, ${asset("/landing/campus-dusk.jpg")} 1920w`}
            sizes="(orientation: portrait) 400vw, 100vw"
            alt=""
            fetchPriority="high"
          />
          <div className="lp-hero__scrim" />
          <div className="lp-wrap lp-hero__grid">
            <div>
              <HeroCopy />
              <div className="lp-actions">
                <a href="#pilot" className="lp-btn">
                  Book a pilot
                </a>
                <a href="#how" className="lp-btn lp-btn--ghost">
                  See how it works
                </a>
              </div>
              <p className="lp-hero__note">Free for 30 days, on your own cameras.</p>
            </div>

            <div className="lp-glass lp-night" aria-label="Sample night as the console shows it">
              <div className="lp-night__head">
                <div>
                  <p className="lp-night__title">Last night</p>
                  <p className="lp-night__sub">A sample night, fictional names</p>
                </div>
                <span className="lp-chip">6 cameras</span>
              </div>
              <ul className="lp-rows">
                {night.map((r) => (
                  <li key={r.time} className="lp-row">
                    <span className="lp-initial">{r.i}</span>
                    <span>
                      <span className="lp-row__name">{r.name}</span>
                      <br />
                      <span className="lp-row__place">{r.place}</span>
                    </span>
                    <span className="lp-row__status">
                      <CheckIcon />
                      {r.time}
                    </span>
                  </li>
                ))}
                <li className="lp-row lp-row--open">
                  <span className="lp-initial">?</span>
                  <span>
                    <span className="lp-row__name">Unknown_1</span>
                    <br />
                    <span className="lp-row__place">Side gate</span>
                  </span>
                  <span className="lp-row__status">
                    <span className="lp-dot" aria-hidden="true" />
                    02:17
                  </span>
                </li>
              </ul>
              <div className="lp-open">
                An adult nobody enrolled, at the side gate
                <b>Review</b>
              </div>
            </div>
          </div>
          <a href="#how" className="lp-cue">
            How it works
            <ChevronDown aria-hidden="true" strokeWidth={2} />
          </a>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">From enrolment to the morning report.</h2>
            <p className="lp-sub">Four steps, on the cameras and the computer the school already has.</p>
            <Tour />
          </div>
        </section>

        <section id="modes" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Two problems, one set of cameras.</h2>
            <p className="lp-sub">What teachers and a deputy headmistress told us at two schools.</p>
            <div className="lp-modes">
              <article className="lp-mode">
                <p className="lp-mode__when">School hours</p>
                <h3>Day</h3>
                <p>The risk is between people you know: a fight in a corridor, a child walking out alone.</p>
                <p>Nau-ino follows known faces from camera to camera and shows staff where to look.</p>
              </article>
              <article className="lp-mode lp-mode--night">
                <p className="lp-mode__when">After hours</p>
                <h3>Night</h3>
                <p>The risk is anyone at all, and the guard is on a round, not at the screen.</p>
                <p>Every face is checked. A stranger is flagged the moment they appear, with the cameras that saw them.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="privacy" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Faces stay in the building.</h2>
            <ul className="lp-facts">
              <li>
                <b>Runs at the school</b>
                <span>On a computer in the building. Video and faces are not sent to a cloud.</span>
              </li>
              <li>
                <b>Only enrolled people are named</b>
                <span>Everyone else is Unknown_1, Unknown_2. Nobody is looked up anywhere else.</span>
              </li>
              <li>
                <b>No emotion analysis</b>
                <span>It stays off in schools: the EU AI Act bans it there.</span>
              </li>
            </ul>
          </div>
        </section>

        <section id="pilot" className="lp-section">
          <div className="lp-wrap lp-pilot">
            <div>
              <h2 className="lp-h2">Try it for 30 days, free.</h2>
              <p className="lp-sub">On your own cameras, before anyone pays anything.</p>
              <ul className="lp-steps">
                <li>
                  <CheckIcon />
                  We visit and connect two or three cameras.
                </li>
                <li>
                  <CheckIcon />
                  You enrol the staff who are in the building at night.
                </li>
                <li>
                  <CheckIcon />
                  After 30 days we show you what it flagged, and you decide.
                </li>
              </ul>
            </div>
            <PilotForm />
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer__row">
            <span className="lp-brand">
              <Logo />
              Nau-ino
            </span>
            <Link href="/">Project wiki</Link>
            <Link href="/M3/">Wireframe</Link>
            <a href={`mailto:${team[1].email}`}>{team[1].email}</a>
          </div>
          <p className="lp-footer__credits">
            Campus photo: <a href="https://commons.wikimedia.org/wiki/File:Dickinson_Law_Exterior_Night.jpg">Dickinson Law Exterior Night</a>, Wikimedia Commons, CC0.
            Demo clip: Mixkit stock footage.
          </p>
        </div>
      </footer>
    </div>
  );
}
