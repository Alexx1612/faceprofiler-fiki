"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { loadGameResults, loadProgress, saveGameResult, saveProgress, type GameResult } from "@/lib/game-result";
import { NEUTRAL, distance, drawCharacter, type Pose } from "@/components/landing/spot-cast";
import { allScenarios, pickScenario, scenarioById, type Member, type Scenario } from "@/components/landing/spot-scenarios";
import { SpotScene, type SceneResult } from "@/components/landing/spot-scene";

import "@/app/landing/spot-game.css";

/**
 * "Spot the stranger": remember 2, then 5, then 20 people and find the one new person in a CCTV view;
 * then a bonus round: find the person about to cause harm, from behaviour only.
 *
 * Methodology: this component holds the round flow (intro, line-up, scene, result, summary), texts in
 * English and Romanian, the alert feed and the incident cards. Scenarios are hand-authored
 * (spot-scenarios.ts); the moving scene, the matcher and the behaviour readouts live in spot-scene.ts.
 * The human time runs from "GO" to the tap, only while the scene is on screen. Results go to
 * sessionStorage for the quick survey (lib/game-result.ts), together with the round the player is on, so
 * the survey can show progress and send the player back here with #game-resume.
 */

const ROUNDS = [2, 5, 20, 10];
const LAST = ROUNDS.length - 1;
// Real engine time in the note: 0.3.2 self-check, 17.4 s for 405 photos on a laptop CPU = ≈43 ms per photo.

type Lang = "en" | "ro";
type Line = [string, string];
const T = {
  round: ["Round", "Runda"],
  known: ["known + 1 new", "cunoscuți + 1 nou"],
  bonus: ["Bonus", "Bonus"],
  bonusTitle: ["Bonus · Who is about to cause harm?", "Bonus · Cine e pe cale să facă rău?"],
  bonusIntro: [
    "10 people. Watch how they move and what they do. Tap the person about to hurt someone.",
    "10 persoane. Urmărește cum se mișcă și ce fac. Apasă pe persoana care e pe cale să facă rău cuiva.",
  ],
  bonusFind: ["Tap the person about to cause harm", "Apasă pe persoana care e pe cale să facă rău"],
  intro: ["Remember the people. Then tap the one new person in the camera feed.", "Reține persoanele. Apoi apasă pe cea nouă, în imaginea de pe camera de supraveghere."],
  play: ["Play", "Joacă"],
  start: ["Start", "Începe"],
  watch: ["Watch the machine", "Vezi cum lucrează calculatorul"],
  remember: ["Remember them", "Reține-i"],
  ready: ["Ready", "Gata"],
  find: ["Tap the new person", "Apasă pe persoana nouă"],
  keys: ["Keyboard: arrows to select, Enter to pick.", "Din tastatură: alegi cu săgețile și confirmi cu Enter."],
  person: ["Person", "Persoana"],
  of: ["of", "din"],
  cam: ["Camera view", "Imaginea camerei"],
  people: ["people", "persoane"],
  machine: ["Machine", "Calculatorul"],
  perFrame: ["per frame", "pe cadru"],
  you: ["You", "Tu"],
  correct: ["Correct.", "Corect."],
  wrong: ["Wrong: that was", "Greșit: era"],
  redBox: ["The right person is in red.", "Persoana corectă e marcată cu roșu."],
  retry: ["Retry", "Mai încearcă"],
  next: ["Next round", "Runda următoare"],
  toBonus: ["Bonus: who is about to cause harm?", "Bonus: cine e pe cale să facă rău?"],
  summary: ["See your results", "Vezi rezultatele"],
  again: ["Play again", "Joacă din nou"],
  yourTurn: ["Your turn", "Rândul tău"],
  survey: ["Answer the 1-min survey", "Completează chestionarul (1 minut)"],
  back: ["Back to the survey", "Înapoi la chestionar"],
  backShort: ["Survey", "Chestionar"],
  feed: ["Alerts", "Alerte"],
  info: ["About this scene", "Despre această scenă"],
  notListed: ["not among the", "nu e printre cele"],
  knownPeople: ["known people", "persoane cunoscute"],
  sentTo: ["Alert sent to: guard on duty · principal", "Alertă trimisă: paznicului de serviciu · directorului"],
  sentBonus: ["Alert: guard on duty + principal · clip saved 30 s", "Alertă: paznicul de serviciu + directorul · clip salvat 30 s"],
  review: ["A person reviews every alert before acting.", "Un om verifică fiecare alertă înainte de orice intervenție."],
  inList: ["in the list", "e pe listă"],
  measured: ["Measured", "Măsurat"],
  honest: [
    "Detects behaviour (movement, contact, hand-offs), not emotions or intentions. A person reviews every alert.",
    "Detectează comportamente (mișcare, contact, schimburi de obiecte), nu emoții sau intenții. Fiecare alertă e verificată de un om.",
  ],
  done: ["Your game", "Jocul tău"],
  ok: ["correct", "corect"],
  missed: ["missed", "greșit"],
  note: [
    "Demo matcher: colour features, nearest neighbour, every frame. Real engine (face vectors): ≈43 ms per photo on a laptop CPU.",
    "Demo simplificat: compară culorile, la fiecare cadru. Sistemul real compară trăsăturile feței și are nevoie de ≈43 ms pe imagine, pe procesorul unui laptop.",
  ],
} satisfies Record<string, Line>;
const LANG_KEY = "nauino:lang";

/** When the three alerts appear after the round goes live (ms). */
const ALERT_AT = [1200, 4200, 8000];
type Alert = { at: string; line: number };
const hhmmss = (d: Date) => [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");

/** Open the quick survey dialog (it listens for #survey; re-fire when the hash is already set). */
function openSurvey(place: string) {
  track("game_back_to_survey", { place });
  if (location.hash === "#survey") window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = "survey";
}

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

const REST: Pose = {
  phase: 0, moving: 0, run: 0, facing: 0, look: 0, back: 0, sit: 0, breath: 0, breathAmp: 0, act: "none", t: 0,
  expr: { ...NEUTRAL, smile: 0.25 }, blink: 0, heart: 0, sway: 0, toward: 1, burst: 0,
};

/** One person in the line-up: drawn once on a small canvas, standing, with name and role. */
function Mug({ p, i, L }: { p: Member; i: number; L: 0 | 1 }) {
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
    const H = h * 0.86 * (p.age === "child" ? 0.72 : p.age === "teen" ? 0.92 : 1);
    drawCharacter(g, p, w / 2, h - 6, H, REST);
  }, [p]);
  return (
    <li className="sg__mug" style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}>
      <canvas ref={ref} aria-hidden />
      <span>{p.name}</span>
      <small>{p.role[L]}</small>
    </li>
  );
}

type Phase = "intro" | "remember" | "scene" | "summary";

export function SpotGame() {
  const [lang, setLang] = useLang();
  const L: 0 | 1 = lang === "ro" ? 1 : 0;
  const t = (k: keyof typeof T) => T[k][L];
  const [round, setRound] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [demo, setDemo] = useState(false);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<SceneResult | null>(null);
  const [machineMs, setMachineMs] = useState(0);
  const [sel, setSel] = useState("");
  const [seed, setSeed] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [info, setInfo] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SpotScene | null>(null);
  const roundRef = useRef(round);
  const scRef = useRef<Scenario | null>(null);
  const lastIds = useRef<Record<number, string>>({});
  const langRef = useRef(lang);
  // CCTV time when the round went live; alert i is stamped liveStart + ALERT_AT[i]
  const liveStart = useRef(0);
  const stampOf = (line: number) => hhmmss(new Date(liveStart.current + ALERT_AT[line]));

  const bonus = round === LAST;
  const known = scenario ? scenario.cast.filter((_, i) => i !== scenario.target) : [];
  const target = scenario ? scenario.cast[scenario.target] : null;

  const start = useCallback((r: number, asDemo = false) => {
    // automated tests can force a scenario per round: ?sgtest&sgscn=id1,id2 (webdriver only)
    const forced = navigator.webdriver ? new URLSearchParams(location.search).get("sgscn") : null;
    const fixed = forced?.split(",").map(scenarioById).find((x) => x && x.round === r) ?? null;
    const sc = fixed ?? pickScenario(r, lastIds.current[r]);
    lastIds.current[r] = sc.id;
    roundRef.current = r;
    scRef.current = sc;
    setRound(r);
    setScenario(sc);
    setResult(null);
    setLive(false);
    setSel("");
    setAlerts([]);
    setInfo(false);
    setDemo(asDemo);
    setPhase(asDemo ? "scene" : "remember");
    setSeed((s) => s + 1);
    saveProgress(r + 1);
  }, []);

  const showSummary = useCallback(() => {
    setResults(loadGameResults());
    setPhase("summary");
  }, []);

  useEffect(() => {
    langRef.current = lang;
    scene.current?.setLang(lang);
  }, [lang]);

  // resume from the survey: #game-resume jumps to the round the player is on
  useEffect(() => {
    const resume = () => {
      if (location.hash !== "#game-resume") return;
      document.getElementById("game")?.scrollIntoView({ behavior: "smooth", block: "start" });
      const p = loadProgress();
      const r = p ? p.round : 1;
      if (r > ROUNDS.length) showSummary();
      else start(Math.max(0, r - 1));
      history.replaceState(null, "", `${location.pathname}${location.search}#game`);
      track("game_resumed", { round: r });
    };
    resume();
    window.addEventListener("hashchange", resume);
    return () => window.removeEventListener("hashchange", resume);
  }, [start, showSummary]);

  // the scene lives while the phase is "scene"; a new seed rebuilds it
  useEffect(() => {
    const sc = scRef.current;
    if (phase !== "scene" || !canvas.current || !sc) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = new SpotScene(canvas.current, {
      scenario: sc,
      demo,
      reduce,
      lang: langRef.current,
      onLive: () => {
        liveStart.current = s.sceneTime().getTime();
        setLive(true);
        canvas.current?.focus({ preventScroll: true });
      },
      onSelect: (i, n) => setSel(`${i}/${n}`),
      onMachine: setMachineMs,
      onResult: (r) => {
        setLive(false);
        setResult(r);
        setAlerts((a) => [...a, ...[0, 1, 2].filter((i) => !a.some((x) => x.line === i)).map((line) => ({ at: hhmmss(new Date(liveStart.current + ALERT_AT[line])), line }))]);
        const rr = roundRef.current;
        const out: GameResult = {
          round: (rr + 1) as GameResult["round"],
          people: ROUNDS[rr],
          human_ms: Math.round(r.human_ms),
          machine_ms: +r.machine_ms.toFixed(4),
          correct: r.correct,
        };
        saveGameResult(out);
        saveProgress(r.correct ? rr + 2 : rr + 1);
        track("game_round_finished", { ...out, scenario: sc.id });
      },
    });
    scene.current = s;
    if (navigator.webdriver && new URLSearchParams(location.search).has("sgtest")) {
      const w = window as unknown as { __spotGame: SpotScene; __spotCheck: () => string[] };
      w.__spotGame = s;
      // every stranger must differ from everyone in the line-up by more than the matcher's threshold
      w.__spotCheck = () =>
        allScenarios()
          .filter((x) => x.round < 3)
          .flatMap((x) => x.cast.filter((_, i) => i !== x.target).map((k) => [x.id, k.name, distance(k, x.cast[x.target])] as const))
          .filter(([, , d]) => d < 0.6)
          .map(([id, n, d]) => `${id}: ${n} ${d.toFixed(2)}`);
    }
    return () => {
      s.destroy();
      scene.current = null;
    };
    // rebuilt only for a new round (seed) or a phase change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, seed]);

  // the alert feed: three timed alerts while the round is live, stamped with the CCTV clock
  useEffect(() => {
    if (!live) return;
    const timers = ALERT_AT.map((ms, line) =>
      window.setTimeout(() => {
        const at = hhmmss(new Date(liveStart.current + ALERT_AT[line]));
        setAlerts((a) => (a.some((x) => x.line === line) ? a : [...a, { at, line }]));
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [live]);

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
  const who = (name: string, role: Line) => (name === "?" ? role[L] : name);

  return (
    <div className="lp-glass sg">
      <div className="sg__bar">
        <span className="sg__round">
          {phase === "summary" ? t("done") : bonus ? `${t("bonus")} · ${ROUNDS[LAST]} ${t("people")}` : `${t("round")} ${round + 1}/3 · ${ROUNDS[round]} ${t("known")}`}
        </span>
        <button type="button" className="sg__back" onClick={() => openSurvey("header")} aria-label={t("back")}>
          ← <span className="sg__back-long">{t("back")}</span>
          <span className="sg__back-short" aria-hidden>
            {t("backShort")}
          </span>
        </button>
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
              <b>2</b> → <b>5</b> → <b>20</b> → <b>{t("bonus")}</b>
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

      {phase === "remember" && scenario && !bonus && (
        <div className="sg__remember">
          <p className="sg__hint">
            {t("remember")} · <b>{known.length}</b>
          </p>
          <ul className={`sg__lineup sg__lineup--${known.length > 6 ? "many" : "few"}`}>
            {known.map((p, i) => (
              <Mug key={`${seed}-${p.id}`} p={p} i={i} L={L} />
            ))}
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => setPhase("scene")}>
              {t("ready")} →
            </button>
          </div>
        </div>
      )}

      {phase === "remember" && scenario && bonus && (
        <div className="sg__remember sg__bonus-intro">
          <p className="sg__bonus-title">{t("bonusTitle")}</p>
          <p className="sg__hint">{t("bonusIntro")}</p>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => setPhase("scene")}>
              {t("start")} →
            </button>
          </div>
        </div>
      )}

      {phase === "scene" && scenario && (
        <div className="sg__stage">
          <div className="sg__feedwrap">
            <canvas
              ref={canvas}
              className="sg__canvas"
              tabIndex={0}
              role="application"
              aria-label={`${t("cam")}: ${scenario.cast.length} ${t("people")}. ${t("keys")}`}
              onPointerDown={onPointer}
              onKeyDown={onKey}
            />
            {live && alerts.length > 0 && (
              <ol className="sg__feed" aria-label={t("feed")} aria-live="polite">
                {alerts.slice(-3).map((a) => (
                  <li key={a.line}>
                    <time>{a.at}</time> · {scenario.alerts[a.line][L]}
                  </li>
                ))}
              </ol>
            )}
            <button type="button" className="sg__info-btn" aria-expanded={info} aria-label={t("info")} onClick={() => setInfo((v) => !v)}>
              i
            </button>
            {info && (
              <p className="sg__info" role="note">
                {scenario.info[L]}
              </p>
            )}
          </div>
          <p className="sg__sr" aria-live="polite">
            {sel && `${t("person")} ${sel.replace("/", ` ${t("of")} `)}`}
          </p>
          {live && <p className="sg__live">{bonus ? t("bonusFind") : t("find")}</p>}

          {demo && (
            <div className="sg__result" role="status">
              <p className="sg__times">
                {t("machine")}: <b>{fmtMs(machineMs)}</b> {t("perFrame")} · {scenario.cast.length} {t("people")}
              </p>
              <div className="sg__actions">
                <button type="button" className="lp-btn" onClick={() => start(round)}>
                  {t("yourTurn")}
                </button>
              </div>
            </div>
          )}

          {result && target && (
            <div className="sg__result" role="status">
              <p className={result.correct ? "sg__ok" : "sg__bad"}>
                {result.correct ? t("correct") : `${t("wrong")} ${who(result.picked, result.pickedRole)}. ${t("redBox")}`}
              </p>
              <p className="sg__times">
                {t("you")}: <b>{(result.human_ms / 1000).toFixed(1)} s</b> · {t("machine")}: <b>{fmtMs(result.machine_ms)}</b> {t("perFrame")}
              </p>
              {!result.correct && (
                <p className="sg__okperson">
                  <b>{who(result.picked, result.pickedRole)}</b> — {bonus ? result.pickedReadout[L] : `${result.pickedRole[L]}, ${t("inList")}`}
                </p>
              )}
              {bonus ? (
                <div className="sg__incident">
                  <p className="sg__incident-head">
                    <span className="sg__badge">{lang === "ro" ? "ALERTĂ" : "ALERT"}</span> {who(target.name, target.role)}
                  </p>
                  <ul>
                    {(scenario.story ?? []).map((line, i) => (
                      <li key={i}>
                        <time>{stampOf(Math.min(i, 2))}</time> {line[L]}
                      </li>
                    ))}
                  </ul>
                  <p className="sg__measured">
                    {t("measured")}: {result.targetReadout[L]}
                  </p>
                  <p className="sg__sent">{t("sentBonus")}</p>
                  <p className="sg__review">{t("review")}</p>
                </div>
              ) : (
                <div className="sg__incident">
                  <p className="sg__incident-head">
                    <span className="sg__badge">Unknown_1</span> {t("notListed")} {known.length} {t("knownPeople")}
                  </p>
                  <ul>
                    {[...alerts]
                      .sort((a, b) => a.line - b.line)
                      .map((a) => (
                        <li key={a.line}>
                          <time>{a.at}</time> {scenario.alerts[a.line][L]}
                        </li>
                      ))}
                  </ul>
                  <p className="sg__sent">{t("sentTo")}</p>
                </div>
              )}
              <div className="sg__actions">
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => start(round)}>
                  {t("retry")}
                </button>
                {round < LAST ? (
                  <button type="button" className="lp-btn" onClick={() => start(round + 1)}>
                    {round + 1 === LAST ? t("toBonus") : `${t("next")}: ${ROUNDS[round + 1]}`}
                  </button>
                ) : (
                  <button type="button" className="lp-btn" onClick={showSummary}>
                    {t("summary")}
                  </button>
                )}
              </div>
              <a
                className="sg__survey"
                href="#survey"
                onClick={(e) => {
                  e.preventDefault();
                  openSurvey("result");
                }}
              >
                {t("survey")} →
              </a>
            </div>
          )}
        </div>
      )}

      {phase === "summary" && (
        <div className="sg__summary">
          <ul>
            {ROUNDS.map((n, i) => {
              const r = results.find((x) => x.round === i + 1);
              return (
                <li key={i}>
                  <span>{i === LAST ? `${t("bonus")} · ${n} ${t("people")}` : `${t("round")} ${i + 1} · ${n} ${t("known")}`}</span>
                  {r ? (
                    <b className={r.correct ? "sg__ok" : "sg__bad"}>
                      {r.correct ? t("ok") : t("missed")} · {(r.human_ms / 1000).toFixed(1)} s
                    </b>
                  ) : (
                    <b>—</b>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => start(0)}>
              {t("again")}
            </button>
          </div>
          <a
            className="sg__survey"
            href="#survey"
            onClick={(e) => {
              e.preventDefault();
              openSurvey("summary");
            }}
          >
            {t("survey")} →
          </a>
        </div>
      )}

      <p className="sg__note">{bonus || phase === "summary" ? t("honest") : t("note")}</p>
    </div>
  );
}
