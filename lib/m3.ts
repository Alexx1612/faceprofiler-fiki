/**
 * Milestone 3, wireframe and landing page: content for the /M3 page.
 * Each wireframe screen lists its numbered click targets ("hot" spots); the wireframe component draws
 * them in place and the annotation list under the frame reads the same entries, so both stay in sync.
 * Every hot spot also carries technical details (shown when it is hovered or focused): what it does,
 * what it needs or what is still to add, and an honest status against the apps that exist today.
 * Names in the wireframes are fictional.
 */

export type ScreenId =
  | "signin"
  | "live"
  | "alert"
  | "camera"
  | "people"
  | "addperson"
  | "profile"
  | "search"
  | "reports"
  | "settings"
  | "phone";

/** Built = works in today's apps; partial = the engine exists, the console screen does not; next = planned. */
export type Status = "built" | "partial" | "next";

export type Tech = { does: string[]; needs: string[]; status: Status };

export type Hot = { label: string; to?: ScreenId; note: string } & Tech;

export const statusText: Record<Status, string> = {
  built: "Built",
  partial: "Partly built",
  next: "Next",
};

export const m3Screens: Record<ScreenId, { title: string; device: "desktop" | "phone"; purpose: string; hot: Hot[] }> = {
  signin: {
    title: "Sign in",
    device: "desktop",
    purpose: "Staff sign in with a school account. Each school sees only its own cameras and people.",
    hot: [
      {
        label: "Sign in",
        to: "live",
        note: "Opens the Live view.",
        does: ["Checks the school account and opens that school's console", "Each school is a separate container: its own cameras, people and recordings"],
        needs: ["An account per staff member, created by us at installation", "Not in the demo apps yet: they run on one computer without a login"],
        status: "next",
      },
    ],
  },
  live: {
    title: "Live",
    device: "desktop",
    purpose: "Home screen for the guard or the secretary: every camera at once, and tonight's events on the right.",
    hot: [
      {
        label: "Camera tile",
        to: "camera",
        note: "Opens that camera full size with names over the faces.",
        does: ["Reads the existing camera's video stream (RTSP)", "Finds faces (YuNet), turns each into a 128-number fingerprint (SFace) and compares it with People", "Draws a box, a name and a match score, or Unknown_N"],
        needs: ["The camera's stream address and password", "A small PC on site (the demo runs on a laptop CPU)", "To add: several cameras at once; the demo handles one video or camera"],
        status: "partial",
      },
      {
        label: "Alert in the events list",
        to: "alert",
        note: "Opens the alert: who, where, when.",
        does: ["A face that matches nobody in People becomes Unknown_1, Unknown_2...", "The same stranger keeps one number across cameras (face clustering)", "At night every Unknown is an event in this list"],
        needs: ["School hours in Settings, so night mode knows when to start", "To add: the events list itself (the clustering already works in the demo)"],
        status: "partial",
      },
      {
        label: "Day / Night switch",
        note: "Day mode watches known people (fights, a child leaving); night mode flags anyone who enters. Follows the school hours set in Settings.",
        does: ["Night: any person on camera is an event", "Day: only rules about known people (a student leaving alone, a restricted room)"],
        needs: ["School hours and the rules for day mode, agreed with the school", "Not built yet"],
        status: "next",
      },
    ],
  },
  alert: {
    title: "Alert",
    device: "desktop",
    purpose: "One unknown person: the snapshot, the cameras that saw them, and what staff can do next.",
    hot: [
      {
        label: "Send guard",
        to: "phone",
        note: "Pushes the alert to the guard's phone.",
        does: ["Sends the snapshot, the place and the time to the guard's phone", "The guard can confirm or close it from the phone"],
        needs: ["The guard's phone with the Nau-ino app (an Android test build exists)", "To add: push notifications"],
        status: "next",
      },
      {
        label: "It's someone we know",
        to: "addperson",
        note: "Adds the face to People, so it is named next time.",
        does: ["Saves the face crop under the right name", "Next time the vote names them instead of Unknown"],
        needs: ["Consent recorded for that person", "Built in the demo: enrolment and vote-gated learning"],
        status: "built",
      },
      {
        label: "Find in recordings",
        to: "search",
        note: "Every moment this face appears, on all cameras.",
        does: ["Compares this face with every face already found in the recordings", "Lists each file and every time in a video where it appears, best match first"],
        needs: ["Recordings kept on the school's own computer", "Built as Local Face Search (see its tab); never searches the internet"],
        status: "built",
      },
      {
        label: "Dismiss",
        to: "live",
        note: "Closes the alert with a note and returns to Live.",
        does: ["Closes the event and keeps a short note for the morning report"],
        needs: ["To add: the event log"],
        status: "next",
      },
    ],
  },
  camera: {
    title: "Camera view",
    device: "desktop",
    purpose: "One camera full size. Every face gets a name and a match score, or Unknown_N.",
    hot: [
      {
        label: "A face box",
        to: "profile",
        note: "Opens that person's profile.",
        does: ["Each face is tracked from frame to frame (track ID)", "Name and score come from a vote of the 10 closest stored faces"],
        needs: ["Faces at least about 60 px wide for a reliable match", "Built in the demo's Video page"],
        status: "built",
      },
      {
        label: "Back to Live",
        to: "live",
        note: "Returns to all cameras.",
        does: ["Returns to the camera grid"],
        needs: ["Nothing"],
        status: "next",
      },
    ],
  },
  people: {
    title: "People",
    device: "desktop",
    purpose: "Everyone the school enrolled, in groups. Only these people are ever named.",
    hot: [
      {
        label: "Add person",
        to: "addperson",
        note: "Enrol someone with one or two photos.",
        does: ["Opens the enrolment form"],
        needs: ["A clear front photo per person"],
        status: "built",
      },
      {
        label: "Person card",
        to: "profile",
        note: "Opens the profile.",
        does: ["Shows the reference photos and today's sightings"],
        needs: ["To add: groups (staff, students, visitors)"],
        status: "partial",
      },
    ],
  },
  addperson: {
    title: "Add person",
    device: "desktop",
    purpose: "Enrol a staff member or student: one or two photos, a group, and recorded consent.",
    hot: [
      {
        label: "Save",
        to: "profile",
        note: "Builds the face vectors and opens the new profile.",
        does: ["Finds the face in each photo and stores its fingerprint", "Adds a mirrored and a darker copy, so one photo covers more lighting"],
        needs: ["Recorded consent: the person, or a parent for students (GDPR, special-category data)", "Built in the demo's People page"],
        status: "built",
      },
      {
        label: "Cancel",
        to: "people",
        note: "Back to People, nothing saved.",
        does: ["Leaves without storing anything"],
        needs: ["Nothing"],
        status: "built",
      },
    ],
  },
  profile: {
    title: "Person profile",
    device: "desktop",
    purpose: "Reference photos and where the person was seen today.",
    hot: [
      {
        label: "A sighting",
        to: "camera",
        note: "Opens the camera at that moment.",
        does: ["Jumps to the recording at that time"],
        needs: ["Recordings kept on site", "To add: the sightings list"],
        status: "next",
      },
      {
        label: "Find all appearances",
        to: "search",
        note: "Search every recording for this person.",
        does: ["Runs Local Face Search with this person's photos (up to 3, checked to be the same person)"],
        needs: ["Built as a demo page; to add: inside the console"],
        status: "partial",
      },
      {
        label: "Edit photos",
        to: "addperson",
        note: "Replace or add reference photos.",
        does: ["Replaces the stored fingerprints with new ones"],
        needs: ["Consent stays on record"],
        status: "built",
      },
    ],
  },
  search: {
    title: "Search",
    device: "desktop",
    purpose: "Find a person by name or by a photo, in a time range, across every camera.",
    hot: [
      {
        label: "A result",
        to: "camera",
        note: "Opens the camera at that moment.",
        does: ["Score bands: Strong 0.55, Likely 0.45, Possible 0.36 (measured: 0 false matches above 0.45 on 73,433 pairs of different people)", "Identical copies are folded into one result"],
        needs: ["A result is a lead, not proof: staff confirm by eye", "Built in the Face Search demo"],
        status: "built",
      },
    ],
  },
  reports: {
    title: "Night report",
    device: "desktop",
    purpose: "A short written summary of the night (local LLM), and the events behind it.",
    hot: [
      {
        label: "An event",
        to: "alert",
        note: "Opens the alert it refers to.",
        does: ["Links each sentence of the summary to the event behind it"],
        needs: ["To add: the report screen"],
        status: "next",
      },
      {
        label: "Export PDF",
        note: "Downloads the report for the director.",
        does: ["A language model running on the school's computer writes the summary; nothing leaves the building"],
        needs: ["A PC strong enough for a small local model", "Not built yet"],
        status: "next",
      },
    ],
  },
  settings: {
    title: "Settings",
    device: "desktop",
    purpose: "Cameras, school hours (when night mode starts) and whose phones get alerts.",
    hot: [
      {
        label: "Add camera",
        note: "Connects another existing camera by its stream address.",
        does: ["Tests the stream, then adds it to Live"],
        needs: ["Stream address and password from the school's camera system", "Not built yet"],
        status: "next",
      },
    ],
  },
  phone: {
    title: "Guard's phone",
    device: "phone",
    purpose: "The night guard is on a round, not at the screen. The alert reaches them here.",
    hot: [
      {
        label: "Notification",
        to: "alert",
        note: "Opens the same alert, sized for the phone.",
        does: ["Shows the snapshot and two buttons: on my way, false alarm"],
        needs: ["The Android app (a debug build exists; recognition already runs on the phone)", "To add: push alerts"],
        status: "partial",
      },
    ],
  },
};

/** Order of the screen list beside the frame. */
export const m3Order: ScreenId[] = ["signin", "live", "alert", "camera", "people", "addperson", "profile", "search", "reports", "settings", "phone"];

/** Sidebar on every desktop screen after sign-in: these are reachable from anywhere. */
export const m3Sidebar: { label: string; to: ScreenId }[] = [
  { label: "Live", to: "live" },
  { label: "People", to: "people" },
  { label: "Search", to: "search" },
  { label: "Reports", to: "reports" },
  { label: "Settings", to: "settings" },
];

/** The scripted walk-through the "Play the night scenario" button performs. */
export const m3Tour: { screen: ScreenId; hot: number; say: string }[] = [
  { screen: "live", hot: 1, say: "02:17: a face nobody enrolled appears at the side gate." },
  { screen: "alert", hot: 0, say: "The guard is on a round, so the alert goes to their phone." },
  { screen: "phone", hot: 0, say: "The guard opens it on the phone." },
  { screen: "alert", hot: 2, say: "Back at the desk: where else was this person tonight?" },
  { screen: "search", hot: 0, say: "Every moment the face appears, best match first." },
  { screen: "camera", hot: 0, say: "Open the camera at that moment." },
];

export const m3Landing = {
  path: "/landing/",
  url: "https://alexx1612.github.io/faceprofiler-fiki/landing/",
  summary:
    "A one-page site for school directors and administrators: what Nau-ino does at night and during the day, how faces are kept, and one action, booking a free 30-day pilot on the school's own cameras.",
  sections: ["Hero: the night, in the product's own words", "How it works: enrol, watch, flag, report", "Day and night: the two problems we heard in M2", "Privacy: faces stay in the building", "Book a pilot: a form that opens an e-mail"],
};

export const m3Method = [
  { title: "Product, not the demo", text: "The wireframe shows the school console we are building towards, not the current demo app. Screens marked in the pitch as \"Next\" (phone alerts, schedules) are included because the M2 interviews asked for them." },
  { title: "Grey boxes on purpose", text: "Wireframes, not mockups: layout and links only. Every numbered box is clickable and opens the screen it leads to; hover one for the technical details." },
  { title: "Built in code", text: "Drawn as HTML on this page instead of Balsamiq, so it is clickable and stays next to the milestone." },
];

/* ---------- the three working apps, shown as small interactive demos ---------- */

export type AppSpot = { id: string; label: string } & Tech;

export type AppDemo = {
  id: "camera" | "worker" | "search";
  name: string;
  version: string;
  runs: string;
  oneLine: string;
  spots: AppSpot[];
};

export const m3Apps: AppDemo[] = [
  {
    id: "camera",
    name: "Nau-ino camera app",
    version: "0.3.0",
    runs: "Windows (one folder, no install) and an Android test build",
    oneLine: "The recognition engine on its own: enrol people from photos, then name them in photos, video or a live camera. Strangers get a stable Unknown_N.",
    spots: [
      {
        id: "people",
        label: "People",
        does: ["Enrol a person from one or more photos", "Each face becomes 128 numbers (SFace); a mirrored and a darker copy are added"],
        needs: ["Clear front photos", "Demo set: 17 fictional people"],
        status: "built",
      },
      {
        id: "photos",
        label: "Photos test",
        does: ["Checks 405 test photos against the enrolled people", "Result on 2026-11-16: 358 correct, 0 wrong, 1 missed, 42 strangers rejected, 1 stranger accepted"],
        needs: ["Nothing: the photos are bundled"],
        status: "built",
      },
      {
        id: "video",
        label: "Video",
        does: ["Boxes, names, scores and track IDs on every face", "Optional: landmarks, head direction, expression, motion trail; saves each person's first face"],
        needs: ["A video file or a camera", "To add: several cameras at once"],
        status: "built",
      },
      {
        id: "phone",
        label: "Android",
        does: ["The same pipeline runs in the phone (ONNX Runtime in the app)", "Takes photos with the phone camera"],
        needs: ["To add: continuous live recognition from the phone camera", "Not yet tested on a physical phone"],
        status: "partial",
      },
    ],
  },
  {
    id: "worker",
    name: "Worker Analytics",
    version: "0.1.0",
    runs: "Windows (one folder, no install)",
    oneLine: "Per-shift statistics for a work floor: time in the own zone, exits, idle time, helmet and vest use, entries into restricted zones.",
    spots: [
      {
        id: "zones",
        label: "Floor zones",
        does: ["Work, break, exit and restricted zones drawn on the camera picture", "Suggests work areas from where people stood still"],
        needs: ["One camera that sees the floor", "Optional: floor calibration in metres for distances"],
        status: "built",
      },
      {
        id: "tracking",
        label: "People on the floor",
        does: ["Finds people (YOLOX) and follows them (box overlap + clothing colour)", "Names them by face or by badge colour, by majority vote over a few seconds"],
        needs: ["Workers' consent and a clear notice on site"],
        status: "built",
      },
      {
        id: "gear",
        label: "Helmet and vest",
        does: ["A colour rule plus a small trained classifier (SVM) per person box", "Held-out stock clips: helmet wrongly seen 3.9% of the time, but only 48% of real helmets found"],
        needs: ["To add: training on footage from the real site, which would raise the 48%"],
        status: "partial",
      },
      {
        id: "report",
        label: "Shift report",
        does: ["JSON, CSV and HTML reports per worker, with a heatmap of where they were"],
        needs: ["Nothing"],
        status: "built",
      },
    ],
  },
  {
    id: "search",
    name: "Face Search",
    version: "demo",
    runs: "Local web page on the school's own computer",
    oneLine: "Find every photo and video moment of one face in your own folders. Like the face search engines, but it never touches the internet.",
    spots: [
      {
        id: "pick",
        label: "Pick a face",
        does: ["Every face in a dropped photo gets a numbered box", "Each face shows its best match before you choose"],
        needs: ["A photo with the person's face at least about 60 px wide"],
        status: "built",
      },
      {
        id: "results",
        label: "Matches",
        does: ["Bands measured on 402 test photos: Strong 0.55 finds 95.9% of same-person pairs with 0 false matches", "Videos list every second the person appears; identical copies are folded together"],
        needs: ["Folders the school has the right to process", "Never crawls the web: the EU AI Act bans scraped face databases"],
        status: "built",
      },
      {
        id: "mesh",
        label: "3D face mesh",
        does: ["478 face points (MediaPipe) turned into a rotatable ASCII head, in photo colours", "Runs in the browser; the photo is not uploaded"],
        needs: ["Internet once, to download the face model"],
        status: "built",
      },
      {
        id: "privacy",
        label: "Opt-out and alerts",
        does: ["Exclude a person: they never appear in results again", "Watches report only new matches after re-indexing"],
        needs: ["To add: inside the console, with a log of who searched for whom"],
        status: "partial",
      },
    ],
  },
];
