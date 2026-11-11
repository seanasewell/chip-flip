// Lineup rules engine. Every function is pure: it takes a MatchState and
// returns a new one. Timing, animation, AI scheduling and persistence live
// in the UI controller.
//
// Rules
//  - Each card shows on two board spaces; play it to put a chip on either.
//  - Two-eyed jacks (♦ ♣) are wild: a chip on any open space.
//  - One-eyed jacks (♠ ♥) remove an opponent's chip that isn't part of a
//    completed sequence. You don't place a chip that turn.
//  - Corners are free spaces that count for everyone.
//  - Five in a straight line is a sequence. Two sequences of the same
//    player may share one space.
//  - Win with two sequences (one with three players or three teams).
//  - A dead card (both its spaces taken) can be swapped for a new card
//    once per turn, before playing.
//  - After playing, draw a card. An empty deck is refilled by shuffling
//    the discards.

import { MODES, WINDOWS, cardFace, cellsForCard, counts, isCorner, isJack, isRemoveJack, isWildJack, longestRun, DIRECTIONS, cellAt } from "./board";
import { nextRandom } from "./rng";
import {
  BOARD_SIZE,
  CELL_COUNT,
  DECK_SIZE,
  SEQ_LENGTH,
  type Action,
  type CardId,
  type MatchConfig,
  type MatchState,
  type MoveError,
  type MoveOutcome,
  type Sequence,
  type Seat,
  type Side,
} from "./types";

const SIDE_NAMES = ["blue", "pink", "orange"];

export function makeId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function shuffle<T>(arr: T[], rng: number): [T[], number] {
  const a = arr.slice();
  let s = rng;
  for (let i = a.length - 1; i > 0; i--) {
    const [r, n] = nextRandom(s);
    s = n;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a, s];
}

export function createMatch(config: MatchConfig, now = Date.now()): MatchState {
  const mode = MODES[config.mode];
  if (config.seats.length !== mode.players) throw new Error(`${mode.name} needs ${mode.players} players`);
  // Seats are given in table order; team members alternate around the table.
  const seats = config.seats.map((s, i) => ({ ...s, side: i % mode.sides }));
  const sides: Side[] = Array.from({ length: mode.sides }, (_, i) => ({
    index: i,
    seats: seats.filter((s) => s.side === i).map((s) => s.id),
    name: mode.teams ? `Team ${SIDE_NAMES[i]}` : seats.find((s) => s.side === i)!.name,
  }));
  let [deck, rng] = shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i), config.seed >>> 0);
  const hands: Record<string, CardId[]> = {};
  for (const s of seats) {
    hands[s.id] = deck.slice(0, mode.hand);
    deck = deck.slice(mode.hand);
  }
  const [r, next] = nextRandom(rng);
  rng = next;
  return {
    v: 2,
    id: makeId(),
    mode: config.mode,
    seats,
    sides,
    order: seats.map((s) => s.id),
    turn: Math.floor(r * seats.length),
    board: Array(CELL_COUNT).fill(null),
    sequences: [],
    deck,
    discard: [],
    hands,
    swapped: false,
    moves: [],
    moveCounter: 0,
    passes: 0,
    phase: "playing",
    winnerSide: null,
    ending: null,
    forfeitedBy: null,
    rng,
    startedAt: now,
    endedAt: null,
  };
}

export const currentSeatId = (s: MatchState) => s.order[s.turn];
export const seatById = (s: MatchState, id: string) => s.seats.find((x) => x.id === id)!;
export const sideOfSeat = (s: MatchState, id: string) => seatById(s, id).side;
export const toWin = (s: MatchState) => MODES[s.mode].toWin;
export const sequenceCount = (s: MatchState, side: number) => s.sequences.filter((q) => q.side === side).length;

/** Spaces that belong to completed sequences (they can't be removed). */
export function lockedCells(s: MatchState): Set<number> {
  return new Set(s.sequences.flatMap((q) => q.cells));
}

/** Both of this card's spaces are taken. Jacks are never dead. */
export function isDead(s: MatchState, card: CardId): boolean {
  if (isJack(card)) return false;
  return cellsForCard(card).every((c) => s.board[c] !== null);
}

/** Spaces the card can target right now for `seatId`. */
export function targetsFor(s: MatchState, seatId: string, card: CardId): number[] {
  const side = sideOfSeat(s, seatId);
  if (isWildJack(card)) {
    const out: number[] = [];
    for (let c = 0; c < CELL_COUNT; c++) if (!isCorner(c) && s.board[c] === null) out.push(c);
    return out;
  }
  if (isRemoveJack(card)) {
    const locked = lockedCells(s);
    const out: number[] = [];
    for (let c = 0; c < CELL_COUNT; c++) if (s.board[c] !== null && s.board[c] !== side && !locked.has(c)) out.push(c);
    return out;
  }
  return cellsForCard(card).filter((c) => s.board[c] === null);
}

export function canSwap(s: MatchState, seatId: string, card: CardId) {
  return !s.swapped && (s.hands[seatId] ?? []).includes(card) && isDead(s, card) && s.deck.length + s.discard.length > 0;
}

/** Whether the seat has anything it can do this turn. */
export function hasAnyAction(s: MatchState, seatId: string): boolean {
  return (s.hands[seatId] ?? []).some((card) => targetsFor(s, seatId, card).length > 0 || canSwap(s, seatId, card));
}

export function validate(s: MatchState, seatId: string, a: Action): MoveError | null {
  if (s.phase !== "playing") return "not-playing";
  if (currentSeatId(s) !== seatId) return "not-your-turn";
  if (!(s.hands[seatId] ?? []).includes(a.card)) return "card-not-in-hand";
  if (a.kind === "swap") {
    if (s.swapped) return "already-swapped";
    return isDead(s, a.card) ? null : "not-dead";
  }
  if (a.kind === "remove") {
    if (!isRemoveJack(a.card)) return "wrong-space";
    return targetsFor(s, seatId, a.card).includes(a.cell) ? null : "not-removable";
  }
  if (isRemoveJack(a.card)) return "wrong-space";
  if (s.board[a.cell] !== null || isCorner(a.cell)) return "occupied";
  return targetsFor(s, seatId, a.card).includes(a.cell) ? null : "wrong-space";
}

/** Draws the top card, reshuffling the discards when the deck runs out. */
function draw(s: MatchState, seatId: string): MatchState {
  let { deck, discard, rng } = s;
  if (!deck.length && discard.length) {
    [deck, rng] = shuffle(discard, rng);
    discard = [];
  }
  if (!deck.length) return { ...s, deck, discard, rng };
  return { ...s, deck: deck.slice(1), discard, rng, hands: { ...s.hands, [seatId]: [...s.hands[seatId], deck[0]] } };
}

function discardFromHand(s: MatchState, seatId: string, card: CardId): MatchState {
  return { ...s, hands: { ...s.hands, [seatId]: s.hands[seatId].filter((c) => c !== card) }, discard: [...s.discard, card] };
}

/** New sequences made by `side` placing on `cell`. Two sequences may share
 *  at most one space, including with sequences already on the board. */
export function findNewSequences(board: (number | null)[], existing: Sequence[], side: number, cell: number, seat: string): Sequence[] {
  const found: Sequence[] = [];
  const r0 = Math.floor(cell / BOARD_SIZE);
  const c0 = cell % BOARD_SIZE;
  const inside = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  for (const [dir, dr, dc] of DIRECTIONS) {
    let r = r0;
    let c = c0;
    while (inside(r - dr, c - dc) && counts(board, cellAt(r - dr, c - dc), side)) {
      r -= dr;
      c -= dc;
    }
    const run: number[] = [];
    while (inside(r, c) && counts(board, cellAt(r, c), side)) {
      run.push(cellAt(r, c));
      r += dr;
      c += dc;
    }
    if (run.length < SEQ_LENGTH) continue;
    const mine = [...existing.filter((q) => q.side === side && q.dir === dir), ...found.filter((q) => q.dir === dir)];
    for (let start = 0; start + SEQ_LENGTH <= run.length; start++) {
      const cells = run.slice(start, start + SEQ_LENGTH);
      if (!cells.includes(cell)) continue;
      const ok = mine.every((q) => q.cells.filter((x) => cells.includes(x)).length <= 1);
      if (!ok) continue;
      const seq: Sequence = { side, cells, dir, seat };
      found.push(seq);
      mine.push(seq);
    }
  }
  return found;
}

export function play(state: MatchState, seatId: string, a: Action): MoveOutcome {
  const err = validate(state, seatId, a);
  if (err) return { ok: false, error: err };
  const side = sideOfSeat(state, seatId);
  const n = state.moveCounter + 1;

  if (a.kind === "swap") {
    let s = discardFromHand({ ...state, swapped: true, moveCounter: n }, seatId, a.card);
    s = draw(s, seatId);
    s = { ...s, moves: [...s.moves, { seat: seatId, side, action: a, n, newSequences: 0 }] };
    // Nothing playable even after the swap: the turn passes.
    if (!hasAnyAction(s, seatId)) s = advance({ ...s, passes: s.passes + 1 });
    return { ok: true, state: s, sequences: [] };
  }

  const board = state.board.slice();
  let newSeqs: Sequence[] = [];
  if (a.kind === "remove") board[a.cell] = null;
  else {
    board[a.cell] = side;
    newSeqs = findNewSequences(board, state.sequences, side, a.cell, seatId);
  }
  let s: MatchState = discardFromHand({ ...state, board, moveCounter: n, passes: 0 }, seatId, a.card);
  s = draw(s, seatId);
  s = {
    ...s,
    sequences: [...s.sequences, ...newSeqs],
    moves: [...s.moves, { seat: seatId, side, action: a, n, newSequences: newSeqs.length }].slice(-400),
  };
  if (newSeqs.length && sequenceCount(s, side) >= toWin(s)) {
    return { ok: true, state: { ...s, phase: "over", winnerSide: side, ending: "sequences", endedAt: Date.now() }, sequences: newSeqs };
  }
  return { ok: true, state: advance(s), sequences: newSeqs };
}

/** Next seat. A seat with no possible action passes; if every seat in a
 *  row has to pass, the game ends and the side with the most sequences
 *  (then the longest line) wins. */
function advance(s: MatchState): MatchState {
  let st: MatchState = { ...s, swapped: false };
  for (let k = 0; k < st.order.length; k++) {
    st = { ...st, turn: (st.turn + 1) % st.order.length };
    if (hasAnyAction(st, currentSeatId(st))) return st;
    st = { ...st, passes: st.passes + 1 };
  }
  return endStalemate(st);
}

function endStalemate(s: MatchState): MatchState {
  const ranked = s.sides
    .map((sd) => ({ side: sd.index, seq: sequenceCount(s, sd.index), run: longestRun(s.board, sd.index) }))
    .sort((a, b) => b.seq - a.seq || b.run - a.run || a.side - b.side);
  return { ...s, phase: "over", winnerSide: ranked[0].side, ending: "stalemate", endedAt: Date.now() };
}

/** Ends the match early; the forfeiting seat's side loses. With three
 *  sides, the remaining side with more sequences takes it. */
export function forfeit(s: MatchState, seatId: string): MatchState {
  if (s.phase === "over") return s;
  const loser = sideOfSeat(s, seatId);
  const idx = s.order.indexOf(seatId);
  const candidates: number[] = [];
  for (let k = 1; k <= s.order.length; k++) {
    const side = sideOfSeat(s, s.order[(idx + k) % s.order.length]);
    if (side !== loser && !candidates.includes(side)) candidates.push(side);
  }
  const best = Math.max(...candidates.map((c) => sequenceCount(s, c)));
  const winner = candidates.find((c) => sequenceCount(s, c) === best)!;
  return { ...s, phase: "over", winnerSide: winner, ending: "forfeit", forfeitedBy: seatId, endedAt: Date.now() };
}

export { WINDOWS, cardFace };
export type { Seat };
