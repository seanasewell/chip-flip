// Computer opponents. They see what a human in that seat sees: the board
// and their own hand. They never read other hands, and only choose actions
// the engine would accept from a person.

import { WINDOWS_THROUGH, counts, isCorner, isRemoveJack, isWildJack } from "./board";
import { canSwap, currentSeatId, findNewSequences, sequenceCount, sideOfSeat, targetsFor, toWin } from "./engine";
import { nextRandom } from "./rng";
import { SEQ_LENGTH, type Action, type CellOwner, type Difficulty, type MatchState } from "./types";

export interface ScoredAction {
  action: Action;
  score: number;
}

/** Value of `side` taking `cell`: lines it builds and lines it blocks. */
function placeValue(board: CellOwner[], side: number, cell: number, d: Difficulty) {
  let build = 0;
  let block = 0;
  let blockFour = false;
  for (const w of WINDOWS_THROUGH[cell]) {
    let own = 0;
    const opp = new Map<number, number>();
    for (const c of w.cells) {
      if (c === cell) continue;
      if (isCorner(c)) {
        own++;
        continue;
      }
      const o = board[c];
      if (o === side) own++;
      else if (o !== null) opp.set(o, (opp.get(o) ?? 0) + 1);
    }
    if (opp.size === 0) build += (own + 1) ** (d === "hard" ? 3 : 2) * 4;
    if (opp.size === 1 && own === 0) {
      const [k] = [...opp.values()];
      // corners in the window count for the opponent too
      const corners = w.cells.filter((c) => isCorner(c)).length;
      const theirs = k + corners;
      if (theirs >= SEQ_LENGTH - 1) blockFour = true;
      block += theirs ** 2 * (d === "easy" ? 1 : 6);
    }
  }
  return { build, block, blockFour };
}

export function scoreActions(s: MatchState, seatId: string, d: Difficulty): ScoredAction[] {
  const side = sideOfSeat(s, seatId);
  const out: ScoredAction[] = [];
  const need = toWin(s);
  for (const card of s.hands[seatId] ?? []) {
    if (canSwap(s, seatId, card)) {
      out.push({ action: { kind: "swap", card }, score: 1e7 });
      continue;
    }
    const targets = targetsFor(s, seatId, card);
    if (isRemoveJack(card)) {
      for (const cell of targets) {
        const owner = s.board[cell]!;
        let best = 0;
        for (const w of WINDOWS_THROUGH[cell]) {
          if (!w.cells.every((c) => counts(s.board, c, owner) || s.board[c] === null)) continue;
          const k = w.cells.filter((c) => counts(s.board, c, owner)).length;
          best = Math.max(best, k);
        }
        const score = (best >= SEQ_LENGTH - 1 ? 40000 : best === 3 ? 900 : best * 40) - (d === "hard" ? 700 : 300);
        out.push({ action: { kind: "remove", card, cell }, score });
      }
      continue;
    }
    for (const cell of targets) {
      const board = s.board.slice();
      board[cell] = side;
      const made = findNewSequences(board, s.sequences, side, cell, seatId).length;
      const v = placeValue(s.board, side, cell, d);
      let score = v.build + v.block;
      if (made) score += sequenceCount(s, side) + made >= need ? 1e6 : 100000;
      if (v.blockFour) score += d === "easy" ? 0 : 50000;
      if (isWildJack(card) && !made && !v.blockFour) score -= d === "hard" ? 900 : d === "medium" ? 400 : 0;
      out.push({ action: { kind: "place", card, cell }, score });
    }
  }
  return out;
}

export function chooseAction(s: MatchState, seatId: string, d: Difficulty, rand: () => number = Math.random): Action | null {
  if (currentSeatId(s) !== seatId || s.phase !== "playing") return null;
  const all = scoreActions(s, seatId, d);
  if (!all.length) return null;
  const sorted = all.slice().sort((a, b) => b.score - a.score);
  if (sorted[0].action.kind === "swap") return sorted[0].action;
  if (d === "easy") {
    const win = sorted.find((x) => x.score >= 1e6);
    if (win && rand() < 0.6) return win.action;
    const plain = all.filter((x) => x.action.kind === "place" && !isWildJack(x.action.card));
    if (plain.length && rand() < 0.55) return plain[Math.floor(rand() * plain.length)].action;
    return sorted[0].action;
  }
  if (d === "medium") {
    if (sorted[0].score >= 40000) return sorted[0].action;
    const top = sorted.filter((x) => x.score >= sorted[0].score - Math.abs(sorted[0].score) * 0.15);
    return top[Math.floor(rand() * top.length)].action;
  }
  return sorted[0].action;
}

/** Ranked play: blends the three styles by a strength from 0 to 1, so
 *  opponents can get gradually sharper. */
export function chooseBySkill(s: MatchState, seatId: string, skill: number, rand: () => number = Math.random): Action | null {
  const k = Math.max(0, Math.min(1, skill));
  const pHard = k * k;
  const pEasy = (1 - k) * (1 - k) * 0.9;
  const r = rand();
  const d: Difficulty = r < pHard ? "hard" : r < pHard + pEasy ? "easy" : "medium";
  return chooseAction(s, seatId, d, rand);
}

/** Deterministic random source for tests and replays. */
export function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    const [r, n] = nextRandom(s);
    s = n;
    return r;
  };
}
