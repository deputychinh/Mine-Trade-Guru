import type { ChartKind, Timeframe, TimeframeDefinition } from '@/interfaces/chart'

/** Server delivers 1-minute bars; larger frames are aggregated client-side (utils/barAggregate.ts). */
export const TIMEFRAMES: readonly TimeframeDefinition[] = [
  { timeframe: '1m', labelKey: 'chart.timeframe.1m', minutes: 1 },
  { timeframe: '5m', labelKey: 'chart.timeframe.5m', minutes: 5 },
  { timeframe: '15m', labelKey: 'chart.timeframe.15m', minutes: 15 },
  { timeframe: '1h', labelKey: 'chart.timeframe.1h', minutes: 60 },
]

export const DEFAULT_TIMEFRAME: Timeframe = '1m'
export const DEFAULT_CHART_KIND: ChartKind = 'candle'
