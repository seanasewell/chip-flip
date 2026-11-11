/** Small seeded PRNG (mulberry32). The state is a single 32-bit integer
 *  stored on the match, so a saved match draws the same cards on resume. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
