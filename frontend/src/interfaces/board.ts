import type { Exchange, IndexCode, Instrument, InstrumentType, Quote } from './market'
import type { MarketColorToken } from './theme'

export type BoardId =
  | 'VN30'
  | 'HOSE'
  | 'HNX'
  | 'HNX30'
  | 'UPCOM'
  | 'WATCHLIST'
  | 'DERIVATIVES'
  | 'CW'
  | 'ETF'
  | 'SECTOR'

/** Declarative filter: a board is config, not code (NFR-M4). */
export interface BoardMatch {
  exchange?: Exchange
  types?: InstrumentType[]
  index?: IndexCode
  source?: 'watchlist' | 'sector'
}

export interface BoardDefinition {
  id: BoardId
  labelKey: string
  match: BoardMatch
}

export type ColumnGroupKey = 'symbol' | 'reference' | 'bids' | 'match' | 'asks' | 'volume' | 'ohlc' | 'foreign'

export type ColumnKey =
  | 'symbol'
  | 'ceiling'
  | 'floor'
  | 'reference'
  | 'bid3Price'
  | 'bid3Volume'
  | 'bid2Price'
  | 'bid2Volume'
  | 'bid1Price'
  | 'bid1Volume'
  | 'lastPrice'
  | 'lastVolume'
  | 'change'
  | 'changePercent'
  | 'ask1Price'
  | 'ask1Volume'
  | 'ask2Price'
  | 'ask2Volume'
  | 'ask3Price'
  | 'ask3Volume'
  | 'totalVolume'
  | 'totalValue'
  | 'open'
  | 'high'
  | 'low'
  | 'average'
  | 'foreignBuy'
  | 'foreignSell'
  | 'foreignRoom'

export type CellKind = 'symbol' | 'price' | 'volume' | 'change' | 'percent' | 'value'

export type ColumnWidth = 'symbol' | 'price' | 'volume' | 'value'

export interface ColumnDefinition {
  key: ColumnKey
  group: ColumnGroupKey
  labelKey: string
  kind: CellKind
  /** Price column whose value decides this cell's color; null = neutral. */
  colorSource: ColumnKey | null
  isSortable: boolean
  width: ColumnWidth
}

export interface ColumnGroupDefinition {
  key: ColumnGroupKey
  labelKey: string
  /** Fixed groups (symbol) can't be hidden or moved. */
  isFixed: boolean
  isVisibleByDefault: boolean
}

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: ColumnKey
  direction: SortDirection
}

export interface BoardRow {
  symbol: string
  instrument: Instrument
  quote: Quote
  isPinned: boolean
  isWatched: boolean
}

/** Everything one board cell renders; built by utils/boardCell.ts so rows stay logic-free. */
export interface BoardCell {
  key: ColumnKey
  kind: CellKind
  text: string
  color: MarketColorToken | null
  /** ▲ ▼ ■ shown next to prices (rule C5); null for volumes and empty cells. */
  marker: string | null
  /** i18n key read by screen readers instead of the marker glyph. */
  ariaKey: string | null
  /** Value whose change triggers the flash; null = this cell never flashes. */
  flashValue: number | null
}

/** A run of adjacent columns under one group header. */
export interface ColumnGroupSpan {
  key: ColumnGroupKey
  labelKey: string
  span: number
}
