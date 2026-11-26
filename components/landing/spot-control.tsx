"use client";

import { useEffect, useRef, useState } from "react";

import { type MultiCase } from "@/components/landing/spot-scenarios";
import { SpotScene, type CueEvent, type Lang, type Mark } from "@/components/landing/spot-scene";
import { SETTINGS } from "@/components/landing/spot-settings";

/**
 * Round 4 of "Spot the stranger": the control room. Four cameras in four places run at the same time; the
 * player watches one at a time (CAM buttons or keys 1-4, with a burst of static like an old monitor wall),
 * taps a person, then LOCKS IN that person as the intruder (not on the list of 30) or as the person about
 * to cause harm. Both answers must be locked before Submit, so one stray tap never ends the round.
 *
 * Methodology: one SpotScene per camera in control-room mode (spot-scene.ts `multi`): all four clocks run,
 * only the camera on screen is drawn. Locked answers and, after Submit, the reveal are boxes drawn by the
 * scenes (setMarks). The system's time is modelled per camera (estimate(): the unknown person is confirmed
 * after 3 analysed frames, the culprit when the behaviour cues add up) and, because the system watches all
 * four cameras at once, its time for the round is the later of the two alerts. The player's time runs from
 * the start of the round to Submit.
 */

type Pair = [string, string];
type Pick = { cam: number; i: number };
export type ControlResult = {
  correct: boolean;
  intruderOk: boolean;
  harmOk: boolean;
  human_ms: number;
  machine_ms: number;
  intruder_ms: number;
  harm_ms: number;
  projected: boolean;
  act: CueEvent | null;
  /** Seconds the system alerted before the harmful act (negative = after). */
  lead_s: number | null;
  /** Seconds the player locked in before the harmful act (negative = after). */
  human_lead_s: number | null;
};

const PLACE: Record<string, Pair> = {
  "gate-afternoon": ["Gate", "Poartă"],
  "yard-day": ["Yard", "Curte"],
  "yard-gym": ["Behind the gym", "Sala de sport"],
  "corridor-evening": ["Ground-floor corridor", "Hol parter"],
};

const TXT = {
  people: ["people", "persoane"],
  selected: ["Selected on", "Ai selectat pe"],
  lockAs: ["Lock in as:", "Confirmă ca:"],
  intruder: ["Intruder", "Intrus"],
  intruderLong: ["Intruder (not on the list)", "Intrus (nu e pe listă)"],
  harm: ["About to cause harm", "Pe cale să facă rău"],
  cancel: ["Cancel", "Renunță"],
  none: ["not locked yet", "neconfirmat"],
  locked: ["locked on", "confirmat pe"],
  clear: ["Clear", "Șterge"],
  submit: ["Submit both", "Trimite cele 2"],
  needTwo: ["Lock in 2 people to submit", "Confirmă 2 persoane ca să trimiți"],
  list: ["List of 30", "Lista celor 30"],
  hideList: ["Hide list", "Ascunde lista"],
  tap: ["Tap a person on any camera, then lock them in.", "Apasă pe o persoană de pe orice cameră, apoi confirm-o."],
  keys: ["Keys 1-4 switch cameras; arrows select, Enter picks.", "Tastele 1-4 schimbă camera; săgețile selectează, Enter alege."],
  right: ["Right", "Corect"],
  wrong: ["Wrong", "Greșit"],
  wasOn: ["it was on", "era pe"],
  you: ["You", "Tu"],
  system: ["System", "Sistemul"],
  allCams: ["watching all 4 cameras at once", "urmărește toate cele 4 camere deodată"],
  oneCam: ["one camera at a time", "câte o cameră"],
  estimated: ["estimated", "estimat"],
  intrAlert: ["intruder flagged", "intrus semnalat"],
  harmAlert: ["harm alert", "alertă de pericol"],
  beforeAct: ["before", "înainte de"],
  afterAct: ["after", "după"],
  reveal: ["Red boxes show the right people; switch cameras to see them.", "Chenarele roșii arată persoanele corecte; schimbă camera ca să le vezi."],
} satisfies Record<string, Pair>;

const AMBER = "#ffb347";
const ORANGE = "#ff7a45";
const RED = "#ff4d5e";

export function ControlRoom({ mcase, lang, reduce, onResult, footer }: { mcase: MultiCase; lang: Lang; reduce: boolean; onResult: (r: ControlResult) => void; footer?: React.ReactNode }) {
  const L: 0 | 1 = lang === "ro" ? 1 : 0;
  const t = (k: keyof typeof TXT) => TXT[k][L];
  const [cam, setCam] = useState(0);
  const [stat, setStat] = useState(0);
  const [pending, setPending] = useState<Pick | null>(null);
  const [locks, setLocks] = useState<{ intruder?: Pick; harm?: Pick }>({});
  const [result, setResult] = useState<ControlResult | null>(null);
  const [list, setList] = useState(false);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const scenes = useRef<SpotScene[]>([]);
  const started = useRef(0);
  const langRef = useRef(lang);

  // four scenes for the whole round
  useEffect(() => {
    started.current = performance.now();
    const list = mcase.cams.map((sc, k) => {
      const c = canvases.current[k]!;
      return new SpotScene(c, {
        scenario: sc,
        demo: false,
        reduce,
        lang: langRef.current,
        multi: { onPick: (i) => setPending({ cam: k, i }) },
      });
    });
    scenes.current = list;
    list.forEach((s, k) => s.setActive(k === 0));
    // automated tests only (?sgtest under webdriver): reach the four scenes
    if (navigator.webdriver && new URLSearchParams(location.search).has("sgtest")) (window as unknown as { __spotCams: SpotScene[] }).__spotCams = list;
    return () => list.forEach((s) => s.destroy());
    // one set of scenes per case
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcase]);

  useEffect(() => {
    langRef.current = lang;
    scenes.current.forEach((s) => s.setLang(lang));
  }, [lang]);

  const switchTo = (k: number) => {
    if (k === cam) return;
    setCam(k);
    setStat((n) => n + 1);
    scenes.current.forEach((s, j) => s.setActive(j === k));
    canvases.current[k]?.focus({ preventScroll: true });
  };

  // boxes: locked answers while playing; after Submit, the right people in red and wrong picks in amber
  useEffect(() => {
    const L2 = lang === "ro" ? 1 : 0;
    scenes.current.forEach((s, k) => {
      const marks: Mark[] = [];
      if (!result) {
        if (locks.intruder?.cam === k) marks.push({ i: locks.intruder.i, color: AMBER, label: `${TXT.intruder[L2]}?` });
        if (locks.harm?.cam === k) marks.push({ i: locks.harm.i, color: ORANGE, label: `${TXT.harm[L2]}?` });
      } else {
        if (mcase.intruder.cam === k) marks.push({ i: mcase.intruder.i, color: RED, label: `${TXT.intruder[L2].toUpperCase()} · Unknown_1` });
        if (mcase.harm.cam === k) marks.push({ i: mcase.harm.i, color: RED, label: L2 ? "ALERTĂ" : "ALERT" });
        if (locks.intruder && !result.intruderOk && locks.intruder.cam === k) marks.push({ i: locks.intruder.i, color: AMBER, label: `✕ ${TXT.intruder[L2]}`, dashed: true });
        if (locks.harm && !result.harmOk && locks.harm.cam === k) marks.push({ i: locks.harm.i, color: AMBER, label: `✕ ${TXT.harm[L2]}`, dashed: true });
      }
      s.setMarks(marks);
    });
  }, [locks, result, mcase, lang]);

  const lock = (role: "intruder" | "harm") => {
    if (!pending) return;
    setLocks((l) => {
      const next = { ...l, [role]: pending };
      // the same person cannot hold both answers
      const other = role === "intruder" ? "harm" : "intruder";
      if (next[other] && next[other]!.cam === pending.cam && next[other]!.i === pending.i) delete next[other];
      return next;
    });
    setPending(null);
    scenes.current[pending.cam]?.clearSelection();
  };

  const submit = () => {
    if (!locks.intruder || !locks.harm || result) return;
    const human_ms = performance.now() - started.current;
    const now = scenes.current[0]?.now() ?? 0;
    const intr = scenes.current[mcase.intruder.cam].estimate();
    const harm = scenes.current[mcase.harm.cam].estimate();
    const iS = intr && intr.sys >= 0 ? intr.sys : 0;
    const hS = harm && harm.sys >= 0 ? harm.sys : 0;
    const act = harm?.act ?? null;
    const r: ControlResult = {
      intruderOk: locks.intruder.cam === mcase.intruder.cam && locks.intruder.i === mcase.intruder.i,
      harmOk: locks.harm.cam === mcase.harm.cam && locks.harm.i === mcase.harm.i,
      correct: false,
      human_ms,
      machine_ms: Math.max(iS, hS) * 1000,
      intruder_ms: iS * 1000,
      harm_ms: hS * 1000,
      projected: Boolean(intr?.projected || harm?.projected),
      act,
      lead_s: act ? act.clock - hS : null,
      human_lead_s: act ? act.clock - now : null,
    };
    r.correct = r.intruderOk && r.harmOk;
    setPending(null);
    setResult(r);
    onResult(r);
  };

  const onPointer = (k: number) => (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (result) return;
    const box = e.currentTarget.getBoundingClientRect();
    scenes.current[k]?.tap(e.clientX - box.left, e.clientY - box.top, e.pointerType === "touch");
  };

  const onKey = (k: number) => (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 4) switchTo(n - 1);
    else if (result) return;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") scenes.current[k]?.cycle(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") scenes.current[k]?.cycle(-1);
    else if (e.key === "Enter" || e.key === " ") scenes.current[k]?.pickSelected();
    else return;
    e.preventDefault();
  };

  const camName = (k: number) => {
    const sc = mcase.cams[k];
    const label = SETTINGS[sc.setting]?.cam.split(" · ")[0] ?? `CAM ${k + 1}`;
    return `${label} · ${PLACE[sc.setting]?.[L] ?? sc.setting}`;
  };
  const where = (p?: Pick) => (p ? camName(p.cam) : t("none"));
  const sec = (ms: number) => {
    const v = (ms / 1000).toFixed(1);
    return `${L ? v.replace(".", ",") : v} s`;
  };
  const rel = (s: number) => `${sec(Math.abs(s) * 1000)} ${s >= 0 ? t("beforeAct") : t("afterAct")} ${mcase.harmAct[L]}`;

  return (
    <div className="sg__control">
      <div className="sg__monitor">
        {mcase.cams.map((sc, k) => (
          <canvas
            key={sc.id}
            ref={(el) => {
              canvases.current[k] = el;
            }}
            className="sg__canvas sg__cam"
            data-active={k === cam ? "1" : "0"}
            tabIndex={k === cam ? 0 : -1}
            role="application"
            aria-hidden={k !== cam}
            aria-label={`${camName(k)}: ${sc.cast.length} ${t("people")}. ${t("keys")}`}
            onPointerDown={onPointer(k)}
            onKeyDown={onKey(k)}
          />
        ))}
        <span key={stat} className={`sg__static${reduce ? " sg__static--off" : ""}`} aria-hidden />
        {list && (
          <div className="sg__rosterpane" role="dialog" aria-label={t("list")}>
            <ul>
              {mcase.roster.map((m) => (
                <li key={m.id}>
                  <b>{m.name}</b> <small>{m.role[L]}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sg__cams" role="tablist" aria-label="Cameras">
        {mcase.cams.map((sc, k) => (
          <button key={sc.id} type="button" role="tab" aria-selected={k === cam} className="sg__cambtn" onClick={() => switchTo(k)}>
            <span className="sg__camdot" aria-hidden />
            <b>{camName(k)}</b>
            <small>
              {sc.cast.length} {t("people")}
            </small>
          </button>
        ))}
        <button type="button" className="sg__cambtn sg__cambtn--list" aria-pressed={list} onClick={() => setList((v) => !v)}>
          <b>{list ? t("hideList") : t("list")}</b>
        </button>
      </div>

      {!result && (
        <>
          {pending ? (
            <div className="sg__lock" role="group" aria-label={t("lockAs")}>
              <p>
                {t("selected")} <b>{camName(pending.cam)}</b>. {t("lockAs")}
              </p>
              <div className="sg__lock-btns">
                <button type="button" className="lp-btn" onClick={() => lock("intruder")}>
                  🔒 {t("intruderLong")}
                </button>
                <button type="button" className="lp-btn sg__lock-harm" onClick={() => lock("harm")}>
                  🔒 {t("harm")}
                </button>
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => setPending(null)}>
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <p className="sg__live">{t("tap")}</p>
          )}
          <ul className="sg__locks">
            <li data-on={locks.intruder ? "1" : "0"}>
              <span className="sg__lock-chip sg__lock-chip--i">{t("intruder")}</span> {locks.intruder ? `${t("locked")} ${where(locks.intruder)}` : t("none")}
              {locks.intruder && (
                <button type="button" className="sg__lock-clear" onClick={() => setLocks((l) => ({ ...l, intruder: undefined }))}>
                  {t("clear")}
                </button>
              )}
            </li>
            <li data-on={locks.harm ? "1" : "0"}>
              <span className="sg__lock-chip sg__lock-chip--h">{t("harm")}</span> {locks.harm ? `${t("locked")} ${where(locks.harm)}` : t("none")}
              {locks.harm && (
                <button type="button" className="sg__lock-clear" onClick={() => setLocks((l) => ({ ...l, harm: undefined }))}>
                  {t("clear")}
                </button>
              )}
            </li>
          </ul>
          <div className="sg__actions">
            <button type="button" className="lp-btn" disabled={!locks.intruder || !locks.harm} onClick={submit}>
              {locks.intruder && locks.harm ? t("submit") : t("needTwo")}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="sg__result" role="status">
          <p className={result.intruderOk ? "sg__ok" : "sg__bad"}>
            {t("intruder")}: {result.intruderOk ? t("right") : `${t("wrong")} — ${t("wasOn")} ${camName(mcase.intruder.cam)}`}
          </p>
          <p className={result.harmOk ? "sg__ok" : "sg__bad"}>
            {t("harm")}: {result.harmOk ? t("right") : `${t("wrong")} — ${t("wasOn")} ${camName(mcase.harm.cam)}`}
          </p>
          <p className="sg__times">
            {t("you")} ({t("oneCam")}): <b>{sec(result.human_ms)}</b>
            {result.human_lead_s !== null ? ` · ${rel(result.human_lead_s)}` : ""}
          </p>
          <p className="sg__times">
            {t("system")} ({t("allCams")}): {t("intrAlert")} <b>+{sec(result.intruder_ms)}</b>, {t("harmAlert")} <b>+{sec(result.harm_ms)}</b>
            {result.lead_s !== null ? ` · ${rel(result.lead_s)}` : ""}
            {result.projected ? ` (${t("estimated")})` : ""}
          </p>
          <p className="sg__review">{t("reveal")}</p>
          {footer}
        </div>
      )}
    </div>
  );
}
