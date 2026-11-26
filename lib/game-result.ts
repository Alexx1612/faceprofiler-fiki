/**
 * "Spot the stranger" results, shared with the quick survey.
 *
 * Methodology: sessionStorage key "nauino-game" holds a JSON array with the latest result per round
 * (rounds 1-2: find the unknown person among 3 and 14 remembered people; round 3: who is about to cause
 * harm, about 15 people with decoys, behaviour; round 4: the control room, 4 cameras, the intruder and the
 * person about to cause harm, both locked in). human_ms and machine_ms share one basis: from the unknown
 * person's first appearance (rounds 1-2) or from the start of the round (rounds 3-4); machine_ms is the
 * system time modelled on Nau-ino's measurements. lead_ms / human_lead_ms: how long before the harmful
 * act the system alerted / the visitor tapped (negative = after it). Reads and writes are wrapped in try/catch: private windows and blocked storage
 * must not break the page. After saving, `nauino:game-result` is dispatched on window so a mounted
 * listener (the survey dialog) re-reads the key without polling.
 */

export type GameResult = {
  round: 1 | 2 | 3 | 4;
  people: number;
  human_ms: number;
  machine_ms: number;
  correct: boolean;
  lead_ms?: number;
  human_lead_ms?: number;
  scenario?: string;
};

export const GAME_KEY = "nauino-game";
export const GAME_EVENT = "nauino:game-result";

export function loadGameResults(): GameResult[] {
  try {
    const raw = sessionStorage.getItem(GAME_KEY);
    const list = raw ? (JSON.parse(raw) as GameResult[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveGameResult(r: GameResult) {
  try {
    const list = loadGameResults().filter((x) => x.round !== r.round);
    list.push(r);
    list.sort((a, b) => a.round - b.round);
    sessionStorage.setItem(GAME_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: the event still fires */
  }
  window.dispatchEvent(new CustomEvent(GAME_EVENT));
}

/** Where the player is: the round to play next (1-4), or 5 when all four are done. */
export const PROGRESS_KEY = "nauino-game-progress";
export type GameProgress = { round: number; at: number };

export function loadProgress(): GameProgress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    const p = raw ? (JSON.parse(raw) as GameProgress) : null;
    return p && typeof p.round === "number" ? p : null;
  } catch {
    return null;
  }
}

export function saveProgress(round: number) {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ round, at: Date.now() }));
  } catch {
    /* storage blocked: resume just starts at round 1 */
  }
  window.dispatchEvent(new CustomEvent(GAME_EVENT));
}

/** Forget all rounds and the saved position, so the game starts again from round 1. */
export function resetGame() {
  try {
    sessionStorage.removeItem(GAME_KEY);
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
  window.dispatchEvent(new CustomEvent(GAME_EVENT));
}
