export type RandomFn = () => number

/** Deterministic PRNG (mulberry32). Same seed → same catalogue and same test runs. */
export function createRandom(seed: number): RandomFn {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(random: RandomFn, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

/** Exponential-distributed positive integer with the given mean; heavy tail like real order sizes. */
export function randomExp(random: RandomFn, mean: number): number {
  return Math.max(1, Math.ceil(-Math.log(1 - random()) * mean))
}

export function pickWeighted<T>(random: RandomFn, options: ReadonlyArray<readonly [T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [value, weight] of options) {
    roll -= weight
    if (roll <= 0) return value
  }
  const last = options[options.length - 1]
  if (!last) throw new Error('pickWeighted: empty options')
  return last[0]
}
