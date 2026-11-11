// Lineup sound effects, synthesised with the shell's Web Audio engine so
// they obey the existing Sound effects setting and never autoplay (the
// audio context only starts after the first tap).
import { shell } from "./shell";

const t = (f: number, d: number, len: number, o: { type?: OscillatorType; gain?: number; glide?: number } = {}) =>
  shell().tone(f, d, len, o);

export const sfx = {
  select() {
    t(880, 0, 0.06, { type: "triangle", gain: 0.1 });
    t(1320, 0.03, 0.08, { type: "sine", gain: 0.06 });
  },
  place(side: number) {
    // A soft "thock": low body plus a short click, pitched per side.
    const base = [196, 220, 247, 262][side % 4];
    t(base * 2, 0, 0.09, { type: "sine", gain: 0.22, glide: base });
    t(base, 0.0, 0.16, { type: "triangle", gain: 0.12 });
    shell().noise(0, 0.12);
  },
  turn() {
    t(659.25, 0, 0.08, { type: "sine", gain: 0.07 });
    t(987.77, 0.07, 0.12, { type: "sine", gain: 0.06 });
  },
  invalid() {
    t(196, 0, 0.14, { type: "triangle", gain: 0.14, glide: 150 });
  },
  remove() {
    t(392, 0, 0.12, { type: "triangle", gain: 0.16, glide: 220 });
    shell().noise(0.02, 0.1);
  },
  refresh() {
    t(1174.66, 0, 0.05, { type: "triangle", gain: 0.06 });
    t(1567.98, 0.05, 0.07, { type: "triangle", gain: 0.05 });
  },
  roundWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => t(f, i * 0.08, 0.28, { type: "triangle", gain: 0.18 }));
    t(1567.98, 0.32, 0.45, { type: "sine", gain: 0.08 });
  },
  roundLoss() {
    [523.25, 440, 392].forEach((f, i) => t(f, i * 0.12, 0.32, { type: "sine", gain: 0.12 }));
  },
  matchWin() {
    shell().fanfare();
  },
  matchLoss() {
    [659.25, 523.25, 392, 329.63].forEach((f, i) => t(f, i * 0.13, 0.4, { type: "sine", gain: 0.14 }));
  },
  achievement() {
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => t(f, i * 0.06, 0.25, { type: "sine", gain: 0.08 }));
  },
};
