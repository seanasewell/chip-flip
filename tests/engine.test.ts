import { test } from "node:test";
import assert from "node:assert/strict";
import { CORNERS, LAYOUT, MODES, WINDOWS, cardFace, cellAt, cellsForCard, faceKey, isCorner } from "../src/core/board";
import { createMatch, currentSeatId, forfeit, isDead, lockedCells, play, sequenceCount, targetsFor, validate } from "../src/core/engine";
import { chooseAction, seededRand } from "../src/core/ai";
import { CELL_COUNT, DECK_SIZE, type GameModeId, type MatchState, type Seat } from "../src/core/types";

const seat = (id: string, kind: Seat["kind"] = "bot"): Seat => ({ id, name: id, kind, side: 0, glyph: id[0], hue: 10, difficulty: "medium" });

function match(mode: GameModeId = "h2h", seed = 7): MatchState {
  const n = MODES[mode].players;
  const seats = Array.from({ length: n }, (_, i) => seat(i === 0 ? "you" : `p${i}`, i === 0 ? "you" : "bot"));
  return createMatch({ mode, seats, seed });
}

/** A card id whose face matches the space. */
const cardFor = (cell: number) => [...Array(52).keys()].find((id) => LAYOUT[cell] && faceKey(cardFace(id)) === faceKey(LAYOUT[cell]!))!;
const WILD = 13 * 2 + 10; // jack of diamonds
const REMOVE = 10; // jack of spades

/** Gives the current seat `card` and plays it. */
function act(s: MatchState, a: { kind: "place" | "remove"; card: number; cell: number }): MatchState {
  const id = currentSeatId(s);
  const hand = [a.card, ...s.hands[id].filter((c) => c !== a.card)];
  const r = play({ ...s, hands: { ...s.hands, [id]: hand } }, id, a);
  assert.ok(r.ok, `move failed: ${!r.ok && r.error}`);
  return (r as any).state;
}
const put = (s: MatchState, cell: number) => act(s, { kind: "place", card: cardFor(cell), cell });

/** The seat to move places at `mine`, others fill from `filler`. */
function script(s: MatchState, me: string, mine: number[], filler: number[]) {
  let f = 0;
  // Filler moves for other seats: listed cells first, then any empty space
  // away from the cells under test.
  const next = () => {
    while (f < filler.length && s.board[filler[f]] !== null) f++;
    if (f < filler.length) return filler[f++];
    for (let c = CELL_COUNT - 1; c >= 0; c--) if (!isCorner(c) && s.board[c] === null && !mine.includes(c) && Math.floor(c / 10) >= 8) return c;
    throw new Error("no filler");
  };
  for (const c of mine) {
    while (currentSeatId(s) !== me) s = put(s, next());
    s = put(s, c);
    if (s.phase !== "playing") break;
  }
  return s;
}
const FILL = [cellAt(9, 2), cellAt(9, 4), cellAt(9, 6), cellAt(7, 1), cellAt(7, 5), cellAt(7, 8), cellAt(5, 0), cellAt(5, 9), cellAt(9, 8), cellAt(8, 3)];

test("board: 96 card spaces, each non-jack card twice, four free corners", () => {
  assert.equal(CORNERS.length, 4);
  CORNERS.forEach((c) => assert.equal(LAYOUT[c], null));
  const counts = new Map<string, number>();
  LAYOUT.forEach((f) => f && counts.set(faceKey(f), (counts.get(faceKey(f)) ?? 0) + 1));
  assert.equal(counts.size, 48);
  assert.ok([...counts.values()].every((n) => n === 2));
  assert.ok(![...counts.keys()].some((k) => k.startsWith("J")));
  assert.equal(WINDOWS.length, 192);
});

test("deal: hand sizes per mode and a 104-card shoe", () => {
  for (const mode of Object.keys(MODES) as GameModeId[]) {
    const s = match(mode);
    for (const id of s.order) assert.equal(s.hands[id].length, MODES[mode].hand);
    const total = s.deck.length + s.order.reduce((a, id) => a + s.hands[id].length, 0);
    assert.equal(total, DECK_SIZE);
  }
});

test("teams sit alternately", () => {
  const s = match("teams3v3");
  assert.deepEqual(s.order.map((id) => s.seats.find((x) => x.id === id)!.side), [0, 1, 0, 1, 0, 1]);
  const t = match("teams3");
  assert.deepEqual(t.order.map((id) => t.seats.find((x) => x.id === id)!.side), [0, 1, 2, 0, 1, 2]);
});

test("a card claims only its own spaces; occupied, corners and out-of-turn are refused", () => {
  let s = match();
  const me = currentSeatId(s);
  const other = s.order.find((x) => x !== me)!;
  const cell = cellAt(4, 4);
  const card = cardFor(cell);
  const wrong = [...Array(CELL_COUNT).keys()].find((c) => !isCorner(c) && !cellsForCard(card).includes(c))!;
  const sh = { ...s, hands: { ...s.hands, [me]: [card], [other]: [card] } };
  assert.equal(validate(sh, me, { kind: "place", card, cell: wrong }), "wrong-space");
  assert.equal(validate(sh, other, { kind: "place", card, cell }), "not-your-turn");
  assert.equal(validate(sh, me, { kind: "place", card: WILD, cell: CORNERS[0] }), "card-not-in-hand");
  s = put(s, cell);
  const nxt = currentSeatId(s);
  assert.equal(validate({ ...s, hands: { ...s.hands, [nxt]: [card] } }, nxt, { kind: "place", card, cell }), "occupied");
});

test("two-eyed jack places anywhere open (not corners)", () => {
  const s = match();
  const me = currentSeatId(s);
  const t = targetsFor(s, me, WILD);
  assert.equal(t.length, 96);
  assert.ok(!t.some(isCorner));
});

test("one-eyed jack removes an opponent chip, never your own or a locked one", () => {
  let s = match();
  s = put(s, cellAt(3, 3)); // seat A
  const b = currentSeatId(s);
  const removable = targetsFor(s, b, REMOVE);
  assert.deepEqual(removable, [cellAt(3, 3)]);
  s = act(s, { kind: "remove", card: REMOVE, cell: cellAt(3, 3) });
  assert.equal(s.board[cellAt(3, 3)], null);
  // own chips are not targets
  const a = currentSeatId(s);
  s = put(s, cellAt(6, 6));
  assert.ok(!targetsFor({ ...s, turn: s.order.indexOf(a) }, a, REMOVE).includes(cellAt(6, 6)));
});

for (const [name, cells] of [
  ["horizontal", [cellAt(4, 2), cellAt(4, 3), cellAt(4, 4), cellAt(4, 5), cellAt(4, 6)]],
  ["vertical", [cellAt(1, 7), cellAt(2, 7), cellAt(3, 7), cellAt(4, 7), cellAt(5, 7)]],
  ["diagonal", [cellAt(2, 2), cellAt(3, 3), cellAt(4, 4), cellAt(5, 5), cellAt(6, 6)]],
  ["anti-diagonal", [cellAt(1, 6), cellAt(2, 5), cellAt(3, 4), cellAt(4, 3), cellAt(5, 2)]],
] as const) {
  test(`detects a ${name} sequence of five`, () => {
    let s = match();
    const me = currentSeatId(s);
    s = script(s, me, [...cells], FILL);
    const side = s.seats.find((x) => x.id === me)!.side;
    assert.equal(sequenceCount(s, side), 1);
    assert.deepEqual([...s.sequences[0].cells].sort(), [...cells].sort());
    assert.equal(s.phase, "playing", "one sequence is not enough in head to head");
  });
}

test("corners count as free spaces in a sequence", () => {
  let s = match();
  const me = currentSeatId(s);
  s = script(s, me, [cellAt(0, 1), cellAt(0, 2), cellAt(0, 3), cellAt(0, 4)], FILL);
  assert.equal(s.sequences.length, 1);
  assert.ok(s.sequences[0].cells.includes(cellAt(0, 0)));
});

test("four in a row with a gap is not a sequence; a blocker stops it", () => {
  let s = match();
  const me = currentSeatId(s);
  s = script(s, me, [cellAt(5, 1), cellAt(5, 2), cellAt(5, 3), cellAt(5, 5)], FILL);
  assert.equal(s.sequences.length, 0);
  // opponent blocks the gap
  while (currentSeatId(s) === me) s = put(s, cellAt(8, 8));
  s = put(s, cellAt(5, 4));
  assert.equal(s.sequences.length, 0);
});

test("two sequences may share one space and win head to head", () => {
  let s = match();
  const me = currentSeatId(s);
  // row 6 cols 1-9: placing the middle last makes two sequences sharing col 5
  s = script(s, me, [cellAt(6, 1), cellAt(6, 2), cellAt(6, 3), cellAt(6, 4), cellAt(6, 6), cellAt(6, 7), cellAt(6, 8), cellAt(6, 9), cellAt(6, 5)], FILL);
  assert.equal(s.phase, "over");
  assert.equal(s.ending, "sequences");
  assert.equal(sequenceCount(s, s.winnerSide!), 2);
  const [a, b] = s.sequences;
  assert.equal(a.cells.filter((c) => b.cells.includes(c)).length, 1);
});

test("a sequence can't reuse more than one space of an existing one", () => {
  let s = match();
  const me = currentSeatId(s);
  s = script(s, me, [cellAt(3, 1), cellAt(3, 2), cellAt(3, 3), cellAt(3, 4), cellAt(3, 5)], FILL);
  assert.equal(s.sequences.length, 1);
  s = script(s, me, [cellAt(3, 6)], FILL); // run of 6: new window would share 4
  assert.equal(s.sequences.length, 1);
  assert.equal(s.phase, "playing");
});

test("one sequence wins with three players or three teams", () => {
  for (const mode of ["ffa3", "teams3"] as const) {
    let s = match(mode);
    const me = currentSeatId(s);
    s = script(s, me, [cellAt(4, 2), cellAt(4, 3), cellAt(4, 4), cellAt(4, 5), cellAt(4, 6)], FILL);
    assert.equal(s.phase, "over", mode);
  }
});

test("locked chips in a sequence can't be removed", () => {
  let s = match();
  const me = currentSeatId(s);
  s = script(s, me, [cellAt(4, 2), cellAt(4, 3), cellAt(4, 4), cellAt(4, 5), cellAt(4, 6)], FILL);
  const locked = lockedCells(s);
  const opp = s.order.find((x) => s.seats.find((y) => y.id === x)!.side !== s.seats.find((y) => y.id === me)!.side)!;
  const t = targetsFor({ ...s, turn: s.order.indexOf(opp) }, opp, REMOVE);
  assert.ok(!t.some((c) => locked.has(c)));
});

test("dead cards can be swapped once per turn", () => {
  let s = match();
  const target = cellAt(2, 8);
  const card = cardFor(target);
  const [c1, c2] = cellsForCard(card);
  s = put(s, c1);
  s = put(s, c2);
  const me = currentSeatId(s);
  s = { ...s, hands: { ...s.hands, [me]: [card, card + 52, ...s.hands[me].slice(2)] } };
  assert.ok(isDead(s, card));
  const r = play(s, me, { kind: "swap", card });
  assert.ok(r.ok);
  const s2 = (r as any).state as MatchState;
  assert.equal(currentSeatId(s2), me, "swapping does not end the turn");
  assert.equal(s2.hands[me].length, s.hands[me].length);
  assert.equal(validate(s2, me, { kind: "swap", card: card + 52 }), "already-swapped");
});

test("an empty deck is refilled from the discards", () => {
  let s = match();
  s = { ...s, discard: s.deck.slice(0, 20), deck: [] };
  s = put(s, cellAt(5, 5));
  assert.ok(s.deck.length > 0);
});

test("AI plays only legal actions and finishes every mode", () => {
  for (const mode of Object.keys(MODES) as GameModeId[]) {
    for (let seed = 1; seed <= 6; seed++) {
      let s = match(mode, seed);
      const rand = seededRand(seed);
      let guard = 0;
      while (s.phase === "playing" && guard++ < 2000) {
        const id = currentSeatId(s);
        const diff = (["easy", "medium", "hard"] as const)[guard % 3];
        const a = chooseAction(s, id, diff, rand)!;
        assert.ok(a, "AI found no action");
        assert.equal(validate(s, id, a), null);
        const r = play(s, id, a);
        s = (r as any).state;
      }
      assert.equal(s.phase, "over", `${mode} seed ${seed}`);
      assert.ok(s.winnerSide !== null);
    }
  }
});

test("AI completes a sequence and blocks a four", () => {
  let s = match();
  const me = currentSeatId(s);
  s = script(s, me, [cellAt(7, 2), cellAt(7, 3), cellAt(7, 4), cellAt(7, 6)], [cellAt(1, 1), cellAt(1, 3), cellAt(1, 5), cellAt(1, 7)]);
  // opponent to move? make it my turn with the finishing card
  while (currentSeatId(s) !== me) s = put(s, cellAt(2, 2));
  const fin = cardFor(cellAt(7, 5));
  s = { ...s, hands: { ...s.hands, [me]: [fin, ...s.hands[me].slice(1)] } };
  const a = chooseAction(s, me, "medium")!;
  assert.equal(a.kind === "place" && a.cell, cellAt(7, 5));
});

test("forfeit ends the match as a loss for the forfeiting side", () => {
  const s = forfeit(match(), "you");
  assert.equal(s.phase, "over");
  assert.equal(s.forfeitedBy, "you");
  assert.notEqual(s.winnerSide, 0);
});
