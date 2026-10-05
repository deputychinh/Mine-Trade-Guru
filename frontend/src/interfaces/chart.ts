export type Timeframe = '1m' | '5m' | '15m' | '1h'

export type ChartKind = 'candle' | 'line'

export interface TimeframeDefinition {
  timeframe: Timeframe
  labelKey: string
  minutes: number
}

/** Resolved (hex) colors handed to the chart library; always read from the active Vuetify theme (rule C8). */
export interface ChartPalette {
  background: string
  text: string
  grid: string
  up: string
  down: string
  reference: string
  ceiling: string
  floor: string
  line: string
}

/** Horizontal reference lines drawn on the price chart. */
export interface PriceGuides {
  reference: number
  ceiling: number
  floor: number
}
