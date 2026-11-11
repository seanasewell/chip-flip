import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMatch, blankStats, matchXp, mergeStats, periodRecord, type MatchSummary } from "../progress";
import { summarize } from "../game";
import { createMatch, forfeit, play, currentSeatId } from "../core/engine";
import { LAYOUT, cardFace, cellAt, faceKey } from "../core/board";
import type { MatchState, Seat } from "../core/types";

const base = (): MatchSummary => ({
  matchId: "m1", mode: "h2h", won: true, forfeit: false, sequences: 2, diagonals: 1, wildJacks: 1, removals: 2,
  shutout: true, comeback: false, vsFriend: false, beatHard: false, durationMs: 120000, placement: 1, sides: 2,
});
const blankProgress = () => ({
  xp: 0, stats: blankStats(), days: [] as string[], streak: { current: 0, best: 0, last: "", saves: [] },
  daily: { ids: [], progress: {}, done: {} }, weekly: { ids: [], progress: {}, done: {} },
});

test("a won match updates stats, streak and XP", () => {
  const p = blankProgress();
  applyMatch(p, { matchXp: 0 }, base());
  assert.equal(p.stats.matchesPlayed, 1);
  assert.equal(p.stats.matchWins, 1);
  assert.equal(p.stats.sequences, 2);
  assert.equal(p.stats.removals, 2);
  assert.equal(p.stats.shutouts, 1);
  assert.equal(p.xp, 25 + 2 * 15 + 100);
  assert.equal(p.days.length, 1);
});

test("a loss resets the win streak but keeps the best", () => {
  const p = blankProgress();
  applyMatch(p, { matchXp: 0 }, base());
  applyMatch(p, { matchXp: 0 }, { ...base(), matchId: "m2" });
  applyMatch(p, { matchXp: 0 }, { ...base(), matchId: "m3", won: false, shutout: false, sequences: 1 });
  assert.equal(p.stats.winStreak, 0);
  assert.equal(p.stats.bestWinStreak, 2);
  assert.equal(p.stats.matchLosses, 1);
});

test("forfeits are losses with no XP", () => {
  const m = { ...base(), won: false, forfeit: true, sequences: 0, shutout: false };
  assert.equal(matchXp(m), 0);
  const p = blankProgress();
  applyMatch(p, { matchXp: 0 }, m);
  assert.equal(p.stats.forfeits, 1);
  assert.equal(p.xp, 0);
});

test("guest merge sums counts and keeps the best streak", () => {
  const a = { ...blankStats(), matchesPlayed: 3, bestWinStreak: 2, winStreak: 1, byDay: { "2026-11-01": [3, 2] as [number, number] } };
  const b = { ...blankStats(), matchesPlayed: 5, bestWinStreak: 4, winStreak: 4, byDay: { "2026-11-01": [1, 1] as [number, number] } };
  const m = mergeStats(a, b);
  assert.equal(m.matchesPlayed, 8);
  assert.equal(m.bestWinStreak, 4);
  assert.equal(m.winStreak, 1);
  assert.deepEqual(m.byDay["2026-11-01"], [4, 3]);
});

test("period records come from the same per-day stats", () => {
  const s = { ...blankStats(), matchesPlayed: 9, matchWins: 5, byDay: { "2026-11-09": [2, 1] as [number, number], "2026-10-01": [7, 4] as [number, number] } };
  const now = new Date(2026, 10, 10);
  assert.deepEqual(periodRecord(s, "week", now), { played: 2, wins: 1 });
  assert.deepEqual(periodRecord(s, "all", now), { played: 9, wins: 5 });
});

const seat = (id: string, kind: Seat["kind"], extra: Partial<Seat> = {}): Seat => ({ id, name: id, kind, side: 0, glyph: "x", hue: 0, ...extra });
const cardFor = (cell: number) => [...Array(52).keys()].find((id) => faceKey(cardFace(id)) === faceKey(LAYOUT[cell]!))!;
function put(s: MatchState, cell: number) {
  const id = currentSeatId(s);
  const card = cardFor(cell);
  return (play({ ...s, hands: { ...s.hands, [id]: [card, ...s.hands[id]] } }, id, { kind: "place", card, cell }) as any).state as MatchState;
}

test("summary: comeback after the opponent's first sequence, hard computer beaten", () => {
  let s = createMatch({ mode: "h2h", seed: 3, seats: [seat("you", "you"), seat("cpu", "bot", { difficulty: "hard" })] });
  const opp = "cpu";
  const moves: [string, number][] = [];
  // cpu: row 2 cols 1-5; you: row 6 cols 1-9 (two sequences, middle last)
  const cpu = [cellAt(2, 1), cellAt(2, 2), cellAt(2, 3), cellAt(2, 4), cellAt(2, 5), cellAt(8, 8), cellAt(8, 6), cellAt(8, 4), cellAt(8, 2)];
  const you = [cellAt(6, 1), cellAt(6, 2), cellAt(6, 3), cellAt(6, 4), cellAt(6, 6), cellAt(6, 7), cellAt(6, 8), cellAt(6, 9), cellAt(6, 5)];
  let ci = 0, yi = 0;
  while (s.phase === "playing") s = currentSeatId(s) === opp ? put(s, cpu[ci++]) : put(s, you[yi++]);
  void moves;
  const m = summarize(s, 1000);
  assert.equal(m.won, true);
  assert.equal(m.comeback, true);
  assert.equal(m.shutout, false);
  assert.equal(m.beatHard, true);
  assert.equal(m.sequences, 2);
});

test("summary: forfeit against a friend", () => {
  let f = createMatch({ mode: "h2h", seed: 3, seats: [seat("you", "you"), seat("s1", "local", { friendId: "p1" })] });
  f = forfeit(f, "you");
  const fm = summarize(f, 10);
  assert.equal(fm.vsFriend, true);
  assert.equal(fm.forfeit, true);
  assert.equal(fm.won, false);
});
