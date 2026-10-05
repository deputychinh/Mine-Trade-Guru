import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { fetchBars, fetchTrades, fetchVolumeProfile } from '@/api/marketApi'
import { BAR_LIMIT, TRADE_TAPE_LIMIT } from '@/constants/limits'
import { DEFAULT_CHART_KIND, DEFAULT_TIMEFRAME } from '@/constants/timeframes'
import type { ChartKind, Timeframe } from '@/interfaces/chart'
import type { Bar, Trade, VolumeAtPrice } from '@/interfaces/market'
import { applyTradesToBars } from '@/utils/barAggregate'
import { prependCapped } from '@/utils/ringBuffer'
import { applyTradesToProfile } from '@/utils/volumeByPrice'
import type { LoadStatus } from './useInstrumentStore'

/** The open symbol's session history plus live trades (FR-20 … FR-25). */
export const useSymbolDetailStore = defineStore('symbolDetail', () => {
  const symbol = ref<string | null>(null)
  const status = ref<LoadStatus>('idle')
  const error = ref<string | null>(null)
  /** 1-minute bars, oldest first. */
  const bars = shallowRef<Bar[]>([])
  /** Newest first. */
  const trades = shallowRef<Trade[]>([])
  /** Highest price first. */
  const profile = shallowRef<VolumeAtPrice[]>([])
  const timeframe = ref<Timeframe>(DEFAULT_TIMEFRAME)
  const chartKind = ref<ChartKind>(DEFAULT_CHART_KIND)

  const isOpen = computed(() => symbol.value !== null)

  let controller: AbortController | null = null
  /** Live trades that arrive while history is loading; merged once it lands. */
  let pendingLive: Trade[] = []
  /** Newest trade id already counted; anything at or below it is in the loaded history. */
  let cutoffTradeId = -1

  function reset(): void {
    bars.value = []
    trades.value = []
    profile.value = []
    pendingLive = []
    cutoffTradeId = -1
    error.value = null
  }

  async function open(next: string): Promise<void> {
    if (symbol.value === next && status.value !== 'error') return
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    reset()
    symbol.value = next
    status.value = 'loading'
    try {
      const [loadedBars, loadedTrades, loadedProfile] = await Promise.all([
        fetchBars(next, signal),
        fetchTrades(next, signal),
        fetchVolumeProfile(next, signal),
      ])
      if (symbol.value !== next) return
      bars.value = loadedBars.slice(-BAR_LIMIT)
      trades.value = loadedTrades.slice(0, TRADE_TAPE_LIMIT)
      profile.value = loadedProfile
      cutoffTradeId = loadedTrades[0]?.id ?? -1
      status.value = 'ready'
      const live = pendingLive
      pendingLive = []
      applyTrades(live)
    } catch (cause) {
      if (signal.aborted) return
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : String(cause)
    }
  }

  function close(): void {
    controller?.abort()
    controller = null
    symbol.value = null
    status.value = 'idle'
    reset()
  }

  /** Live trades from the worker (oldest first). Bars, tape and profile all advance together. */
  function applyTrades(incoming: readonly Trade[]): void {
    if (symbol.value === null || incoming.length === 0) return
    const relevant = incoming.filter((trade) => trade.symbol === symbol.value)
    if (status.value === 'loading') {
      pendingLive.push(...relevant)
      return
    }
    if (status.value !== 'ready') return
    const fresh = relevant.filter((trade) => trade.id > cutoffTradeId)
    if (fresh.length === 0) return
    cutoffTradeId = fresh[fresh.length - 1]?.id ?? cutoffTradeId
    trades.value = prependCapped(trades.value, [...fresh].reverse(), TRADE_TAPE_LIMIT)
    bars.value = applyTradesToBars(bars.value, fresh, BAR_LIMIT)
    profile.value = applyTradesToProfile(profile.value, fresh)
  }

  function setTimeframe(next: Timeframe): void {
    timeframe.value = next
  }

  function setChartKind(next: ChartKind): void {
    chartKind.value = next
  }

  return {
    symbol,
    status,
    error,
    bars,
    trades,
    profile,
    timeframe,
    chartKind,
    isOpen,
    open,
    close,
    applyTrades,
    setTimeframe,
    setChartKind,
  }
})
