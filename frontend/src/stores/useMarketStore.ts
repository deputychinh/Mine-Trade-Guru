import { defineStore } from 'pinia'
import { computed, ref, shallowRef, triggerRef } from 'vue'
import { fetchIndexHistory } from '@/api/marketApi'
import { FOREIGN_FLOW_COUNT, OVERVIEW_THROTTLE_MS, SPARKLINE_POINTS, TOP_MOVERS_COUNT } from '@/constants/limits'
import { INDEX_CODES } from '@/constants/market'
import type { IndexCode, IndexPoint, IndexQuote, Quote } from '@/interfaces/market'
import type { Snapshot } from '@/interfaces/websocket'
import type { MarketPatch } from '@/interfaces/worker'
import { bucketStart } from '@/utils/barAggregate'
import { computeForeignFlow } from '@/utils/foreignFlow'
import { computeBreadth } from '@/utils/marketBreadth'
import { appendCapped } from '@/utils/ringBuffer'
import { computeTopMovers } from '@/utils/topMovers'
import { useInstrumentStore } from './useInstrumentStore'

/**
 * Live quotes and indices (plan §8). Quotes live in a plain Map wrapped by a shallowRef:
 * a patch mutates the Map and calls triggerRef once, never deep reactivity per field.
 * Derived panels read the plain Map and only recompute when `overviewVersion` ticks,
 * which is throttled to OVERVIEW_THROTTLE_MS — they never recompute per tick.
 */
export const useMarketStore = defineStore('market', () => {
  const instrumentStore = useInstrumentStore()

  const quoteMap = new Map<string, Quote>()
  const indexMap = new Map<IndexCode, IndexQuote>()
  const quotes = shallowRef<ReadonlyMap<string, Quote>>(quoteMap)
  const indices = shallowRef<ReadonlyMap<IndexCode, IndexQuote>>(indexMap)
  const indexHistory = shallowRef<ReadonlyMap<IndexCode, readonly IndexPoint[]>>(new Map())
  const hasSnapshot = ref(false)
  const overviewVersion = ref(0)

  let lastOverviewAt = 0
  let overviewTimer: ReturnType<typeof setTimeout> | null = null

  function bumpOverview(): void {
    const elapsed = Date.now() - lastOverviewAt
    if (elapsed >= OVERVIEW_THROTTLE_MS) {
      lastOverviewAt = Date.now()
      overviewVersion.value++
      return
    }
    if (overviewTimer !== null) return
    overviewTimer = setTimeout(() => {
      overviewTimer = null
      lastOverviewAt = Date.now()
      overviewVersion.value++
    }, OVERVIEW_THROTTLE_MS - elapsed)
  }

  /** `traded` = shares traded since the previous update of this index, added to the minute's bar. */
  function appendHistoryPoint(index: IndexQuote, traded: number): void {
    const history = new Map(indexHistory.value)
    const points = history.get(index.code) ?? []
    const time = bucketStart(index.updatedAt, 1)
    const last = points[points.length - 1]
    const next =
      last && last.time === time
        ? [...points.slice(0, -1), { time, value: index.value, volume: last.volume + traded }]
        : appendCapped(points, [{ time, value: index.value, volume: traded }], SPARKLINE_POINTS)
    history.set(index.code, next)
    indexHistory.value = history
  }

  function applySnapshot(snapshot: Snapshot): void {
    quoteMap.clear()
    for (const quote of snapshot.quotes) quoteMap.set(quote.symbol, quote)
    indexMap.clear()
    for (const index of snapshot.indices) indexMap.set(index.code, index)
    triggerRef(quotes)
    triggerRef(indices)
    hasSnapshot.value = true
    lastOverviewAt = 0
    bumpOverview()
  }

  function applyPatch(patch: MarketPatch): void {
    if (patch.quotes.length > 0) {
      for (const quote of patch.quotes) quoteMap.set(quote.symbol, quote)
      triggerRef(quotes)
    }
    if (patch.indices.length > 0) {
      for (const index of patch.indices) {
        const previous = indexMap.get(index.code)
        // Never negative: a day roll resets the total.
        const traded = previous ? Math.max(0, index.totalVolume - previous.totalVolume) : 0
        indexMap.set(index.code, index)
        appendHistoryPoint(index, traded)
      }
      triggerRef(indices)
    }
    if (patch.quotes.length > 0 || patch.indices.length > 0) bumpOverview()
  }

  async function loadIndexHistory(): Promise<void> {
    const results = await Promise.allSettled(INDEX_CODES.map((code) => fetchIndexHistory(code)))
    const history = new Map(indexHistory.value)
    results.forEach((result, i) => {
      const code = INDEX_CODES[i]
      if (code && result.status === 'fulfilled') history.set(code, result.value.slice(-SPARKLINE_POINTS))
    })
    indexHistory.value = history
  }

  function quote(symbol: string): Quote | undefined {
    return quotes.value.get(symbol)
  }

  // Throttled derived panels: depend on overviewVersion only, read the plain Map.
  const breadth = computed(() => {
    void overviewVersion.value
    return computeBreadth(quoteMap.values(), instrumentStore.bySymbol)
  })
  const movers = computed(() => {
    void overviewVersion.value
    return computeTopMovers(quoteMap.values(), instrumentStore.bySymbol, TOP_MOVERS_COUNT)
  })
  const foreignFlow = computed(() => {
    void overviewVersion.value
    return computeForeignFlow(quoteMap.values(), instrumentStore.bySymbol, FOREIGN_FLOW_COUNT)
  })

  /** Non-reactive read of every quote, for throttled consumers (heatmap) that track their own trigger. */
  function snapshotQuotes(): Quote[] {
    return [...quoteMap.values()]
  }

  return {
    quotes,
    indices,
    indexHistory,
    hasSnapshot,
    overviewVersion,
    breadth,
    movers,
    foreignFlow,
    applySnapshot,
    applyPatch,
    loadIndexHistory,
    quote,
    snapshotQuotes,
  }
})
