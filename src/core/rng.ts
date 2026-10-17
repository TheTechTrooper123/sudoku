/**
 * Small, dependency free pseudo random number generator.
 *
 * The generator is seedable so that puzzle generation stays reproducible in
 * tests while still feeling random during normal play.
 */
export type Rng = () => number;

/** Mulberry32 - fast, well distributed, plenty good for puzzle generation. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random seed, derived from the current time and a random source when available. */
export function randomSeed(): number {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    cryptoObj.getRandomValues(buffer);
    return buffer[0] >>> 0;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/** Returns a random integer in `[0, max)`. */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

/** Fisher-Yates shuffle (in place) driven by `rng`. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
