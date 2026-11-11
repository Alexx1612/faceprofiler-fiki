/**
 * Milestone 3, wireframe and landing page: content for the /M3 page.
 * Each wireframe screen lists its numbered click targets ("hot" spots); the wireframe component draws
 * them in place and the annotation list under the frame reads the same entries, so both stay in sync.
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

export type Hot = { label: string; to?: ScreenId; note: string };

export const m3Screens: Record<ScreenId, { title: string; device: "desktop" | "phone"; purpose: string; hot: Hot[] }> = {
  signin: {
    title: "Sign in",
    device: "desktop",
    purpose: "Staff sign in with a school account. Each school sees only its own cameras and people.",
    hot: [{ label: "Sign in", to: "live", note: "Opens the Live view." }],
  },
  live: {
    title: "Live",
    device: "desktop",
    purpose: "Home screen for the guard or the secretary: every camera at once, and tonight's events on the right.",
    hot: [
      { label: "Camera tile", to: "camera", note: "Opens that camera full size with names over the faces." },
      { label: "Alert in the events list", to: "alert", note: "Opens the alert: who, where, when." },
      { label: "Day / Night switch", note: "Day mode watches known people (fights, a child leaving); night mode flags anyone who enters. Follows the school hours set in Settings." },
    ],
  },
  alert: {
    title: "Alert",
    device: "desktop",
    purpose: "One unknown person: the snapshot, the cameras that saw them, and what staff can do next.",
    hot: [
      { label: "Send guard", to: "phone", note: "Pushes the alert to the guard's phone." },
      { label: "It's someone we know", to: "addperson", note: "Adds the face to People, so it is named next time." },
      { label: "Find in recordings", to: "search", note: "Every moment this face appears, on all cameras." },
      { label: "Dismiss", to: "live", note: "Closes the alert with a note and returns to Live." },
    ],
  },
  camera: {
    title: "Camera view",
    device: "desktop",
    purpose: "One camera full size. Every face gets a name and a match score, or Unknown_N.",
    hot: [
      { label: "A face box", to: "profile", note: "Opens that person's profile." },
      { label: "Back to Live", to: "live", note: "Returns to all cameras." },
    ],
  },
  people: {
    title: "People",
    device: "desktop",
    purpose: "Everyone the school enrolled, in groups. Only these people are ever named.",
    hot: [
      { label: "Add person", to: "addperson", note: "Enrol someone with one or two photos." },
      { label: "Person card", to: "profile", note: "Opens the profile." },
    ],
  },
  addperson: {
    title: "Add person",
    device: "desktop",
    purpose: "Enrol a staff member or student: one or two photos, a group, and recorded consent.",
    hot: [
      { label: "Save", to: "profile", note: "Builds the face vectors and opens the new profile." },
      { label: "Cancel", to: "people", note: "Back to People, nothing saved." },
    ],
  },
  profile: {
    title: "Person profile",
    device: "desktop",
    purpose: "Reference photos and where the person was seen today.",
    hot: [
      { label: "A sighting", to: "camera", note: "Opens the camera at that moment." },
      { label: "Find all appearances", to: "search", note: "Search every recording for this person." },
      { label: "Edit photos", to: "addperson", note: "Replace or add reference photos." },
    ],
  },
  search: {
    title: "Search",
    device: "desktop",
    purpose: "Find a person by name or by a photo, in a time range, across every camera.",
    hot: [{ label: "A result", to: "camera", note: "Opens the camera at that moment." }],
  },
  reports: {
    title: "Night report",
    device: "desktop",
    purpose: "A short written summary of the night (local LLM), and the events behind it.",
    hot: [
      { label: "An event", to: "alert", note: "Opens the alert it refers to." },
      { label: "Export PDF", note: "Downloads the report for the director." },
    ],
  },
  settings: {
    title: "Settings",
    device: "desktop",
    purpose: "Cameras, school hours (when night mode starts) and whose phones get alerts.",
    hot: [{ label: "Add camera", note: "Connects another existing camera by its stream address." }],
  },
  phone: {
    title: "Guard's phone",
    device: "phone",
    purpose: "The night guard is on a round, not at the screen. The alert reaches them here.",
    hot: [{ label: "Notification", to: "alert", note: "Opens the same alert, sized for the phone." }],
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

export const m3Landing = {
  path: "/landing/",
  url: "https://alexx1612.github.io/faceprofiler-fiki/landing/",
  summary:
    "A one-page site for school directors and administrators: what Nau-ino does at night and during the day, how faces are kept, and one action, booking a free 30-day pilot on the school's own cameras.",
  sections: ["Hero: the night, in the product's own words", "How it works: enrol, watch, flag, report", "Day and night: the two problems we heard in M2", "Privacy: faces stay in the building", "Book a pilot: a form that opens an e-mail"],
};

export const m3Method = [
  { title: "Product, not the demo", text: "The wireframe shows the school console we are building towards, not the current demo app. Screens marked in the pitch as \"Next\" (phone alerts, schedules) are included because the M2 interviews asked for them." },
  { title: "Grey boxes on purpose", text: "Wireframes, not mockups: layout and links only. Every numbered box is clickable and opens the screen it leads to." },
  { title: "Built in code", text: "Drawn as HTML on this page instead of Balsamiq, so it is clickable and stays next to the milestone." },
];
