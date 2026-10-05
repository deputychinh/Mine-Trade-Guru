/** Nearest-rank percentile (p in 0–100); null for an empty sample. */
export function percentile(samples: readonly number[], p: number): number | null {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  const rank = Math.ceil((Math.min(100, Math.max(0, p)) / 100) * sorted.length)
  return sorted[Math.max(0, rank - 1)] ?? null
}

export function average(samples: readonly number[]): number | null {
  if (samples.length === 0) return null
  return samples.reduce((sum, value) => sum + value, 0) / samples.length
}
