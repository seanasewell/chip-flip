import { test } from "node:test";
import assert from "node:assert/strict";
import { nextRating, ratingToSkill, START_RATING } from "../skill";
import { chooseBySkill } from "../core/ai";
import { createMatch, currentSeatId } from "../core/engine";
import type { Seat } from "../core/types";

test("winning raises the rating, losing lowers it", () => {
  assert.ok(nextRating(START_RATING, START_RATING, true) > START_RATING);
  assert.ok(nextRating(START_RATING, START_RATING, false) < START_RATING);
  // Beating a stronger opponent is worth more than beating a weaker one.
  assert.ok(nextRating(1000, 1200, true) - 1000 > nextRating(1000, 800, true) - 1000);
});

test("rating maps to a strength between 0 and 1, rising with rating", () => {
  assert.equal(ratingToSkill(0), 0);
  assert.equal(ratingToSkill(5000), 1);
  assert.ok(ratingToSkill(1200) > ratingToSkill(1000));
});

test("skill-blended computer always finds a legal move", () => {
  const seats: Seat[] = [
    { id: "you", name: "You", kind: "you", side: 0, glyph: "Y", hue: 0 },
    { id: "s1", name: "Bot", kind: "bot", side: 1, glyph: "B", hue: 0, skill: 0.5 },
  ];
  const m = createMatch({ mode: "h2h", seats, seed: 7 });
  const seat = currentSeatId(m);
  for (const k of [0, 0.3, 0.7, 1]) assert.ok(chooseBySkill(m, seat, k, () => 0.42));
});
