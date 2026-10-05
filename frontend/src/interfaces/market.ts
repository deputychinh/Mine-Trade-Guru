// Mirrors backend/src/market/types.ts 1:1. Change both together.
// Prices: stocks/ETF/CW in whole VND; futures in index points (1 decimal).

export type Exchange = 'HOSE' | 'HNX' | 'UPCOM'
export type SessionMarket = Exchange | 'DERIVATIVES'
export type InstrumentType = 'STOCK' | 'ETF' | 'CW' | 'FUTURES'
export type IndexCode = 'VNINDEX' | 'VN30' | 'HNXINDEX' | 'HNX30' | 'UPCOMINDEX'
export type TradeSide = 'B' | 'S' | 'U'
export type Sector =
  | 'BANKING'
  | 'REAL_ESTATE'
  | 'SECURITIES'
  | 'STEEL'
  | 'OIL_GAS'
  | 'RETAIL'
  | 'TECHNOLOGY'
  | 'FOOD_BEVERAGE'
  | 'UTILITIES'
  | 'TRANSPORT'
  | 'CONSTRUCTION'
  | 'CHEMICALS'
  | 'INSURANCE'
  | 'INDUSTRIAL'
  | 'SEAFOOD'

export interface Instrument {
  symbol: string
  name: string
  exchange: Exchange
  type: InstrumentType
  sector: Sector | null
  sharesOutstanding: number
  indices: IndexCode[]
  underlying: string | null
  conversionRatio: number | null
}

export interface PriceLevel {
  price: number | null
  volume: number
}

export interface Quote {
  symbol: string
  /** Increments by exactly 1 on every change; a jump means frames were missed. */
  v: number
  reference: number
  ceiling: number
  floor: number
  open: number | null
  high: number | null
  low: number | null
  average: number | null
  lastPrice: number | null
  lastVolume: number | null
  lastTradeId: number | null
  lastTradeTime: number | null
  lastSide: TradeSide | null
  change: number | null
  changePercent: number | null
  totalVolume: number
  totalValue: number
  bids: PriceLevel[]
  asks: PriceLevel[]
  foreignBuyVolume: number
  foreignSellVolume: number
  foreignRoom: number
  updatedAt: number
}

export type QuoteDelta = Pick<Quote, 'symbol' | 'v'> & Partial<Omit<Quote, 'symbol' | 'v'>>

export type ForeignDelta = Pick<
  Quote,
  'symbol' | 'v' | 'foreignBuyVolume' | 'foreignSellVolume' | 'foreignRoom' | 'updatedAt'
>

export interface Trade {
  id: number
  symbol: string
  time: number
  price: number
  volume: number
  side: TradeSide
}

export interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface VolumeAtPrice {
  price: number
  volume: number
  buyVolume: number
  sellVolume: number
}

export interface IndexQuote {
  code: IndexCode
  v: number
  value: number
  reference: number
  change: number
  changePercent: number
  totalVolume: number
  totalValue: number
  advancers: number
  decliners: number
  unchanged: number
  ceilingCount: number
  floorCount: number
  updatedAt: number
}

export interface IndexPoint {
  time: number
  value: number
  /** Shares traded during this minute (volume bars under the index chart). */
  volume: number
}
