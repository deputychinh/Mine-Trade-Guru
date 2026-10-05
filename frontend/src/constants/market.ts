import type { Exchange, IndexCode, InstrumentType, Sector, SessionMarket, TradeSide } from '@/interfaces/market'

export const EXCHANGES: readonly Exchange[] = ['HOSE', 'HNX', 'UPCOM']

export const SESSION_MARKETS: readonly SessionMarket[] = ['HOSE', 'HNX', 'UPCOM', 'DERIVATIVES']

export const INDEX_CODES: readonly IndexCode[] = ['VNINDEX', 'VN30', 'HNXINDEX', 'HNX30', 'UPCOMINDEX']

/** Index names are proper nouns and are not translated. */
export const INDEX_LABELS: Record<IndexCode, string> = {
  VNINDEX: 'VN-Index',
  VN30: 'VN30',
  HNXINDEX: 'HNX-Index',
  HNX30: 'HNX30',
  UPCOMINDEX: 'UPCOM-Index',
}

export const INDEX_MARKET: Record<IndexCode, SessionMarket> = {
  VNINDEX: 'HOSE',
  VN30: 'HOSE',
  HNXINDEX: 'HNX',
  HNX30: 'HNX',
  UPCOMINDEX: 'UPCOM',
}

export const SECTORS: readonly Sector[] = [
  'BANKING',
  'REAL_ESTATE',
  'SECURITIES',
  'STEEL',
  'OIL_GAS',
  'RETAIL',
  'TECHNOLOGY',
  'FOOD_BEVERAGE',
  'UTILITIES',
  'TRANSPORT',
  'CONSTRUCTION',
  'CHEMICALS',
  'INSURANCE',
  'INDUSTRIAL',
  'SEAFOOD',
]

export const SECTOR_LABEL_KEYS: Record<Sector, string> = {
  BANKING: 'sector.banking',
  REAL_ESTATE: 'sector.realEstate',
  SECURITIES: 'sector.securities',
  STEEL: 'sector.steel',
  OIL_GAS: 'sector.oilGas',
  RETAIL: 'sector.retail',
  TECHNOLOGY: 'sector.technology',
  FOOD_BEVERAGE: 'sector.foodBeverage',
  UTILITIES: 'sector.utilities',
  TRANSPORT: 'sector.transport',
  CONSTRUCTION: 'sector.construction',
  CHEMICALS: 'sector.chemicals',
  INSURANCE: 'sector.insurance',
  INDUSTRIAL: 'sector.industrial',
  SEAFOOD: 'sector.seafood',
}

export const INSTRUMENT_TYPE_LABEL_KEYS: Record<InstrumentType, string> = {
  STOCK: 'instrumentType.stock',
  ETF: 'instrumentType.etf',
  CW: 'instrumentType.cw',
  FUTURES: 'instrumentType.futures',
}

/** VND per 1 point of a futures contract; used to show futures value in VND. */
export const FUTURES_MULTIPLIER = 100_000

/** Aggressor side of a matched trade (FR-23): B = buyer-initiated, S = seller-initiated, U = ATO/ATC. */
export const TRADE_SIDE_LABEL_KEYS: Record<TradeSide, string> = {
  B: 'trade.side.buy',
  S: 'trade.side.sell',
  U: 'trade.side.unknown',
}

/** Indices shown as chart cards by default (iBoard order); each card can switch index. */
export const DEFAULT_INDEX_CARDS: readonly IndexCode[] = ['VNINDEX', 'VN30', 'HNX30', 'HNXINDEX']
