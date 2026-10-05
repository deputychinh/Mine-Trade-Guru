import type { IndexQuote, Instrument, Quote } from '@/interfaces/market'
import type { FormatContext } from '@/interfaces/settings'
import type { Snapshot } from '@/interfaces/websocket'

export const VI_CONTEXT: FormatContext = { locale: 'vi', priceUnit: 'thousand', volumeUnit: 'ten' }
export const EN_CONTEXT: FormatContext = { locale: 'en', priceUnit: 'thousand', volumeUnit: 'ten' }

export function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: 'FPT',
    v: 1,
    reference: 100_000,
    ceiling: 107_000,
    floor: 93_000,
    open: null,
    high: null,
    low: null,
    average: null,
    lastPrice: null,
    lastVolume: null,
    lastTradeId: null,
    lastTradeTime: null,
    lastSide: null,
    change: null,
    changePercent: null,
    totalVolume: 0,
    totalValue: 0,
    bids: [
      { price: 99_900, volume: 1_000 },
      { price: 99_800, volume: 500 },
      { price: null, volume: 0 },
    ],
    asks: [
      { price: 100_100, volume: 700 },
      { price: 100_200, volume: 300 },
      { price: 100_300, volume: 200 },
    ],
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    foreignRoom: 1_000_000,
    updatedAt: 0,
    ...overrides,
  }
}

export function makeInstrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    symbol: 'FPT',
    name: 'FPT Corporation',
    exchange: 'HOSE',
    type: 'STOCK',
    sector: 'TECHNOLOGY',
    sharesOutstanding: 1_000_000_000,
    indices: ['VN30'],
    underlying: null,
    conversionRatio: null,
    ...overrides,
  }
}

export function makeIndex(overrides: Partial<IndexQuote> = {}): IndexQuote {
  return {
    code: 'VNINDEX',
    v: 1,
    value: 1_280,
    reference: 1_270,
    change: 10,
    changePercent: 0.79,
    totalVolume: 1_000_000,
    totalValue: 50_000_000_000,
    advancers: 10,
    decliners: 5,
    unchanged: 3,
    ceilingCount: 1,
    floorCount: 0,
    updatedAt: 0,
    ...overrides,
  }
}

export function makeSnapshot(quotes: Quote[] = [makeQuote()]): Snapshot {
  return { serverTime: 0, quotes, indices: [makeIndex()], sessions: [] }
}
