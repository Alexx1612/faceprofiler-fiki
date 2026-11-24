"use client";

import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { saveGameResult } from "@/lib/game-result";
import { drawPerson, makePeople, SpotScene, type Person, type SceneResult } from "@/components/landing/spot-scene";

import "@/app/landing/spot-game.css";

/**
 * "Spot the stranger": remember 2, then 5, then 20 people, then find the one new person walking in a
 * CCTV view of a school yard, against a simple matcher.
 *
 * Methodology: this component holds the round flow (intro, line-up, scene, result) and the texts;
 * the moving scene, the matcher and its timing live in spot-scene.ts. The human time runs from "GO"
 * to the tap and only while the scene is on screen. Results go to sessionStorage for the quick survey
 * (lib/game-result.ts) and to PostHog as `game_round_finished`. This is a colour matcher, not the face
 * engine; the page says so and gives the engine's measured time per photo.
 */

const ROUNDS = [2, 5, 20];
// Real engine time in the note: 0.3.2 self-check, 17.4 s for 405 photos on a laptop CPU = ≈43 ms per photo.

type Lang = "en" | "ro";
const T = {
  round: ["Round", "Runda"],
  known: ["known + 1 new", "cunoscuți + 1 nou"],
  intro: ["Remember the people. Then tap the one new person in the camera feed.", "Memorează oamenii. Apoi apasă pe persoana nouă din camera de supraveghere."],
  play: ["Play", "Joacă"],
  watch: ["Watch the machine", "Vezi mașina"],
  remember: ["Remember them", "Memorează-i"],
  ready: ["Ready", "Gata"],
  find: ["Tap the new person", "Apasă pe persoana nouă"],
  keys: ["Keyboard: arrows to select, Enter to pick.", "Tastatură: săgeți pentru selecție, Enter pentru alegere."],
  person: ["Person", "Persoana"],
  of: ["of", "din"],
  cam: ["Camera view", "Imagine cameră"],
  people: ["people", "persoane"],
  machine: ["Machine", "Mașina"],
  perFrame: ["per frame", "pe cadru"],
  you: ["You", "Tu"],
  correct: ["Correct.", "Corect."],
  wrong: ["Wrong: that was", "Greșit: aceea era"],
  redBox: ["The new person is in red.", "Persoana nouă e în roșu."],
  faster: ["faster", "mai rapid"],
  retry: ["Retry", "Din nou"],
  next: ["Next round", "Runda următoare"],
  again: ["Play again", "Joacă din nou"],
  yourTurn: ["Your turn", "Rândul tău"],
  survey: ["Answer the 1-min survey", "Răspunde la chestionar (1 min)"],
  note: [
    "Demo matcher: colour features, nearest neighbour, every frame. Real engine (face vectors): ≈43 ms per photo on a laptop CPU.",
    "Potrivire demo: culori, cel mai apropiat vecin, la fiecare cadru. Motorul real (vectori de față): ≈43 ms pe poză, pe procesorul unui laptop.",
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

/** One person in the line-up: drawn once on a small canvas, standing. */
function Mug({ p, i }: { p: Person; i: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    drawPerson(g, p, w / 2, h - 6, h * 0.86);
  }, [p]);
  return (
    <li className="sg__mug" style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}>
      <canvas ref={ref} aria-hidden />
      <span>{p.name}</span>
    </li>
  );
}

type Phase = "intro" | "remember" | "scene";

export function SpotGame() {
  const [lang, setLang] = useLang();
  const t = (k: keyof typeof T) => T[k][lang === "ro" ? 1 : 0];
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [demo, setDemo] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<SceneResult | null>(null);
  const [machineMs, setMachineMs] = useState(0);
  const [sel, setSel] = useState("");
  const [seed, setSeed] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SpotScene | null>(null);
  const roundRef = useRef(round);

  const known = people.slice(0, -1);
  const stranger = people[people.length - 1];

  const start = (r: number, asDemo = false) => {
    roundRef.current = r;
    setRound(r);
    setPeople(makePeople(ROUNDS[r] + 1));
    setResult(null);
    setLive(false);
    setSel("");
    setDemo(asDemo);
    setPhase(asDemo ? "scene" : "remember");
    setSeed((s) => s + 1);
  };

  // The scene lives while the phase is "scene"; a new seed rebuilds it.
  useEffect(() => {
    if (phase !== "scene" || !canvas.current || !stranger) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = new SpotScene(canvas.current, {
      known,
      stranger,
      demo,
      reduce,
      onLive: () => {
        setLive(true);
        canvas.current?.focus({ preventScroll: true });
      },
      onSelect: (i, n) => setSel(`${i}/${n}`),
      onMachine: setMachineMs,
      onResult: (r) => {
        setLive(false);
        setResult(r);
        const out = {
          round: (roundRef.current + 1) as 1 | 2 | 3,
          people: ROUNDS[roundRef.current],
          human_ms: Math.round(r.human_ms),
          machine_ms: +r.machine_ms.toFixed(4),
          correct: r.correct,
        };
        saveGameResult(out);
        track("game_round_finished", out);
      },
    });
    scene.current = s;
    if (navigator.webdriver && new URLSearchParams(location.search).has("sgtest")) (window as unknown as { __spotGame: SpotScene }).__spotGame = s;
    return () => {
      s.destroy();
      scene.current = null;
    };
    // rebuilt only for a new round (seed) or a phase change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, seed]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    scene.current?.tap(e.clientX - r.left, e.clientY - r.top, e.pointerType === "touch");
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!live) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") scene.current?.cycle(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") scene.current?.cycle(-1);
    else if (e.key === "Enter" || e.key === " ") scene.current?.pickSelected();
    else return;
    e.preventDefault();
  };

  const fmtMs = (ms: number) => (ms < 0.01 ? "<0.01 ms" : ms < 1 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`);
  const last = round === ROUNDS.length - 1;

  return (
    <div className="lp-glass sg">
      <div className="sg__bar">
        <span className="sg__round">
          {t("round")} {round + 1}/{ROUNDS.length} · {ROUNDS[round]} {t("known")}
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
          <div className="sg__teaser" aria-hidden>
            <span className="sg__rec">● REC · CAM 02</span>
            <span className="sg__steps">
              <b>2</b> → <b>5</b> → <b>20</b>
            </span>
          </div>
          <p>{t("intro")}</p>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => start(0)}>
              {t("play")}
            </button>
            <button type="button" className="lp-btn lp-btn--ghost" onClick={() => start(0, true)}>
              {t("watch")}
            </button>
          </div>
        </div>
      )}

      {phase === "remember" && (
        <div className="sg__remember">
          <p className="sg__hint">
            {t("remember")} · <b>{known.length}</b>
          </p>
          <ul className={`sg__lineup sg__lineup--${known.length > 6 ? "many" : "few"}`}>
            {known.map((p, i) => (
              <Mug key={`${seed}-${p.id}`} p={p} i={i} />
            ))}
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => setPhase("scene")}>
              {t("ready")} →
            </button>
          </div>
        </div>
      )}

      {phase === "scene" && (
        <div className="sg__stage">
          <canvas
            ref={canvas}
            className="sg__canvas"
            tabIndex={0}
            role="application"
            aria-label={`${t("cam")}: ${ROUNDS[round] + 1} ${t("people")}. ${t("keys")}`}
            onPointerDown={onPointer}
            onKeyDown={onKey}
          />
          <p className="sg__sr" aria-live="polite">
            {sel && `${t("person")} ${sel.replace("/", ` ${t("of")} `)}`}
          </p>
          {live && <p className="sg__live">{t("find")}</p>}

          {demo && (
            <div className="sg__result" role="status">
              <p className="sg__times">
                {t("machine")}: <b>{fmtMs(machineMs)}</b> {t("perFrame")} · {ROUNDS[round] + 1} {t("people")}
              </p>
              <div className="sg__actions">
                <button type="button" className="lp-btn" onClick={() => start(round)}>
                  {t("yourTurn")}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="sg__result" role="status">
              <p className={result.correct ? "sg__ok" : "sg__bad"}>
                {result.correct ? t("correct") : `${t("wrong")} ${result.picked}. ${t("redBox")}`}
              </p>
              <p className="sg__times">
                {t("you")}: <b>{(result.human_ms / 1000).toFixed(1)} s</b> · {t("machine")}: <b>{fmtMs(result.machine_ms)}</b> {t("perFrame")}
                {result.correct && (
                  <>
                    {" "}
                    · ≈{Math.round(result.human_ms / Math.max(result.machine_ms, 0.01)).toLocaleString(lang === "ro" ? "ro" : "en")}× {t("faster")}
                  </>
                )}
              </p>
              <div className="sg__actions">
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => start(round)}>
                  {t("retry")}
                </button>
                <button type="button" className="lp-btn" onClick={() => start(last ? 0 : round + 1)}>
                  {last ? t("again") : `${t("next")}: ${ROUNDS[round + 1]}`}
                </button>
              </div>
              <a className="sg__survey" href="#survey">
                {t("survey")} →
              </a>
            </div>
          )}
        </div>
      )}

      <p className="sg__note">{t("note")}</p>
    </div>
  );
}
