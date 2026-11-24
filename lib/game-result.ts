/**
 * "Spot the stranger" results, shared with the quick survey.
 *
 * Methodology: sessionStorage key "nauino-game" holds a JSON array with the latest result per round
 * (round 1 and round 2). Reads and writes are wrapped in try/catch: private windows and blocked storage
 * must not break the page. After saving, `nauino:game-result` is dispatched on window so a mounted
 * listener (the survey dialog) re-reads the key without polling.
 */

export type GameResult = {
  round: 1 | 2;
  people: number;
  human_ms: number;
  machine_ms: number;
  correct: boolean;
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
