/**
 * The clickable wireframes on the M3 page, one per app: the school console (camera app), Worker
 * Analytics and Face Search. Each product lists its screens with numbered click targets (`hot`,
 * with technical details shown on hover), its sidebar, and the scenario the Play button walks through.
 * Statuses follow the real apps (Built / Partly built / Next). Names are fictional.
 */
import { m3Order, m3Screens, m3Sidebar, m3Tour, type Hot } from "./m3";

export type ScreenDef = { title: string; device: "desktop" | "phone"; purpose: string; hot: Hot[] };
export type TourStep = { screen: string; hot: number; say: string };
export type ProductId = "school" | "worker" | "search";
export type Product = {
  id: ProductId;
  label: string;
  brand: string;
  start: string;
  tourLabel: string;
  screens: Record<string, ScreenDef>;
  order: string[];
  sidebar: { label: string; to: string }[];
  tour: TourStep[];
};

const school: Product = {
  id: "school",
  label: "School console",
  brand: "Nau-ino",
  start: "live",
  tourLabel: "Play the night scenario",
  screens: m3Screens,
  order: m3Order,
  sidebar: m3Sidebar,
  tour: m3Tour,
};

const worker: Product = {
  id: "worker",
  label: "Worker Analytics",
  brand: "Worker Analytics",
  start: "shift",
  tourLabel: "Play the shift scenario",
  order: ["shift", "floor", "alert", "worker", "zones", "report"],
  sidebar: [
    { label: "Shift", to: "shift" },
    { label: "Floor", to: "floor" },
    { label: "Zones", to: "zones" },
    { label: "Reports", to: "report" },
  ],
  screens: {
    shift: {
      title: "Start a shift",
      device: "desktop",
      purpose: "Choose the camera or a video, the floor layout and how often to analyse, then start.",
      hot: [
        {
          label: "Floor camera",
          to: "floor",
          note: "Starts the shift on the live camera.",
          does: ["Reads one fixed camera that sees the floor", "Analyses 5, 2 or 1 frames per second (a laptop CPU reaches about 3 live)"],
          needs: ["Workers' consent and a notice on site", "The camera's stream or a USB webcam"],
          status: "built",
        },
        {
          label: "Real footage: industrial floor",
          to: "floor",
          note: "Runs the built-in Intel sample clip with its own layout.",
          does: ["75 s clip, 6 people, Station A and Exit drawn on the floor markings", "Checked by hand: people in view exact on 67 of 67 seconds"],
          needs: ["Nothing: the clip is bundled (CC BY 4.0)"],
          status: "built",
        },
      ],
    },
    floor: {
      title: "Live floor",
      device: "desktop",
      purpose: "The camera with the zones drawn on it, every person tracked, and who is where right now.",
      hot: [
        {
          label: "W3 in the restricted zone",
          to: "alert",
          note: "Opens the alert for W3.",
          does: ["Finds people (YOLOX) and follows them (box overlap + clothing colour)", "A zone entry counts after 1 s, so a step over the line is not an event"],
          needs: ["Zones drawn once per camera"],
          status: "built",
        },
        {
          label: "Zones",
          to: "zones",
          note: "Opens the zone editor.",
          does: ["Work, break, exit and restricted zones as polygons on the picture"],
          needs: ["Nothing"],
          status: "built",
        },
        {
          label: "End shift",
          to: "report",
          note: "Stops the analysis and writes the report.",
          does: ["Closes the shift and computes every worker's numbers"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    alert: {
      title: "Alert",
      device: "desktop",
      purpose: "One event: who, where, since when, and what the camera saw.",
      hot: [
        {
          label: "Open W3",
          to: "worker",
          note: "Shows W3's whole shift.",
          does: ["Helmet and vest: a colour rule plus a small trained classifier per person box", "A violation needs 5 s without gear, so one bad frame does not alarm"],
          needs: ["To improve: training on footage from the real site (helmet recall on stock clips is about 48 %)"],
          status: "partial",
        },
        {
          label: "Back to the floor",
          to: "floor",
          note: "Returns to the live view.",
          does: ["Returns to the live view"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    worker: {
      title: "Worker W3",
      device: "desktop",
      purpose: "Where one worker spent the shift: own zone, other zones, exits, idle time and gear.",
      hot: [
        {
          label: "Shift report",
          to: "report",
          note: "Opens the report for everyone.",
          does: ["Timeline of zones per second, own-zone %, exits, active/idle, distance", "Named by face or badge colour, by majority vote over a few seconds"],
          needs: ["Faces or badge colours registered per worker (optional)"],
          status: "built",
        },
      ],
    },
    zones: {
      title: "Zones",
      device: "desktop",
      purpose: "Draw the work areas on the camera picture, or let the app suggest them from where people stood.",
      hot: [
        {
          label: "Suggest work areas",
          note: "Proposes zones from the last shift.",
          does: ["Clusters where people stood still into proposed zone polygons", "On the industrial clip it found one area, exactly where two people stood"],
          needs: ["One analysed shift first"],
          status: "built",
        },
        {
          label: "Save layout",
          to: "floor",
          note: "Saves the zones and returns to the floor.",
          does: ["Stores the layout as JSON; layouts can be loaded and shared"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    report: {
      title: "Shift report",
      device: "desktop",
      purpose: "Every worker's numbers for the shift, a heatmap of where people were, and exports.",
      hot: [
        {
          label: "W3's row",
          to: "worker",
          note: "Opens W3.",
          does: ["Per worker: own zone %, exits, idle, helmet and vest compliance, restricted entries"],
          needs: ["Nothing"],
          status: "built",
        },
        {
          label: "Export",
          note: "Saves the report.",
          does: ["JSON, CSV and HTML, with heatmap pictures"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
  },
  tour: [
    { screen: "shift", hot: 1, say: "07:00: the shift starts on the floor camera." },
    { screen: "floor", hot: 0, say: "W3 walks into the restricted area, without a helmet." },
    { screen: "alert", hot: 0, say: "After 5 s without gear it becomes an alert. The supervisor opens W3." },
    { screen: "worker", hot: 0, say: "W3's whole shift, second by second." },
    { screen: "report", hot: 0, say: "End of shift: the report for everyone, ready to export." },
  ],
};

const search: Product = {
  id: "search",
  label: "Face Search",
  brand: "Face Search",
  start: "library",
  tourLabel: "Play the search scenario",
  order: ["library", "search", "results", "moment", "exclude", "face3d"],
  sidebar: [
    { label: "Library", to: "library" },
    { label: "Search", to: "search" },
    { label: "Results", to: "results" },
    { label: "3D face", to: "face3d" },
  ],
  screens: {
    library: {
      title: "Library",
      device: "desktop",
      purpose: "The folders on this computer that are searched. Nothing online is ever searched.",
      hot: [
        {
          label: "Add folder",
          note: "Indexes another folder.",
          does: ["Finds every face in every photo, and in one video frame every 2 s", "Re-indexing reads only new or changed files"],
          needs: ["Folders the school has the right to process", "Never the web: the EU AI Act bans scraped face databases"],
          status: "built",
        },
        {
          label: "Search a face",
          to: "search",
          note: "Opens the search.",
          does: ["Opens the search with a photo"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    search: {
      title: "Search",
      device: "desktop",
      purpose: "Drop a photo; every face in it gets a number, and you choose the one to search.",
      hot: [
        {
          label: "Face 2",
          to: "results",
          note: "Searches only this face.",
          does: ["Each face shows its best match before you choose", "Up to 3 photos of the same person (checked to be one person)"],
          needs: ["A face at least about 60 px wide"],
          status: "built",
        },
        {
          label: "3D face",
          to: "face3d",
          note: "Builds a 3D face from this person's photos.",
          does: ["478 face points per photo, up to 3 angles fused into one shape"],
          needs: ["Internet once, to download the face model"],
          status: "built",
        },
      ],
    },
    results: {
      title: "Results",
      device: "desktop",
      purpose: "Every photo and video moment of that face, best match first, in score bands.",
      hot: [
        {
          label: "A video result",
          to: "moment",
          note: "Opens the video where the person appears.",
          does: ["Strong 0.55 · Likely 0.45 · Possible 0.36; 0 false matches above 0.45 on 73,433 demo pairs", "Videos list every time the person appears; identical copies are folded"],
          needs: ["A result is a lead, not proof: confirm by eye"],
          status: "built",
        },
        {
          label: "Exclude this person",
          to: "exclude",
          note: "Opt-out: never show this person again.",
          does: ["Stores the person's vector in a block list; matching faces are hidden from every search"],
          needs: ["To add: a log of who searched for whom"],
          status: "built",
        },
      ],
    },
    moment: {
      title: "Video moment",
      device: "desktop",
      purpose: "The video, at the second the person appears, with their face boxed.",
      hot: [
        {
          label: "Back to results",
          to: "results",
          note: "Returns to the results.",
          does: ["Returns to the list"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    exclude: {
      title: "Excluded people",
      device: "desktop",
      purpose: "People who asked not to be found. They never appear in results on this computer.",
      hot: [
        {
          label: "Undo",
          to: "results",
          note: "Removes the exclusion.",
          does: ["Takes the person off the block list"],
          needs: ["Nothing"],
          status: "built",
        },
      ],
    },
    face3d: {
      title: "3D face",
      device: "desktop",
      purpose: "One to three photos of a person become a 3D face you can turn, relight and export.",
      hot: [
        {
          label: "New photo",
          to: "search",
          note: "Back to the search.",
          does: ["Returns to choose another photo"],
          needs: ["Nothing"],
          status: "built",
        },
        {
          label: "Export .glb",
          note: "Saves the 3D face as a file.",
          does: ["One .glb file with the photo texture inside; also a PNG picture"],
          needs: ["Nothing; runs in the browser, the photo is not uploaded"],
          status: "built",
        },
      ],
    },
  },
  tour: [
    { screen: "library", hot: 1, say: "The school's own recordings and photos are indexed on this computer." },
    { screen: "search", hot: 0, say: "A group photo: every face gets a number. Search face 2." },
    { screen: "results", hot: 0, say: "Every photo and video moment of that face, best match first." },
    { screen: "moment", hot: 0, say: "The video opens at the second she appears." },
    { screen: "results", hot: 1, say: "She asked not to be found: exclude her." },
    { screen: "exclude", hot: 0, say: "Excluded: she never appears in results again on this computer." },
  ],
};

export const m3Products: Product[] = [school, worker, search];
