import type { Suit } from "../core/types";

export interface SideColor {
  name: string;
  base: string;
  light: string;
  dark: string;
  /** Color of the symbol on the chip. */
  mark: string;
  /** Shape drawn on the chip so sides differ by more than color. */
  marker: "ring" | "diamond" | "triangle" | "square";
}

// Lineup chips: electric blue, hot pink and orange. Sequence has at most three sides.
export const SIDE_COLORS: SideColor[] = [
  { name: "Blue", base: "#3355FF", light: "#C9D2FF", dark: "#1F3AD6", mark: "#FFFFFF", marker: "ring" },
  { name: "Pink", base: "#FF2E93", light: "#FFC2DF", dark: "#D1146E", mark: "#FFFFFF", marker: "diamond" },
  { name: "Orange", base: "#EA5B0C", light: "#FFD2B3", dark: "#C4520A", mark: "#FFFFFF", marker: "triangle" },
];

/** Which palette color each side uses in the match on screen. Players pick
 *  these in setup; the default is blue, pink, orange. */
const IDENTITY = [0, 1, 2];
let sideMap: number[] = IDENTITY;
export function applySideColors(colors?: number[] | null) {
  sideMap = colors && colors.length ? colors : IDENTITY;
}
export const sideColor = (i: number) => SIDE_COLORS[(sideMap[i] ?? i) % SIDE_COLORS.length];

/** Default palette indexes for a match with `sides` sides. */
export const defaultColors = (sides: number) => IDENTITY.slice(0, sides);

/** A valid color choice: one distinct palette color per side. */
export function validColors(colors: number[] | undefined, sides: number): number[] {
  if (!colors || colors.length !== sides) return defaultColors(sides);
  const ok = colors.every((c) => Number.isInteger(c) && c >= 0 && c < SIDE_COLORS.length) && new Set(colors).size === sides;
  return ok ? colors : defaultColors(sides);
}

/** Pick color `c` for `side`. A free color is simply taken; when every
 *  color is in use (three sides, three colors) the two sides swap. */
export function pickColor(colors: number[], side: number, c: number): number[] {
  const owner = colors.indexOf(c);
  if (owner === -1 || owner === side) return colors.map((x, k) => (k === side ? c : x));
  if (colors.length < SIDE_COLORS.length) return colors; // taken, and a free one exists
  const mine = colors[side];
  return colors.map((x, k) => (k === side ? c : k === owner ? mine : x));
}

/** Next palette color for `side` that no other side is using. */
export function nextColor(colors: number[], side: number): number[] {
  const cur = colors[side];
  const next = (cur + 1) % SIDE_COLORS.length;
  // If another side already has the next color, the two sides trade.
  return colors.map((x, k) => (k === side ? next : x === next ? cur : x));
}

/** Suit colors on board spaces and cards (both light now). */
export const SUIT_ON_DARK: Record<Suit, string> = {
  spade: "#111111",
  club: "#111111",
  heart: "#E8156F",
  diamond: "#E8156F",
  star: "#3355FF",
};
export const SUIT_ON_LIGHT = SUIT_ON_DARK;
