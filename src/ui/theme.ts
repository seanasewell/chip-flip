// Chip Flip design tokens: cream paper with a grid, ink outlines, square
// corners and hard shadows. Blue, pink and orange belong to gameplay only;
// neon green is the accent (primary buttons, badges, shadows).
import type { Suit } from '@/core/types';

export const C = {
  bg: '#F3F1EA',
  paper: '#FFFDF6',
  white: '#FFFFFF',
  ink: '#111111',
  muted: 'rgba(17,17,17,0.66)',
  faint: 'rgba(17,17,17,0.45)',
  grid: 'rgba(17,17,17,0.07)',
  blue: '#3355FF',
  pink: '#FF2E93',
  orange: '#EA5B0C',
  green: '#39FF6A',
  greenText: '#0E9F55',
  red: '#E11D2E',
};

export const F = {
  display: 'Anton_400Regular',
  body: 'SpaceGrotesk_400Regular',
  bodyMed: 'SpaceGrotesk_500Medium',
  bodyBold: 'SpaceGrotesk_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export interface SideColor {
  name: string;
  base: string;
  light: string;
  dark: string;
  mark: string;
  marker: 'ring' | 'diamond' | 'triangle' | 'square';
}

export const SIDE_COLORS: SideColor[] = [
  { name: 'Blue', base: '#3355FF', light: '#C9D2FF', dark: '#1F3AD6', mark: '#FFFFFF', marker: 'ring' },
  { name: 'Pink', base: '#FF2E93', light: '#FFC2DF', dark: '#D1146E', mark: '#FFFFFF', marker: 'diamond' },
  { name: 'Orange', base: '#EA5B0C', light: '#FFD2B3', dark: '#C4520A', mark: '#FFFFFF', marker: 'triangle' },
];

/** Which palette color each side uses in the match on screen. */
const IDENTITY = [0, 1, 2];
let sideMap: number[] = IDENTITY;
export function applySideColors(colors?: number[] | null) {
  sideMap = colors && colors.length ? colors : IDENTITY;
}
export const sideColor = (i: number) => SIDE_COLORS[(sideMap[i] ?? i) % SIDE_COLORS.length];
export const defaultColors = (sides: number) => IDENTITY.slice(0, sides);

export function validColors(colors: number[] | undefined, sides: number): number[] {
  if (!colors || colors.length !== sides) return defaultColors(sides);
  const ok = colors.every((c) => Number.isInteger(c) && c >= 0 && c < SIDE_COLORS.length) && new Set(colors).size === sides;
  return ok ? colors : defaultColors(sides);
}

/** Pick color `c` for `side`. A free color is taken; when every color is in
 *  use (three sides, three colors) the two sides swap. */
export function pickColor(colors: number[], side: number, c: number): number[] {
  const owner = colors.indexOf(c);
  if (owner === -1 || owner === side) return colors.map((x, k) => (k === side ? c : x));
  if (colors.length < SIDE_COLORS.length) return colors;
  const mine = colors[side];
  return colors.map((x, k) => (k === side ? c : k === owner ? mine : x));
}

export const SUIT_COLOR: Record<Suit, string> = {
  spade: '#111111',
  club: '#111111',
  heart: '#E8156F',
  diamond: '#E8156F',
  star: '#3355FF',
};

/** `hex` mixed into white at `amount` (0 to 1). */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 + (c - 255) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
