import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { TICK_TO_PAINT_SAMPLES } from '@/constants/limits'
import type { PerfSnapshot } from '@/interfaces/perf'
import type { FeedMetrics } from '@/interfaces/worker'
import { percentile } from '@/utils/stats'

const BYTES_PER_MB = 1_048_576

interface ChromeMemory {
  usedJSHeapSize: number
}

/**
 * Dev-only performance numbers (NFR-O1). Samples are collected in a plain array and the
 * reactive summary is refreshed once per metrics tick, so measuring doesn't add per-frame work.
 */
export const usePerfStore = defineStore('perf', () => {
  const feed = shallowRef<FeedMetrics | null>(null)
  const tickToPaintP50Ms = ref<number | null>(null)
  const tickToPaintP95Ms = ref<number | null>(null)
  const applyPatchMs = ref<number | null>(null)
  const heapUsedMb = ref<number | null>(null)

  let samples: number[] = []

  function recordPaint(latencyMs: number): void {
    samples.push(latencyMs)
    if (samples.length > TICK_TO_PAINT_SAMPLES) samples = samples.slice(-TICK_TO_PAINT_SAMPLES)
  }

  function recordApply(durationMs: number): void {
    applyPatchMs.value = durationMs
  }

  function recordFeedMetrics(metrics: FeedMetrics): void {
    feed.value = metrics
    tickToPaintP50Ms.value = percentile(samples, 50)
    tickToPaintP95Ms.value = percentile(samples, 95)
    const memory = (performance as Performance & { memory?: ChromeMemory }).memory
    heapUsedMb.value = memory ? memory.usedJSHeapSize / BYTES_PER_MB : null
  }

  const snapshot = computed<PerfSnapshot>(() => ({
    feed: feed.value,
    tickToPaintP50Ms: tickToPaintP50Ms.value,
    tickToPaintP95Ms: tickToPaintP95Ms.value,
    applyPatchMs: applyPatchMs.value,
    heapUsedMb: heapUsedMb.value,
  }))

  return { snapshot, recordPaint, recordApply, recordFeedMetrics }
})
