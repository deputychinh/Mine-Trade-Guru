// Capped, immutable list helpers. They return new arrays so a shallowRef only needs
// `.value = …` to update, and every growing list stays bounded (NFR-P5, rule 9.10).

/** Oldest → newest; keeps the newest `cap` items. */
export function appendCapped<T>(items: readonly T[], additions: readonly T[], cap: number): T[] {
  if (additions.length === 0) return items.length > cap ? items.slice(-cap) : [...items]
  const merged = items.concat(additions)
  return merged.length > cap ? merged.slice(merged.length - cap) : merged
}

/** Newest → oldest; `additions` must also be newest first. Keeps the newest `cap` items. */
export function prependCapped<T>(items: readonly T[], additions: readonly T[], cap: number): T[] {
  const merged = additions.concat(items)
  return merged.length > cap ? merged.slice(0, cap) : merged
}
