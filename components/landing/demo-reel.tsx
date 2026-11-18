"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { asset } from "@/lib/content";

import { AppFrame } from "./app-frame";

/**
 * "See it on real cameras": the three demos as app windows with their real overlays.
 * Faces: our demo on a stock clip (fictional names). Work floor and shop aisle: Worker Analytics run
 * on Intel IoT DevKit sample videos (CC BY 4.0, overlays added); the results quoted are the ones
 * checked by hand in the real-footage demo. Only the chosen video plays, to keep the page light.
 */

const demos = [
  {
    id: "faces",
    tab: "Faces",
    screen: "Live · Hallway",
    video: "/clips/315.mp4",
    poster: "/clips/315.jpg",
    label: "LIVE · Hallway camera",
    legend: [
      ["Green", "enrolled, named"],
      ["Red", "Unknown_N, a stranger"],
      ["track #", "follows each person"],
    ],
    text: "Two enrolled people walk down a hall and are named as they go; a face nobody enrolled would get its own Unknown number.",
    credit: "Our demo app on a stock clip (Mixkit, free licence). The names are fictional.",
  },
  {
    id: "floor",
    tab: "Work areas",
    screen: "Worker Analytics · Industrial floor",
    video: "/clips/worker-zone.mp4",
    poster: "/clips/worker-zone.jpg",
    label: "LIVE · Floor camera",
    legend: [
      ["Station A", "work zone, helmet + vest"],
      ["Exit", "leaving is counted"],
      ["H V", "helmet and vest seen"],
    ],
    text: "Six people pass the station. Checked by hand: people in view exact on 67 of 67 seconds, 6 tracks for 6 people, all 6 seen leaving, no false gear alarms.",
    credit: "Intel IoT DevKit sample video, CC BY 4.0; analysis overlays added by Worker Analytics.",
  },
  {
    id: "shop",
    tab: "Shop aisle",
    screen: "Worker Analytics · Shop aisle",
    video: "/clips/shop-aisle.mp4",
    poster: "/clips/shop-aisle.jpg",
    label: "LIVE · Aisle camera",
    legend: [
      ["Red box", "gear missing in a gear zone"],
      ["P1…P5", "one track per person"],
      ["Floor", "zone marked as a test"],
    ],
    text: "The false-alarm test: the whole aisle was marked 'helmet + vest required' and nobody wears gear, so red is the right answer. A helmet was wrongly seen on 2% of boxes.",
    credit: "Intel IoT DevKit sample video, CC BY 4.0; analysis overlays added by Worker Analytics.",
  },
];

const TABS = [...demos.map((d) => ({ id: d.id, tab: d.tab })), { id: "face3d", tab: "3D face" }];

/**
 * Collapsed by default: a single row ("Watch the demos") that opens the tabs. Nothing heavy loads
 * until it is opened, and only the chosen video or the 3D creator is mounted.
 */
export function DemoReel() {
  // reduced motion asked for: the clips do not start by themselves; they get play controls instead
  const [still, setStill] = useState(false);
  useEffect(() => setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("faces");
  const d = demos.find((x) => x.id === id);
  return (
    <div className="lp-reel">
      <button type="button" className="lp-reel__toggle" aria-expanded={open} aria-controls="lp-reel-body" onClick={() => setOpen((o) => !o)}>
        <span>
          <b>{open ? "Hide the demos" : "Watch the demos"}</b>
          <small>Faces at a door · workers in their work areas · a shop aisle · a 3D face from photos</small>
        </span>
        <ChevronDown aria-hidden="true" className={open ? "lp-reel__chev lp-reel__chev--open" : "lp-reel__chev"} />
      </button>
      {open && (
        <div id="lp-reel-body" className="lp-reel__body">
          <div className="lp-reel__tabs" role="group" aria-label="Demo">
            {TABS.map((x) => (
              <button key={x.id} type="button" aria-pressed={x.id === id} onClick={() => setId(x.id)}>
                {x.tab}
              </button>
            ))}
          </div>
          <div key={id} className="lp-tour__stage">
            {d ? (
              <AppFrame screen={d.screen}>
                <div className="lp-cam">
                  <video src={asset(d.video)} poster={asset(d.poster)} autoPlay={!still} controls={still} muted loop playsInline preload="metadata" aria-label={d.text} />
                  <span className="lp-cam__badge lp-cam__badge--left">{d.label}</span>
                  <span className="lp-cam__badge lp-cam__badge--right">
                    <span className="lp-cam__rec" aria-hidden="true" />
                    REC
                  </span>
                </div>
                <div className="lp-cam__stats">
                  {d.legend.map(([k, v]) => (
                    <span key={k}>
                      <b>{k}</b> {v}
                    </span>
                  ))}
                </div>
                <p className="lp-reel__text">{d.text}</p>
                <p className="lp-pane__caption">{d.credit}</p>
              </AppFrame>
            ) : (
              <AppFrame screen="3D Face" status="Runs in your browser">
                <iframe className="lp-reel__frame" src={asset("/face3d/")} title="3D face from stock photos" loading="lazy" />
                <p className="lp-reel__text">
                  Stock faces from our demo, each from up to three angles, turned into one 3D face. Drag to turn it, switch to clay, depth or ASCII.
                </p>
                <p className="lp-pane__caption">Fictional people from stock footage. The full app also takes your own photos; nothing is uploaded.</p>
              </AppFrame>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
