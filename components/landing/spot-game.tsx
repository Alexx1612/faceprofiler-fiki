"use client";

import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { saveGameResult } from "@/lib/game-result";

import "@/app/landing/spot-game.css";

/**
 * "Spot the stranger": the visitor races a simple matcher at finding the one new person in a crowd.
 *
 * Methodology: each person is drawn from five attributes (skin, hair colour, hair style, shirt colour,
 * accessory); every pair in a round differs in at least two of them, so a careful human can always tell
 * them apart. The "machine" turns each drawn figure into a feature vector (RGB of the colours plus one-hot
 * style and accessory), finds each figure's nearest remembered person and calls the figure with the
 * largest nearest distance Unknown_1. Its time is measured with performance.now() over the whole crowd.
 * The human time runs from the moment the crowd is shown to the click. This is a colour matcher, not the
 * real face engine; the page says so and gives the engine's measured time per photo.
 */

const SKIN = ["#f2d3b3", "#e0b48c", "#b9875e", "#7d5236"];
const HAIR = ["#1f1a17", "#5b3a21", "#a8672e", "#d9b26a", "#8a8f99", "#b2442f"];
const SHIRT = ["#e25c4b", "#f0a33a", "#e6d34a", "#4cae6a", "#3a9bd9", "#5d5fd6", "#b05ad1", "#e86fa6", "#3fbfb0", "#f4f4f4"];
const STYLE = ["short", "long", "bun"] as const;
const ACC = ["none", "glasses", "cap"] as const;
const NAMES = [
  "Ana", "Mihai", "Ioana", "Radu", "Elena", "Vlad", "Maria", "Andrei", "Sofia", "Tudor", "Irina",
  "Dan", "Clara", "Paul", "Bianca", "Matei", "Diana", "Victor", "Alina", "Luca", "Oana", "Sorin",
];
const ROUNDS = [5, 20];
// Real engine time in the note: 0.3.2 self-check, 17.4 s for 405 photos on a laptop CPU = ≈43 ms per photo.

type Lang = "en" | "ro";
const T = {
  round: ["Round", "Runda"],
  known: ["known + 1 new", "cunoscuți + 1 nou"],
  find: ["Find the new person", "Găsește persoana nouă"],
  intro: ["Remember the people. Then tap the one you have not seen. The machine does the same.", "Memorează oamenii. Apoi apasă pe cel pe care nu l-ai văzut. Mașina face la fel."],
  play: ["Play round", "Joacă runda"],
  watch: ["Watch the machine", "Vezi mașina"],
  remember: ["Remember these people:", "Memorează acești oameni:"],
  ready: ["Ready: show the crowd", "Gata: arată mulțimea"],
  crowd: ["Crowd", "Mulțime"],
  person: ["Person", "Persoana"],
  machine: ["Machine", "Mașina"],
  you: ["You", "Tu"],
  forPeople: ["for", "pentru"],
  people: ["people", "persoane"],
  yourTurn: ["Your turn", "Rândul tău"],
  correct: ["Correct.", "Corect."],
  wrong: ["Wrong: that was", "Greșit: aceea era"],
  redBox: ["The new person is boxed in red.", "Persoana nouă e încadrată cu roșu."],
  faster: ["faster", "mai rapid"],
  retry: ["Retry", "Din nou"],
  round2: ["Round 2: 20 people", "Runda 2: 20 de persoane"],
  again: ["Play again", "Joacă din nou"],
  survey: ["Answer the 1-min survey", "Răspunde la chestionar (1 min)"],
  note: [
    "Demo matcher: colour features, nearest neighbour. Real engine (face vectors): ≈43 ms per photo on a laptop CPU.",
    "Potrivire demo: culori, cel mai apropiat vecin. Motorul real (vectori de față): ≈43 ms pe poză, pe procesorul unui laptop.",
  ],
} satisfies Record<string, [string, string]>;
const LANG_KEY = "nauino:lang";

/** Page language shared with other landing widgets: localStorage + a `nauino:lang` window event. */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "ro" || saved === "en") setLang(saved);
      else if (navigator.language?.toLowerCase().startsWith("ro")) setLang("ro");
    } catch {
      /* storage blocked: stay in English */
    }
    const on = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_KEY, on);
    return () => window.removeEventListener(LANG_KEY, on);
  }, []);
  const change = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent<Lang>(LANG_KEY, { detail: l }));
  };
  return [lang, change];
}

type Person = { id: number; skin: number; hair: number; style: number; shirt: number; acc: number; name: string };
type Placed = Person & { dx: number; dy: number; tilt: number };
type Phase = "intro" | "demo" | "remember" | "crowd" | "result";

const attrs = (p: Person) => [p.skin, p.hair, p.style, p.shirt, p.acc];
const differs = (a: Person, b: Person) => attrs(a).filter((v, i) => v !== attrs(b)[i]).length;
const pick = (n: number) => Math.floor(Math.random() * n);

function makePeople(count: number): Person[] {
  const out: Person[] = [];
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  while (out.length < count) {
    const p: Person = {
      id: out.length,
      skin: pick(SKIN.length),
      hair: pick(HAIR.length),
      style: pick(STYLE.length),
      shirt: pick(SHIRT.length),
      acc: pick(ACC.length),
      name: names[out.length] ?? `P${out.length + 1}`,
    };
    if (out.every((q) => differs(p, q) >= 2)) out.push(p);
  }
  return out;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Feature vector of a drawn figure: colours as RGB, style and accessory one-hot. */
function features(p: Person): number[] {
  const oneHot = (i: number, n: number) => Array.from({ length: n }, (_, k) => (k === i ? 1 : 0));
  return [...rgb(SKIN[p.skin]), ...rgb(HAIR[p.hair]), ...rgb(SHIRT[p.shirt]), ...oneHot(p.style, 3), ...oneHot(p.acc, 3)];
}

/**
 * Nearest remembered person for every figure; the farthest one is the stranger. Browsers round
 * performance.now() to about 0.1 ms, so the time is the average of RUNS full passes.
 */
const RUNS = 200;
function machineMatch(crowd: Person[], known: Person[]) {
  const t0 = performance.now();
  for (let r = 1; r < RUNS; r++) matchOnce(crowd, known);
  const out = matchOnce(crowd, known);
  return { ...out, ms: (performance.now() - t0) / RUNS };
}

function matchOnce(crowd: Person[], known: Person[]) {
  const kv = known.map(features);
  const labels = crowd.map((p) => {
    const f = features(p);
    let best = Infinity;
    let who = -1;
    kv.forEach((k, i) => {
      const d = Math.hypot(...k.map((v, j) => v - f[j]));
      if (d < best) [best, who] = [d, i];
    });
    return { dist: best, name: known[who].name };
  });
  const stranger = labels.reduce((m, l, i) => (l.dist > labels[m].dist ? i : m), 0);
  return { stranger, labels };
}

function Figure({ p }: { p: Person }) {
  const hair = HAIR[p.hair];
  const style = STYLE[p.style];
  return (
    <svg viewBox="0 0 60 80" aria-hidden className="sg__fig">
      <path d="M8 80 C8 58 18 50 30 50 C42 50 52 58 52 80 Z" fill={SHIRT[p.shirt]} />
      <rect x="25" y="40" width="10" height="12" rx="3" fill={SKIN[p.skin]} />
      {style === "long" && <path d="M14 28 C14 12 46 12 46 28 L48 52 L40 50 L40 30 L20 30 L20 50 L12 52 Z" fill={hair} />}
      <circle cx="30" cy="28" r="14" fill={SKIN[p.skin]} />
      {style === "bun" && <circle cx="30" cy="11" r="6" fill={hair} />}
      <path d="M16 27 C16 12 44 12 44 27 C40 20 22 20 16 27 Z" fill={hair} />
      <circle cx="25" cy="29" r="1.6" fill="#1b1b1b" />
      <circle cx="35" cy="29" r="1.6" fill="#1b1b1b" />
      <path d="M26 35 Q30 38 34 35" stroke="#1b1b1b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {ACC[p.acc] === "glasses" && (
        <g stroke="#111" strokeWidth="1.6" fill="none">
          <circle cx="25" cy="29" r="4.2" />
          <circle cx="35" cy="29" r="4.2" />
          <path d="M29.2 29 H30.8" />
        </g>
      )}
      {ACC[p.acc] === "cap" && (
        <g fill="#24324a">
          <path d="M15 22 C15 10 45 10 45 22 Z" />
          <rect x="28" y="19" width="22" height="4" rx="2" />
        </g>
      )}
    </svg>
  );
}

export function SpotGame() {
  const [lang, setLang] = useLang();
  const t = (k: keyof typeof T) => T[k][lang === "ro" ? 1 : 0];
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [known, setKnown] = useState<Person[]>([]);
  const [crowd, setCrowd] = useState<Placed[]>([]);
  const [machine, setMachine] = useState<ReturnType<typeof machineMatch> | null>(null);
  const [scanned, setScanned] = useState(0);
  const [clicked, setClicked] = useState<number | null>(null);
  const [humanMs, setHumanMs] = useState(0);
  const shownAt = useRef(0);

  const setup = (r: number) => {
    const people = makePeople(ROUNDS[r] + 1);
    const remembered = people.slice(0, ROUNDS[r]);
    const placed = [...people]
      .sort(() => Math.random() - 0.5)
      .map((p) => ({ ...p, dx: pick(9) - 4, dy: pick(9) - 4, tilt: pick(7) - 3 }));
    setRound(r);
    setKnown(remembered);
    setCrowd(placed);
    setMachine(machineMatch(placed, remembered));
    setClicked(null);
    setScanned(0);
  };

  const start = (r: number, demo = false) => {
    setup(r);
    setPhase(demo ? "demo" : "remember");
  };

  // Machine "scan" animation for the pre-demo and the result: boxes appear one by one.
  useEffect(() => {
    if (phase !== "demo" && phase !== "result") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setScanned(crowd.length);
      return;
    }
    setScanned(0);
    const step = Math.max(25, Math.round(600 / crowd.length));
    const id = window.setInterval(() => setScanned((s) => (s >= crowd.length ? s : s + 1)), step);
    return () => window.clearInterval(id);
  }, [phase, crowd.length]);

  const showCrowd = () => {
    setPhase("crowd");
    shownAt.current = performance.now();
  };

  const choose = (i: number) => {
    if (phase !== "crowd" || !machine) return;
    const ms = performance.now() - shownAt.current;
    const correct = i === machine.stranger;
    setHumanMs(ms);
    setClicked(i);
    setPhase("result");
    const result = {
      round: (round + 1) as 1 | 2,
      people: ROUNDS[round],
      human_ms: Math.round(ms),
      machine_ms: +machine.ms.toFixed(4),
      correct,
    };
    saveGameResult(result);
    track("game_round_finished", result);
  };

  const strangerIdx = machine?.stranger ?? -1;
  const showBoxes = phase === "demo" || phase === "result";
  const correct = clicked !== null && clicked === strangerIdx;
  const fmtMs = (ms: number) => (ms < 0.01 ? "<0.01 ms" : ms < 1 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`);

  return (
    <div className="lp-glass sg">
      <div className="sg__bar">
        <span className="sg__round">
          {t("round")} {round + 1}/2 · {ROUNDS[round]} {t("known")}
        </span>
        <div className="sg__lang" role="group" aria-label="Language / Limba">
          {(["en", "ro"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {phase === "intro" && (
        <div className="sg__intro">
          <p>{t("intro")}</p>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => start(round)}>
              {t("play")} {round + 1}
            </button>
            <button type="button" className="lp-btn lp-btn--ghost" onClick={() => start(round, true)}>
              {t("watch")}
            </button>
          </div>
        </div>
      )}

      {phase === "remember" && (
        <>
          <p className="sg__hint">{t("remember")}</p>
          <ul className={`sg__grid sg__grid--${known.length > 6 ? "big" : "small"}`}>
            {known.map((p) => (
              <li key={p.id} className="sg__cell sg__cell--static">
                <Figure p={p} />
                <span className="sg__name">{p.name}</span>
              </li>
            ))}
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={showCrowd}>
              {t("ready")}
            </button>
          </div>
        </>
      )}

      {(phase === "crowd" || phase === "demo" || phase === "result") && machine && (
        <>
          <ul className={`sg__grid sg__grid--${crowd.length > 7 ? "big" : "small"}`} aria-label={t("crowd")}>
            {crowd.map((p, i) => {
              const isStranger = i === strangerIdx;
              const boxed = showBoxes && i < scanned;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`sg__cell${clicked === i ? (correct ? " is-right" : " is-wrong") : ""}`}
                    style={{ transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.tilt}deg)` }}
                    disabled={phase !== "crowd"}
                    aria-label={`${t("person")} ${i + 1}`}
                    onClick={() => choose(i)}
                  >
                    <Figure p={p} />
                    {boxed && (
                      <span className={`sg__box${isStranger ? " sg__box--unknown" : ""}`}>
                        <span className="sg__tag">{isStranger ? "Unknown_1" : machine.labels[i].name}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {phase === "demo" && (
            <div className="sg__result" role="status">
              <p>
                {t("machine")}: <b>{fmtMs(machine.ms)}</b> {t("forPeople")} {crowd.length} {t("people")}.
              </p>
              <div className="sg__actions">
                <button type="button" className="lp-btn" onClick={() => start(round)}>
                  {t("yourTurn")}
                </button>
              </div>
            </div>
          )}

          {phase === "result" && (
            <div className="sg__result" role="status">
              <p className={correct ? "sg__ok" : "sg__bad"}>
                {correct ? t("correct") : `${t("wrong")} ${machine.labels[clicked ?? 0].name}. ${t("redBox")}`}
              </p>
              <p className="sg__times">
                {t("you")}: <b>{(humanMs / 1000).toFixed(1)} s</b> · {t("machine")}: <b>{fmtMs(machine.ms)}</b>
                {correct && <> · ≈{Math.round(humanMs / Math.max(machine.ms, 0.01)).toLocaleString(lang === "ro" ? "ro" : "en")}× {t("faster")}</>}
              </p>
              <div className="sg__actions">
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => start(round)}>
                  {t("retry")}
                </button>
                {round === 0 ? (
                  <button type="button" className="lp-btn" onClick={() => start(1)}>
                    {t("round2")}
                  </button>
                ) : (
                  <button type="button" className="lp-btn" onClick={() => start(0)}>
                    {t("again")}
                  </button>
                )}
              </div>
              <a className="sg__survey" href="#survey">
                {t("survey")} →
              </a>
            </div>
          )}
        </>
      )}

      {phase === "crowd" && <p className="sg__live">{t("find")}</p>}
      <p className="sg__note">{t("note")}</p>
    </div>
  );
}
