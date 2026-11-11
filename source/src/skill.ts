// Hidden skill rating for ranked play. Never shown to the player: it only
// sets how strong ranked opponents play, so wins and streaks mean something.
import { store } from "./shell";

const KEY = (account: string) => `lu.skill.${account}`;
export const START_RATING = 1000;
const FLOOR = 600;
const K = 32;

export function getRating(account: string): number {
  const v = Number(store.get(KEY(account)));
  return Number.isFinite(v) && v > 0 ? v : START_RATING;
}

export function setRating(account: string, r: number) {
  store.set(KEY(account), String(Math.round(Math.max(FLOOR, r))));
}

/** Opponent strength near the player's own, with a little variety. */
export function opponentRating(r: number, rand: () => number = Math.random): number {
  return r + (rand() - 0.5) * 140;
}

/** Rating to play strength between 0 (gentle) and 1 (sharpest). */
export function ratingToSkill(r: number): number {
  return Math.max(0, Math.min(1, (r - 750) / 900));
}

/** Elo-style update after a ranked match. */
export function nextRating(r: number, opp: number, won: boolean): number {
  const expected = 1 / (1 + 10 ** ((opp - r) / 400));
  return Math.max(FLOOR, r + K * ((won ? 1 : 0) - expected));
}
