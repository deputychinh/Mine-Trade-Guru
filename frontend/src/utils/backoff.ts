/**
 * Exponential backoff with "equal jitter": half the window fixed, half random, so clients
 * reconnecting after an outage don't all hit the server at the same instant (NFR-R1).
 * attempt 0 → [base/2, base], attempt 1 → [base, 2·base], … capped at max.
 */
export function backoffDelay(
  attempt: number,
  baseMs: number,
  maxMs: number,
  random: () => number = Math.random,
): number {
  const window = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt))
  return Math.round(window / 2 + random() * (window / 2))
}
