// Canonical wire types. frontend/src/interfaces/*.ts mirrors these 1:1.
// Prices: stocks/ETF/CW in whole VND (24850 = 24.85 on a x1,000 board);
// futures in index points with one decimal. Volumes in shares (contracts for futures).

export type Exchange = 'HOSE' | 'HNX' | 'UPCOM'
export type SessionMarket = Exchange | 'DERIVATIVES'
export type InstrumentType = 'STOCK' | 'ETF' | 'CW' | 'FUTURES'
export type IndexCode = 'VNINDEX' | 'VN30' | 'HNXINDEX' | 'HNX30' | 'UPCOMINDEX'
export type TradeSide = 'B' | 'S' | 'U'
export type SessionPhase =
  | 'PRE_OPEN'
  | 'ATO'
  | 'CONTINUOUS'
  | 'LUNCH'
  | 'ATC'
  | 'PUT_THROUGH'
  | 'CLOSED'
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
  /** Increments by exactly 1 on every change (X or R frame). Used for gap detection. */
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

/** Session volume matched at one price (volume-by-price profile). */
export interface VolumeAtPrice {
  price: number
  volume: number
  buyVolume: number
  sellVolume: number
}

export interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
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
  /** Shares traded by the index constituents during this minute (volume bars under the chart). */
  volume: number
}

export interface SessionState {
  market: SessionMarket
  phase: SessionPhase
  nextPhase: SessionPhase | null
  /** Virtual market time (epoch ms) when the next phase starts. */
  nextPhaseAt: number | null
  /** Virtual market time (epoch ms) when this state was produced. */
  marketTime: number
  /** How many virtual ms pass per real ms (1 in live mode). */
  clockSpeed: number
}

export interface Snapshot {
  serverTime: number
  quotes: Quote[]
  indices: IndexQuote[]
  sessions: SessionState[]
}

export type Channel = 'X' | 'R' | 'MI' | 'F'

export type WireFrame =
  | { ch: 'X'; data: QuoteDelta }
  | { ch: 'R'; data: ForeignDelta }
  | { ch: 'MI'; data: IndexQuote }
  | { ch: 'F'; data: SessionState }

export type ServerMessage =
  | {
      type: 'batch'
      /** Server send time (epoch ms), for tick-to-paint latency. */
      ts: number
      /** True when frames were dropped for this client (backpressure) or the trading day rolled: client must resync. */
      gap: boolean
      frames: WireFrame[]
    }
  | { type: 'hb'; ts: number }

export type ClientMessage =
  | { op: 'subscribe'; channels: Channel[] }
  | { op: 'unsubscribe'; channels: Channel[] }
