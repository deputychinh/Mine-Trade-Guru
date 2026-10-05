import type { FeedMetrics } from './worker'

/** What the dev-only perf overlay shows (NFR-O1). */
export interface PerfSnapshot {
  feed: FeedMetrics | null
  /** Server send → next painted frame, over the last N samples. */
  tickToPaintP50Ms: number | null
  tickToPaintP95Ms: number | null
  /** Main-thread time spent applying the last patch to the stores. */
  applyPatchMs: number | null
  heapUsedMb: number | null
}
