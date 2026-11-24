"use client";

import { useEffect, useRef, useState } from "react";

import { sendLead, surveyFormId, track } from "@/lib/analytics";
import { team } from "@/lib/content";
import { useLang } from "@/components/landing/spot-game";
import { roles, ui, visibleQuestions, type Question, type Role } from "@/lib/survey";

const SCALE = [0, 1, 2, 3, 4, 5];
const GAME_KEY = "nauino-game";

type GameRound = { round: number; people: number; human_ms: number; machine_ms: number; correct: boolean };

/** The visitor's "Spot the stranger" results from this tab, if any (written by the game). */
function readGame(): GameRound[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(GAME_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * "Quick survey" button for the landing top bar and the form it opens.
 *
 * Methodology: a native <dialog> holds a Google-Forms-like card (title card, one card per question,
 * required marks, dropdowns and 0-5 scales), full screen on phones. An EN/RO switch (shared with the game) changes every label;
 * stored answers are always the English option text (lib/survey.ts), plus `lang`. Questions depend on
 * the role picked first. If the visitor played the game in this tab, its rounds are attached and one
 * extra question appears. On submit, missing required answers are flagged in place; otherwise the
 * answers go to Formspree (stored, CSV export) and, when PostHog is on, as a `survey_submitted` event
 * without the free text. Without a Formspree ID the e-mail app opens with the answers, like the other
 * landing forms. The dialog also opens from a #survey link.
 */
export function SurveyButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lang, setLang] = useLang();
  const [role, setRole] = useState<Role | "">("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "mailto" | "error">("idle");
  const [error, setError] = useState("");
  const [game, setGame] = useState<GameRound[]>([]);
  const L = lang === "en" ? 0 : 1;
  const shown = visibleQuestions(role, answers, game.length > 0);

  const open = () => {
    setGame(readGame());
    if (!dialog.current?.open) dialog.current?.showModal();
    track("survey_opened");
  };

  useEffect(() => {
    const fromHash = () => {
      if (location.hash === "#survey") open();
    };
    const fromGame = () => setGame(readGame());
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("nauino:game-result", fromGame);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("nauino:game-result", fromGame);
    };
  }, []);

  const set = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setMissing((m) => m.filter((x) => x !== id));
  };

  const reset = () => {
    setRole("");
    setAnswers({});
    setMissing([]);
    setState("idle");
    setError("");
  };

  const onClose = () => {
    if (location.hash === "#survey") history.replaceState(null, "", location.pathname + location.search);
    if (state === "sent" || state === "mailto") reset();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (new FormData(e.currentTarget).get("_gotcha")) return;
    const need = [...(role ? [] : ["role"]), ...shown.filter((q) => q.required && !answers[q.id]).map((q) => q.id)];
    setMissing(need);
    if (need.length) {
      e.currentTarget.querySelector(`[data-q="${need[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const data: Record<string, string> = { lang, role: roles.find((r) => r.id === role)?.label[0] ?? role };
    for (const q of shown) if (answers[q.id]) data[q.id] = answers[q.id];
    for (const g of game) {
      data[`game_r${g.round}`] = `${g.people} people · you ${(g.human_ms / 1000).toFixed(1)} s · machine ${g.machine_ms.toFixed(2)} ms · ${g.correct ? "correct" : "wrong"}`;
    }
    setState("sending");
    try {
      const how = await sendLead("survey", data, surveyFormId);
      const { comment, ...closed } = data;
      track("survey_submitted", { ...closed, has_comment: Boolean(comment), played_game: game.length > 0, via: how });
      if (how === "mailto") {
        const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
        window.location.href = `mailto:${team[1].email}?subject=${encodeURIComponent("Nau-ino quick survey")}&body=${encodeURIComponent(body)}`;
      }
      setState(how === "mailto" ? "mailto" : "sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error && lang === "en" ? err.message : ui.error[L]);
    }
  };

  const done = state === "sent" || state === "mailto";

  return (
    <>
      <button type="button" className="lp-survey-btn" onClick={open} aria-haspopup="dialog" data-track="survey-open">
        <span className="lp-survey-btn__dot" aria-hidden />
        {ui.button[L]} <span className="lp-survey-btn__time">· {ui.time[L]}</span>
      </button>
      <dialog ref={dialog} className="gf" aria-label={ui.title[L]} onClose={onClose} lang={lang}>
        <div className="gf__sheet">
          <div className="gf__card gf__card--head">
            <div className="gf__top">
              <div className="gf__lang" role="group" aria-label="Language / Limba">
                {(["en", "ro"] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button type="button" className="gf__close" aria-label={ui.close[L]} onClick={() => dialog.current?.close()}>
                ×
              </button>
            </div>
            <h2>{ui.title[L]}</h2>
            <p>{ui.intro[L]}</p>
            {game.length > 0 ? (
              <p className="gf__game gf__game--done">✓ {ui.gameDone[L]}</p>
            ) : (
              <a className="gf__game" href="#game" onClick={() => dialog.current?.close()}>
                ▶ {ui.game[L]}
              </a>
            )}
            {!done && <p className="gf__req-note">{ui.required[L]}</p>}
          </div>

          {done ? (
            <div className="gf__card gf__done" role="status">
              <div className="gf__check" aria-hidden>
                ✓
              </div>
              <h3>{state === "sent" ? ui.sentTitle[L] : ui.mailTitle[L]}</h3>
              <p>{state === "sent" ? ui.sentText[L] : ui.mailText[L]}</p>
              <div className="gf__actions">
                <button type="button" className="gf__link" onClick={reset}>
                  {ui.again[L]}
                </button>
                <button type="button" className="gf__btn" onClick={() => dialog.current?.close()}>
                  {ui.close[L]}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <input type="text" name="_gotcha" className="lp-hp" tabIndex={-1} autoComplete="off" aria-hidden />
              <Card id="role" title={ui.role[L]} required missing={missing.includes("role")} missText={ui.missingOne[L]}>
                <select
                  className="gf__select"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    setMissing((m) => m.filter((x) => x !== "role"));
                  }}
                  aria-label={ui.role[L]}
                >
                  <option value="">{ui.choose[L]}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label[L]}
                    </option>
                  ))}
                </select>
              </Card>
              {shown.map((q) => (
                <Card key={q.id} id={q.id} title={q.title[L]} required={q.required} missing={missing.includes(q.id)} missText={ui.missingOne[L]}>
                  <Field q={q} L={L} value={answers[q.id] ?? ""} onChange={(v) => set(q.id, v)} />
                </Card>
              ))}
              {missing.length > 0 && (
                <p className="gf__error" role="alert">
                  {ui.missingAll[L]}
                </p>
              )}
              {state === "error" && (
                <p className="gf__error" role="alert">
                  {error}
                </p>
              )}
              <div className="gf__actions">
                <button type="submit" className="gf__btn" disabled={state === "sending"}>
                  {state === "sending" ? ui.sending[L] : ui.submit[L]}
                </button>
                <button type="button" className="gf__link" onClick={reset}>
                  {ui.clear[L]}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

function Card({
  id,
  title,
  required,
  missing,
  missText,
  children,
}: {
  id: string;
  title: string;
  required?: boolean;
  missing?: boolean;
  missText: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={`gf__card gf__q${missing ? " gf__q--missing" : ""}`} data-q={id}>
      <legend className="gf__title">
        {title}
        {required && <span className="gf__star"> *</span>}
      </legend>
      {children}
      {missing && <p className="gf__miss">{missText}</p>}
    </fieldset>
  );
}

function Field({ q, L, value, onChange }: { q: Question; L: 0 | 1; value: string; onChange: (v: string) => void }) {
  if (q.kind === "select")
    return (
      <select className="gf__select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={q.title[L]}>
        <option value="">{ui.choose[L]}</option>
        {q.options!.map((o) => (
          <option key={o[0]} value={o[0]}>
            {o[L]}
          </option>
        ))}
      </select>
    );
  if (q.kind === "scale")
    return (
      <div className="gf__scale">
        <div className="gf__dots" role="radiogroup" aria-label={q.title[L]}>
          {SCALE.map((n) => (
            <label key={n} className="gf__dot">
              <input type="radio" name={q.id} value={n} checked={value === String(n)} onChange={() => onChange(String(n))} />
              <span>{n}</span>
            </label>
          ))}
        </div>
        <div className="gf__ends">
          <span>{q.ends?.[0][L]}</span>
          <span>{q.ends?.[1][L]}</span>
        </div>
      </div>
    );
  return (
    <input
      className="gf__text"
      value={value}
      maxLength={300}
      placeholder={ui.answer[L]}
      aria-label={q.title[L]}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
