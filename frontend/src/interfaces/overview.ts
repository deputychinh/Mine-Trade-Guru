import type { Exchange, Sector } from './market'

export interface MarketBreadth {
  advancers: number
  decliners: number
  unchanged: number
  ceiling: number
  floor: number
  total: number
}

export type ExchangeBreadth = Record<Exchange, MarketBreadth>

export type MoverCategory = 'gainers' | 'losers' | 'volume' | 'value'

export interface Mover {
  symbol: string
  lastPrice: number | null
  change: number | null
  changePercent: number | null
  totalVolume: number
  totalValue: number
}

export type TopMovers = Record<MoverCategory, Mover[]>

export interface ForeignFlowEntry {
  symbol: string
  buyVolume: number
  sellVolume: number
  /** Buy − sell. */
  netVolume: number
  /** Net volume × last (or reference) price, in VND. */
  netValue: number
}

export interface ForeignFlow {
  topNetBuy: ForeignFlowEntry[]
  topNetSell: ForeignFlowEntry[]
}

export interface HeatmapTile {
  symbol: string
  sector: Sector
  marketCap: number
  changePercent: number
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface HeatmapGroup {
  sector: Sector
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface HeatmapLayout {
  groups: HeatmapGroup[]
  tiles: HeatmapTile[]
}
