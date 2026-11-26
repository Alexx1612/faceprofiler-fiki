"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { loadGameResults, loadProgress, resetGame, saveGameResult, saveProgress, type GameResult } from "@/lib/game-result";
import { NEUTRAL, distance, drawCharacter, type Pose } from "@/components/landing/spot-cast";
import { allScenarios, pickScenario, scenarioById, type Member, type Scenario } from "@/components/landing/spot-scenarios";
import { SpotScene, type CueEvent, type SceneResult } from "@/components/landing/spot-scene";

import "@/app/landing/spot-game.css";

/**
 * "Spot the stranger", five rounds: find the one unknown person among 3, then 14 remembered people; then
 * three scenes where you spot the person about to cause harm, from behaviour only.
 *
 * Methodology: this component holds the round flow (intro, line-up, scene, result, summary), the texts in
 * English and Romanian, the live alert feed (lines come from the scene) and the result cards. Scenarios are
 * hand-authored (spot-scenarios.ts); the moving scene and the modelled system time live in spot-scene.ts.
 * The visitor's time and the system's time share one basis: from the unknown person's first appearance
 * (rounds 1-2) or from the start of the round (rounds 3-5). Results and the round the player is on go to
 * sessionStorage (lib/game-result.ts), so the quick survey can show progress and resume with #game-resume.
 */

type Kind = "find" | "harm";
const ROUNDS: { kind: Kind; known: number; pool: 0 | 1 | 2 }[] = [
  { kind: "find", known: 3, pool: 0 },
  { kind: "find", known: 14, pool: 1 },
  { kind: "harm", known: 0, pool: 2 },
  { kind: "harm", known: 0, pool: 2 },
  { kind: "harm", known: 0, pool: 2 },
];
const N = ROUNDS.length;

type Lang = "en" | "ro";
type Line = [string, string];
const T = {
  round: ["Round", "Runda"],
  known: ["known + 1 new", "cunoscuți + 1 nou"],
  harmQ: ["Who is about to cause harm?", "Cine e pe cale să facă rău?"],
  harmIntro: [
    "About 10 people. Watch how they move and what they do. Tap the person about to hurt someone or do damage.",
    "Cam 10 persoane. Urmărește cum se mișcă și ce fac. Apasă pe persoana care e pe cale să rănească pe cineva sau să facă stricăciuni.",
  ],
  harmFind: ["Tap the person about to cause harm", "Apasă pe persoana care e pe cale să facă rău"],
  intro: [
    "You against Nau-ino: at the end you see your time next to the system's.",
    "Tu contra Nau-ino: la final îți vezi timpul lângă cel al sistemului.",
  ],
  how: ["How to play · about 1 minute", "Cum se joacă · cam 1 minut"],
  step1: [
    "Remember 3 faces. Then find the one new person in the camera feed and tap them.",
    "Reține 3 fețe. Apoi găsește persoana nouă în imaginea camerei și apasă pe ea.",
  ],
  step2: ["The same with 14 faces.", "La fel, cu 14 fețe."],
  step3: [
    "Three short scenes: tap the person who is about to hurt someone.",
    "Trei scene scurte: apasă pe persoana care e pe cale să rănească pe cineva.",
  ],
  play: ["Play", "Joacă"],
  start: ["Start", "Începe"],
  watch: ["Watch Nau-ino do it", "Vezi cum o face Nau-ino"],
  remember: ["Remember them", "Reține-i"],
  ready: ["Ready", "Gata"],
  find: ["Tap the person you have not seen", "Apasă pe persoana pe care n-ai mai văzut-o"],
  keys: ["Keyboard: arrows to select, Enter to pick.", "Din tastatură: alegi cu săgețile și confirmi cu Enter."],
  person: ["Person", "Persoana"],
  of: ["of", "din"],
  cam: ["Camera view", "Imaginea camerei"],
  people: ["people", "persoane"],
  you: ["You", "Tu"],
  system: ["System", "Sistemul"],
  fromAppear: ["from the first appearance in view", "de la apariția în cadru"],
  estimated: ["estimated", "estimat"],
  correct: ["Correct.", "Corect."],
  wrong: ["Wrong: that was", "Greșit: era"],
  redBox: ["The right person is in red.", "Persoana corectă e marcată cu roșu."],
  retry: ["Retry", "Mai încearcă"],
  next: ["Next round", "Runda următoare"],
  summary: ["See your results", "Vezi rezultatele"],
  again: ["Play again", "Joacă din nou"],
  yourTurn: ["Your turn", "Rândul tău"],
  demoSys: ["System: alert", "Sistemul: alertă la"],
  demoAfter: ["after the unknown person appeared", "după apariția persoanei necunoscute"],
  survey: ["Answer the 1-min survey", "Completează chestionarul (1 minut)"],
  back: ["Back to the survey", "Înapoi la chestionar"],
  restart: ["Start over", "De la început"],
  backShort: ["Survey", "Chestionar"],
  feed: ["Alerts", "Alerte"],
  info: ["About this scene", "Despre această scenă"],
  notAmong: ["not among the", "nu e printre cei"],
  knownPeople: ["known people · guard alerted", "cunoscuți · paznicul a fost alertat"],
  appeared: ["appears in view", "apare în cadru"],
  sysAlert: ["system alert", "alerta sistemului"],
  youPicked: ["your pick", "ai ales tu"],
  observed: ["observed", "observat"],
  alertAt: ["Alert raised at", "Alertă dată la"],
  youAt: ["You picked at", "Tu ai ales la"],
  sAlert: ["alert at", "alertă la"],
  sentBonus: ["Alert: guard on duty + principal · clip saved 30 s", "Alertă: paznicul de serviciu + directorul · clip salvat 30 s"],
  review: ["A person reviews every alert before acting.", "Un om verifică fiecare alertă înainte de orice intervenție."],
  inList: ["in the list", "e pe listă"],
  measured: ["Measured", "Măsurat"],
  honest: [
    "Detects behaviour (movement, contact, hand-offs), not emotions or intentions. A person reviews every alert.",
    "Detectează comportamente (mișcare, contact, schimburi de obiecte), nu emoții sau intenții. Fiecare alertă e verificată de un om.",
  ],
  sysNote: [
    "System time estimated from Nau-ino measurements on a laptop CPU: ≈43 ms per face, 5 frames/s, 3 frames to confirm.",
    "Timpul sistemului e estimat din măsurătorile Nau-ino pe procesorul unui laptop: ≈43 ms pe față, 5 cadre/s, 3 cadre pentru confirmare.",
  ],
  done: ["Your game", "Jocul tău"],
  ok: ["correct", "corect"],
  missed: ["missed", "greșit"],
} satisfies Record<string, Line>;
const LANG_KEY = "nauino:lang";

type FeedLine = { line: Line; at: string; kind: "info" | "cue" | "alert"; k: number };
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
  const sec = (ms: number) => {
    const v = (ms / 1000).toFixed(1);
    return `${L ? v.replace(".", ",") : v} s`;
  };
  const [round, setRound] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [demo, setDemo] = useState(false);
  const [live, setLive] = useState(false);
  const [result, setResult] = useState<SceneResult | null>(null);
  const [demoSys, setDemoSys] = useState(-1);
  const [sel, setSel] = useState("");
  const [seed, setSeed] = useState(0);
  const [feed, setFeed] = useState<FeedLine[]>([]);
  const [info, setInfo] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SpotScene | null>(null);
  const roundRef = useRef(round);
  const scRef = useRef<Scenario | null>(null);
  const lastIds = useRef<Record<number, string>>({});
  const usedHarm = useRef<string[]>([]);
  const langRef = useRef(lang);
  const feedK = useRef(0);

  const meta = ROUNDS[round];
  const harm = meta.kind === "harm";
  const known = scenario ? scenario.cast.filter((_, i) => i !== scenario.target) : [];
  const target = scenario ? scenario.cast[scenario.target] : null;

  const start = useCallback((r: number, asDemo = false) => {
    const pool = ROUNDS[r].pool;
    if (r === 0) usedHarm.current = [];
    const avoid = pool === 2 ? usedHarm.current : lastIds.current[r] ? [lastIds.current[r]] : [];
    // automated tests can force scenarios: ?sgtest&sgscn=id1,id2 (webdriver only)
    const forced = navigator.webdriver ? new URLSearchParams(location.search).get("sgscn") : null;
    const fixed =
      forced
        ?.split(",")
        .map(scenarioById)
        .find((x) => x && x.pool === pool && !avoid.includes(x.id)) ?? null;
    const sc = fixed ?? pickScenario(pool, avoid);
    lastIds.current[r] = sc.id;
    if (pool === 2) usedHarm.current = [...usedHarm.current.filter((id) => id !== sc.id), sc.id];
    roundRef.current = r;
    scRef.current = sc;
    setRound(r);
    setScenario(sc);
    setResult(null);
    setLive(false);
    setSel("");
    setFeed([]);
    setInfo(false);
    setDemoSys(-1);
    setDemo(asDemo);
    setPhase(asDemo ? "scene" : "remember");
    setSeed((s) => s + 1);
    saveProgress(r + 1);
  }, []);

  const retry = () => {
    // a retry of a harmful round may pick the same scenario again
    if (ROUNDS[round].pool === 2 && scenario) usedHarm.current = usedHarm.current.filter((id) => id !== scenario.id);
    start(round);
  };

  const showSummary = useCallback(() => {
    setResults(loadGameResults());
    setPhase("summary");
  }, []);

  useEffect(() => {
    langRef.current = lang;
    scene.current?.setLang(lang);
  }, [lang]);

  /** Start over: forget every round and play from round 1 (not a single level again). */
  const restart = useCallback(
    (from: string) => {
      resetGame();
      setResults([]);
      start(0);
      track("game_restarted", { from });
    },
    [start],
  );

  // from the survey: #game-resume jumps to the round the player is on, #game-restart starts over
  useEffect(() => {
    const resume = () => {
      if (location.hash === "#game-restart") {
        document.getElementById("game")?.scrollIntoView({ behavior: "smooth", block: "start" });
        restart("survey");
        history.replaceState(null, "", `${location.pathname}${location.search}#game`);
        return;
      }
      if (location.hash !== "#game-resume") return;
      document.getElementById("game")?.scrollIntoView({ behavior: "smooth", block: "start" });
      const p = loadProgress();
      const r = p ? p.round : 1;
      if (r > N) showSummary();
      else start(Math.max(0, r - 1));
      history.replaceState(null, "", `${location.pathname}${location.search}#game`);
      track("game_resumed", { round: r });
    };
    resume();
    window.addEventListener("hashchange", resume);
    return () => window.removeEventListener("hashchange", resume);
  }, [start, showSummary, restart]);

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
        setLive(true);
        canvas.current?.focus({ preventScroll: true });
      },
      onSelect: (i, n) => setSel(`${i}/${n}`),
      onMachine: setDemoSys,
      onFeed: (line, clock, kind) => setFeed((f) => [...f, { line, at: hhmmss(s.at(clock)), kind, k: feedK.current++ }]),
      onResult: (r) => {
        setLive(false);
        setResult(r);
        const rr = roundRef.current;
        const out: GameResult = {
          round: (rr + 1) as GameResult["round"],
          people: sc.cast.length,
          human_ms: Math.round(r.human_ms),
          machine_ms: Math.round(r.machine_ms),
          correct: r.correct,
          scenario: sc.id,
        };
        if (r.act) {
          out.lead_ms = Math.round((r.act.clock - r.sysClock) * 1000);
          out.human_lead_ms = Math.round((r.act.clock - r.tapClock) * 1000);
        }
        saveGameResult(out);
        saveProgress(r.correct ? rr + 2 : rr + 1);
        track("game_round_finished", { ...out });
      },
    });
    scene.current = s;
    // after a long line-up (14 people on a phone) the camera view may be above the screen: bring it into view
    const box = canvas.current.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) canvas.current.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    if (navigator.webdriver && new URLSearchParams(location.search).has("sgtest")) {
      const w = window as unknown as { __spotGame: SpotScene; __spotCheck: () => string[] };
      w.__spotGame = s;
      // rounds 1-2: every unknown person differs from everyone remembered, and nobody wears a hood
      w.__spotCheck = () => {
        const out: string[] = [];
        for (const x of allScenarios().filter((y) => y.pool < 2)) {
          x.cast.forEach((k, i) => {
            if (k.acc === "hood") out.push(`${x.id}: ${k.name} wears a hood`);
            if (i !== x.target && distance(k, x.cast[x.target]) < 0.6) out.push(`${x.id}: ${k.name} too close to the unknown person`);
          });
        }
        return out;
      };
    }
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

  const who = (name: string, role: Line) => (name === "?" ? role[L] : name);
  const clockOf = (r: SceneResult, clock: number) => hhmmss(new Date(r.t0 + clock * 1000));
  const est = (on: boolean) => (on ? ` (${t("estimated")})` : "");
  const label = (r: number) =>
    ROUNDS[r].kind === "find" ? `${t("round")} ${r + 1}/${N} · ${ROUNDS[r].known} ${t("known")}` : `${t("round")} ${r + 1}/${N} · ${t("harmQ")}`;

  /** "cu 3,8 s înainte de împingere (11:05:20)" / "3.8 s before the push (11:05:20)", or "after". */
  const relAct = (r: SceneResult, at: number, act: CueEvent) => {
    const d = act.clock - at;
    const noun = act.line[L];
    const when = `${clockOf(r, act.clock)}${act.projected ? ", ~" + t("estimated") : ""}`;
    if (d >= 0) return L ? `cu ${sec(d * 1000)} înainte de ${noun} (${when})` : `${sec(d * 1000)} before ${noun} (${when})`;
    return L ? `la ${sec(-d * 1000)} după ${noun} (${when})` : `${sec(-d * 1000)} after ${noun} (${when})`;
  };

  return (
    <div className="lp-glass sg">
      <div className="sg__bar">
        <span className="sg__round">{phase === "summary" ? t("done") : label(round)}</span>
        {phase !== "intro" && (
          <button type="button" className="sg__restart" onClick={() => restart("header")} aria-label={t("restart")} title={t("restart")}>
            ↺ <span className="sg__restart-text">{t("restart")}</span>
          </button>
        )}
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
          <div className="sg__teaser sg__teaser--how">
            <span className="sg__rec" aria-hidden>
              ● REC · CAM 02
            </span>
            <p className="sg__how-title">{t("how")}</p>
            <ol className="sg__how">
              <li>
                <b>1</b>
                <span>{t("step1")}</span>
              </li>
              <li>
                <b>2</b>
                <span>{t("step2")}</span>
              </li>
              <li>
                <b>3</b>
                <span>{t("step3")}</span>
              </li>
            </ol>
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

      {phase === "remember" && scenario && !harm && (
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

      {phase === "remember" && scenario && harm && (
        <div className="sg__remember sg__bonus-intro">
          <p className="sg__bonus-title">{label(round)}</p>
          <p className="sg__hint">{t("harmIntro")}</p>
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
            {(live || demo) && feed.length > 0 && (
              <ol className="sg__feed" aria-label={t("feed")} aria-live="polite">
                {feed.slice(-3).map((f) => (
                  <li key={f.k} className={`sg__feed-${f.kind}`}>
                    <time>{f.at}</time> · {f.line[L]}
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
          {live && <p className="sg__live">{harm ? t("harmFind") : t("find")}</p>}

          {demo && (
            <div className="sg__result" role="status">
              <p className="sg__times">
                {demoSys >= 0 ? (
                  <>
                    {t("demoSys")} <b>{sec(demoSys)}</b> {t("demoAfter")}
                  </>
                ) : (
                  "…"
                )}
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
              {!result.correct && (
                <p className="sg__okperson">
                  <b>{who(result.picked, result.pickedRole)}</b> — {harm ? result.pickedReadout[L] : `${result.pickedRole[L]}, ${t("inList")}`}
                </p>
              )}

              {!harm ? (
                <>
                  <p className="sg__times">
                    {t("you")}: <b>{sec(result.human_ms)}</b> · {t("system")}: <b>{sec(result.machine_ms)}</b>
                    {est(result.sysProjected)} ({t("fromAppear")})
                  </p>
                  <div className="sg__incident">
                    <p className="sg__incident-head">
                      <span className="sg__badge">Unknown_1</span> {t("notAmong")} {known.length} {t("knownPeople")}
                    </p>
                    <ul>
                      {[
                        { c: result.baseClock, l: t("appeared") },
                        { c: result.sysClock, l: t("sysAlert") + est(result.sysProjected) },
                        { c: result.tapClock, l: t("youPicked") },
                      ]
                        .sort((a, b) => a.c - b.c)
                        .map((e, i) => (
                          <li key={i}>
                            <time>{clockOf(result, e.c)}</time> {e.l}
                          </li>
                        ))}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p className="sg__times">
                    {t("system")}: {t("sAlert")} <b>+{sec(result.machine_ms)}</b>
                    {result.act && result.act.clock >= result.sysClock && (
                      <>
                        , {L ? "cu " : ""}
                        <b>{sec((result.act.clock - result.sysClock) * 1000)}</b> {L ? "înainte de faptă" : "before the act"}
                      </>
                    )}
                    {est(result.sysProjected)} · {t("you")}: <b>+{sec(result.human_ms)}</b>
                  </p>
                  <div className="sg__incident">
                    <p className="sg__incident-head">
                      <span className="sg__badge">{L ? "ALERTĂ" : "ALERT"}</span> {who(target.name, target.role)}
                    </p>
                    <ul>
                      {[
                        // cues, the system alert and the visitor's pick, in clock order; a cue counts as observed
                        // when it happened before the tap, even if the scene was run ahead to time the rest
                        ...result.cues
                          .filter((c) => c.clock <= Math.max(result.sysClock, result.tapClock) + 0.01)
                          .map((c) => ({
                            key: c.id,
                            at: c.clock,
                            li: (
                              <li key={c.id}>
                                <time>{clockOf(result, c.clock)}</time> {c.line[L]} —{" "}
                                {c.projected && c.clock > result.tapClock ? t("estimated") : t("observed")}
                              </li>
                            ),
                          })),
                        {
                          key: "alert",
                          at: result.sysClock,
                          li: (
                            <li key="alert" className="sg__tl-alert">
                              <time>{clockOf(result, result.sysClock)}</time> {t("alertAt")} {clockOf(result, result.sysClock)}
                              {est(result.sysProjected)}
                              {result.act ? ` — ${relAct(result, result.sysClock, result.act)}` : ""}
                            </li>
                          ),
                        },
                        {
                          key: "you",
                          at: result.tapClock,
                          li: (
                            <li key="you" className="sg__tl-you">
                              <time>{clockOf(result, result.tapClock)}</time> {t("youAt")} {clockOf(result, result.tapClock)}
                              {result.act ? ` — ${relAct(result, result.tapClock, result.act)}` : ""}
                            </li>
                          ),
                        },
                      ]
                        .sort((a, b) => a.at - b.at)
                        .map((x) => x.li)}
                    </ul>
                    <p className="sg__measured">
                      {t("measured")}: {result.targetReadout[L]}
                    </p>
                    <p className="sg__sent">{t("sentBonus")}</p>
                    <p className="sg__review">{t("review")}</p>
                  </div>
                </>
              )}
              <div className="sg__actions">
                <button type="button" className="lp-btn lp-btn--ghost" onClick={retry}>
                  {t("retry")}
                </button>
                {round < N - 1 ? (
                  <button type="button" className="lp-btn" onClick={() => start(round + 1)}>
                    {`${t("next")}: ${round + 2}/${N}`}
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
            {ROUNDS.map((m, i) => {
              const r = results.find((x) => x.round === i + 1);
              return (
                <li key={i}>
                  <span>{m.kind === "find" ? `${i + 1} · ${m.known} ${t("known")}` : `${i + 1} · ${t("harmQ")}`}</span>
                  {r ? (
                    <b className={r.correct ? "sg__ok" : "sg__bad"}>
                      {r.correct ? t("ok") : t("missed")} · {t("you")} {sec(r.human_ms)} · {t("system")} {sec(r.machine_ms)}
                    </b>
                  ) : (
                    <b>—</b>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" onClick={() => restart("summary")}>
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

      <p className="sg__note">
        {(harm || phase === "summary") && phase !== "intro" ? `${t("honest")} ` : ""}
        {t("sysNote")}
      </p>
    </div>
  );
}
