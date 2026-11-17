"use client";

import { useState } from "react";

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
    screen: "Live · Courtyard",
    video: "/clips/46446.mp4",
    poster: "/clips/46446.jpg",
    label: "LIVE · Courtyard camera",
    legend: [
      ["Green", "enrolled, named"],
      ["Red", "Unknown_N, a stranger"],
      ["track #", "follows each person"],
    ],
    text: "Three enrolled people walk past; a fourth face nobody enrolled gets its own Unknown number.",
    credit: "Our demo app on a stock clip (Mixkit). The names are fictional.",
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

export function DemoReel() {
  const [id, setId] = useState("faces");
  const d = demos.find((x) => x.id === id)!;
  return (
    <div className="lp-reel">
      <div className="lp-reel__tabs" role="group" aria-label="Demo">
        {demos.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === id} onClick={() => setId(x.id)}>
            {x.tab}
          </button>
        ))}
      </div>
      <div key={d.id} className="lp-tour__stage">
        <AppFrame screen={d.screen}>
          <div className="lp-cam">
            <video src={asset(d.video)} poster={asset(d.poster)} autoPlay muted loop playsInline aria-label={d.text} />
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
      </div>
    </div>
  );
}
