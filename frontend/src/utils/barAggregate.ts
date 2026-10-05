import type { Bar, Trade } from '@/interfaces/market'

const MINUTE_MS = 60_000

export function bucketStart(time: number, minutes: number): number {
  const size = minutes * MINUTE_MS
  return Math.floor(time / size) * size
}

/**
 * Folds live trades into 1-minute bars (oldest → newest). Only the last bar can change
 * or a new one is appended, so this is O(trades), and the result stays capped.
 */
export function applyTradesToBars(bars: readonly Bar[], trades: readonly Trade[], cap: number): Bar[] {
  if (trades.length === 0) return [...bars]
  const result = [...bars]
  for (const trade of trades) {
    const time = bucketStart(trade.time, 1)
    const last = result[result.length - 1]
    if (last && last.time === time) {
      result[result.length - 1] = {
        ...last,
        high: Math.max(last.high, trade.price),
        low: Math.min(last.low, trade.price),
        close: trade.price,
        volume: last.volume + trade.volume,
      }
    } else if (!last || time > last.time) {
      result.push({ time, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.volume })
    }
  }
  return result.length > cap ? result.slice(result.length - cap) : result
}

/** 1-minute bars → N-minute bars (FR-21). Input must be sorted oldest → newest. */
export function aggregateBars(bars: readonly Bar[], minutes: number): Bar[] {
  if (minutes <= 1) return [...bars]
  const result: Bar[] = []
  for (const bar of bars) {
    const time = bucketStart(bar.time, minutes)
    const last = result[result.length - 1]
    if (last && last.time === time) {
      result[result.length - 1] = {
        time,
        open: last.open,
        high: Math.max(last.high, bar.high),
        low: Math.min(last.low, bar.low),
        close: bar.close,
        volume: last.volume + bar.volume,
      }
    } else {
      result.push({ ...bar, time })
    }
  }
  return result
}
