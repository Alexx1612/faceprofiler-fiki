import { Check, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import Link from "next/link";

import { DemoReel } from "@/components/landing/demo-reel";
import { HeroCopy } from "@/components/landing/hero-copy";
import { NightLive } from "@/components/landing/night-live";
import { PilotForm } from "@/components/landing/pilot-form";
import { SpotGame } from "@/components/landing/spot-game";
import { Tour } from "@/components/landing/tour";
import { SurveyButton } from "@/components/landing/survey";
import { UpdatesForm } from "@/components/landing/updates-form";
import { AccountPill } from "@/components/analytics/account-pill";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Logo } from "@/components/site/nav";
import { asset, team } from "@/lib/content";
import { pageMetadata, siteUrl } from "@/lib/seo";
import "./landing.css";

/**
 * Customer landing page for schools (Milestone 3). Built with the Hallmark skill, Dusk theme; its stamp
 * and waivers are the first lines of landing.css. Every colour and font goes through the tokens on `.lp`,
 * so this page cannot restyle the fiki pages. No metric, quote or logo appears that the team did not supply.
 */

const display = Wix_Madefor_Display({ subsets: ["latin", "latin-ext"], weight: ["500", "600"], variable: "--font-wix-display" });
const text = Wix_Madefor_Text({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-wix-text" });

export const metadata: Metadata = pageMetadata({
  path: "/landing/",
  title: "Nau-ino · Know who walks into your school tonight",
  description: "Nau-ino watches the cameras your school already has and flags every stranger. Free 30-day pilot on your own cameras.",
  image: { url: `${siteUrl}/landing/campus-dusk-1080.jpg`, width: 1080, height: 720, alt: "A school campus at dusk" },
});


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
            <a href="#demo">Demo</a>
            <a href="#game">Game</a>
            <a href="#modes">Day and night</a>
            <a href="#privacy">Privacy</a>
            <a href="#pilot">Pilot</a>
            <a href="#updates">Updates</a>
          </nav>
          <AccountPill className="lp-account" />
          <SurveyButton />
          <TrackedLink href="#pilot" event="cta_book_pilot_click" props={{ place: "nav" }} className="lp-btn lp-btn--sm lp-nav__cta">
            Book a pilot
          </TrackedLink>
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
            width={1080}
            height={720}
            alt=""
            fetchPriority="high"
          />
          <div className="lp-hero__scrim" />
          <div className="lp-wrap lp-hero__grid">
            <div>
              <HeroCopy />
              <div className="lp-actions">
                <TrackedLink href="#pilot" event="cta_book_pilot_click" props={{ place: "hero" }} className="lp-btn">
                  Book a pilot
                </TrackedLink>
                <TrackedLink href="#updates" event="cta_get_notified_click" props={{ place: "hero" }} className="lp-btn lp-btn--ghost">
                  Get notified
                </TrackedLink>
              </div>
              <p className="lp-hero__note">Free for 30 days, on your own cameras.</p>
            </div>

            <NightLive />
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

        <section id="demo" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Watch it work on real cameras.</h2>
            <p className="lp-sub">Faces at a door, workers on a floor, people in a shop aisle: the same cameras, three uses.</p>
            <DemoReel />
          </div>
        </section>

        <section id="game" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Faster than a guard?</h2>
            <p className="lp-sub">Spot the one new face. You against the machine.</p>
            <SpotGame />
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
          <div className="lp-wrap">
            <div className="lp-glass lp-signup">
              <span className="lp-chip">Free · 30 days</span>
              <h2 className="lp-h2">Book a pilot.</h2>
              <p className="lp-sub">Sign in with Google, tell us about your school, and we set it up with you on your own cameras within 2 working days.</p>
              <PilotForm />
            </div>
          </div>
        </section>

        <section id="updates" className="lp-section">
          <div className="lp-wrap">
            <div className="lp-glass lp-signup">
              <span className="lp-chip">Coming soon</span>
              <h2 className="lp-h2">Hear first when <span style={{ whiteSpace: "nowrap" }}>Nau-ino</span> opens.</h2>
              <p className="lp-sub">One e-mail when the free pilot starts near you.</p>
              <UpdatesForm />
              <ul className="lp-signup__facts">
                <li>
                  <CheckIcon />
                  Faces stay in the building
                </li>
                <li>
                  <CheckIcon />
                  No spam, no sharing
                </li>
              </ul>
            </div>
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
            <Link href="/manuals/">User manuals</Link>
            <Link href="/privacy/">Privacy</Link>
            <a href={`mailto:${team[0].email}`}>{team[0].email}</a>
            <a href={`mailto:${team[1].email}`}>{team[1].email}</a>
          </div>
          <p className="lp-footer__credits">
            Campus photo: <a href="https://commons.wikimedia.org/wiki/File:Dickinson_Law_Exterior_Night.jpg">Dickinson Law Exterior Night</a>, Wikimedia Commons, CC0.
            Demo clip: Mixkit stock footage. Work floor and shop aisle: <a href="https://github.com/intel-iot-devkit/sample-videos">Intel IoT DevKit sample videos</a>, CC BY 4.0, adapted with analysis overlays.
          </p>
        </div>
      </footer>
    </div>
  );
}
