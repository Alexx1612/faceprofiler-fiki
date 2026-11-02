/**
 * Milestone 2, Validation 1 (idea): customer discovery content for the /M2 page.
 * Keep claims to what the team actually did; anything still missing is marked as pending.
 */

export const m2Problem = {
  observed:
    "On our university campus we saw people walk into the student dorms carrying knives or clearly looking for a fight. Nobody stopped them: the dorm staff cannot know every resident's face, and the cameras only record.",
  question: "Is this a real, frequent problem for the people responsible for a building, or only something we happened to see?",
};

export const m2Solution = {
  idea:
    "A system that runs on the building's existing cameras, recognises the faces of the people who live or work there (from a list of residents and their profiles) and alerts staff the moment an unknown person walks in.",
  caveat: "At this stage the solution was only our assumption. We tested the problem first and kept the solution out of the first interviews.",
};

export const m2Plan = [
  { step: "1. Problem first", text: "Ask about daily routines, incidents and how they are handled today, without mentioning our product." },
  { step: "2. Start where we have access", text: "Two schools, the first one attended by one of us: buildings full of people who must be known, with day and night risks." },
  { step: "3. Two uses of the cameras", text: "Daytime (supervising children, fights) and night time (intruders after hours), each with its own questions." },
  { step: "4. Fix the questions", text: "Rewrite the first draft into open questions about real past events, then publish them as a form." },
  { step: "5. Widen the segments", text: "Repeat with dorms, elderly care homes, military and office buildings, malls and other public places." },
  { step: "6. Only then the solution", text: "Show the demo and test whether face recognition with alerts matches the problems we heard." },
];

export const m2Interviews = {
  where: "Two schools, starting with the high school Alexandru graduated from (names withheld for the interviewees' privacy).",
  who: ["Around 5 teachers across the two schools", "The deputy headmistress (directoare adjunctă)"],
  how: "Face-to-face, semi-structured interviews, one person at a time, notes taken during the conversation.",
  why: "A school is a closed building where everybody should be known, it has both daytime and night-time risks, and we could reach the decision makers directly.",
};

/** First draft (closed, yes/no, easy to answer "fine") vs improved version (open, about real past events). */
export const m2Questions: { time: "Day" | "Night"; draft: string; improved: string; isNew?: boolean }[] = [
  { time: "Day", draft: "What's a normal day like?", improved: "Can you walk me through a typical school day?" },
  { time: "Day", draft: "How do the kids act?", improved: "How do the kids behave during classes and breaks?" },
  { time: "Day", draft: "Can staff watch all the kids?", improved: "Can the teachers and the guard keep an eye on what every kid is doing?" },
  { time: "Day", draft: "Any problems with the kids?", improved: "Have there been any incidents involving the kids?" },
  { time: "Day", draft: "Any fights reported lately?", improved: "Has the staff received any reports of possible fights in the past few months?" },
  { time: "Day", draft: "How did you find out what happened?", improved: "How did you find out what actually happened, and were you able to step in in time?" },
  { time: "Night", draft: "Who watches the school at night?", improved: "Who is in charge of looking after the school at night?" },
  { time: "Night", draft: "Does the guard stick to his routine?", improved: "What is the night guard's routine, and does he always follow it?" },
  { time: "Night", draft: "Anything happen at night lately?", improved: "Have there been any incidents at night in the past six months?" },
  { time: "Night", draft: "Were they caught in time?", improved: "Were those incidents noticed in time, and how were they handled?" },
  {
    time: "Night",
    draft: "Who comes if something happens?",
    improved:
      "When something happens at night, who is alerted and who is responsible for coming to the school: the security company, the firm that installed the cameras, the police, or someone from the school?",
    isNew: true,
  },
];

export const m2Insights = [
  {
    title: "Two products, not one",
    text: "Day and night are different problems: during the day the risk is what happens between known people (fights, children leaving unnoticed); at night it is anyone entering at all. The product now has a daytime supervision mode and a night-time intruder mode.",
  },
  {
    title: "An alert must reach someone who acts",
    text: "The question about who comes at night showed that an alert is useless if it only reaches a screen. Alerts must go to whoever is responsible (guard, security company or installer), so we added routing of alerts to the responder.",
  },
  {
    title: "Better questions, better answers",
    text: "Our first draft invited short \"no, it's fine\" answers. Asking about real past events (the last six months, how they found out, whether they stepped in in time) is what we will use from now on, also in the online form below.",
  },
  {
    title: "Children's faces need extra care",
    text: "In a school, recognising students' faces raises GDPR and consent questions. We are checking which parts can run without identifying children (for example intruder and fight alerts) before offering face recognition there.",
  },
];

export const m2Ready = {
  verdict: "Not yet, but we have a start.",
  forReasons: [
    "The problem was recognised by the staff we interviewed at both schools, for both day and night.",
    "We have a working demo and a clearer, two-mode idea of the product.",
    "Our questions are now open and about real events, ready to be used at scale through the form.",
  ],
  againstReasons: [
    "Two schools are not enough to say the problem is common or urgent everywhere.",
    "We still have to interview the other segments: student dorms, elderly care homes, military buildings, office buildings, malls and other public areas.",
    "Nobody has been asked yet whether they would pay, how much, or who signs the purchase.",
  ],
  next: "Run the same interviews in at least three more segments, collect form answers, then move to Customer Validation with a paid pilot offer in the segment where the pain is strongest.",
};

export const m2Evidence = [
  { item: "Interview notes from the two schools (teachers, deputy headmistress)", status: "To be attached (scans or typed notes, names removed)" },
  { item: "First draft vs improved question list", status: "On this page" },
  { item: "Online form with the improved questions", status: "On this page" },
  { item: "Working demo used later to test the solution", status: "Home page, Proof and Technology sections" },
];
