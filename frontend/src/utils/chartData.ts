import type { CandlestickData, HistogramData, LineData, UTCTimestamp, WhitespaceData } from 'lightweight-charts'
import { INDEX_CHART_HOURS, VN_UTC_OFFSET_MS } from '@/constants/sessions'
import type { Bar, IndexPoint } from '@/interfaces/market'

const MS_PER_SECOND = 1_000
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** lightweight-charts wants epoch seconds; the app uses epoch ms everywhere. */
export function toChartTime(epochMs: number): UTCTimestamp {
  return Math.floor(epochMs / MS_PER_SECOND) as UTCTimestamp
}

/** The library throws on equal or decreasing times, so keep only strictly ascending points. */
function ascending<T extends { time: UTCTimestamp }>(points: T[]): T[] {
  const result: T[] = []
  for (const point of points) {
    const last = result[result.length - 1]
    if (last === undefined || point.time > last.time) result.push(point)
    else if (point.time === last.time) result[result.length - 1] = point
  }
  return result
}

export function toLinePoints(points: readonly IndexPoint[]): LineData<UTCTimestamp>[] {
  return ascending(points.map((point) => ({ time: toChartTime(point.time), value: point.value })))
}

export function toCandles(bars: readonly Bar[]): CandlestickData<UTCTimestamp>[] {
  return ascending(
    bars.map((bar) => ({ time: toChartTime(bar.time), open: bar.open, high: bar.high, low: bar.low, close: bar.close })),
  )
}

export function toCloseLine(bars: readonly Bar[]): LineData<UTCTimestamp>[] {
  return ascending(bars.map((bar) => ({ time: toChartTime(bar.time), value: bar.close })))
}

/** Volume bars colored like their candle: up when close ≥ open. */
export function toVolumeBars(bars: readonly Bar[], upColor: string, downColor: string): HistogramData<UTCTimestamp>[] {
  return ascending(
    bars.map((bar) => ({
      time: toChartTime(bar.time),
      value: bar.volume,
      color: bar.close >= bar.open ? upColor : downColor,
    })),
  )
}

/** Per-minute traded volume as histogram bars (index chart). */
export function toIndexVolumeBars(points: readonly IndexPoint[], color: string): HistogramData<UTCTimestamp>[] {
  return ascending(points.map((point) => ({ time: toChartTime(point.time), value: point.volume, color })))
}

/** Start of the Vietnam calendar day containing `epochMs`, as epoch ms. */
export function vietnamDayStart(epochMs: number): number {
  return Math.floor((epochMs + VN_UTC_OFFSET_MS) / DAY_MS) * DAY_MS - VN_UTC_OFFSET_MS
}

/**
 * One empty point per minute from 09:00 to 15:00 (Vietnam time) of the points' trading day,
 * widened if data falls outside it. Given to a hidden series, it makes the time axis show the
 * whole session (iBoard style) while the real series stay short enough for live update().
 */
export function indexSessionAxis(points: readonly IndexPoint[], fallbackTime: number): WhitespaceData<UTCTimestamp>[] {
  const first = points[0]?.time
  const last = points[points.length - 1]?.time
  const dayStart = vietnamDayStart(last ?? fallbackTime)
  const open = dayStart + INDEX_CHART_HOURS.open * HOUR_MS
  const close = dayStart + INDEX_CHART_HOURS.close * HOUR_MS
  const start = Math.min(open, first ?? open)
  const end = Math.max(close, last ?? close)
  const axis: WhitespaceData<UTCTimestamp>[] = []
  for (let time = start; time <= end; time += MINUTE_MS) axis.push({ time: toChartTime(time) })
  return axis
}
