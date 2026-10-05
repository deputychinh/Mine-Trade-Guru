import type { ColumnKey } from '@/interfaces/board'
import type { PriceLevel, Quote } from '@/interfaces/market'

function levelPrice(levels: readonly PriceLevel[], index: number): number | null {
  return levels[index]?.price ?? null
}

function levelVolume(levels: readonly PriceLevel[], index: number): number | null {
  const level = levels[index]
  return level && level.price !== null ? level.volume : null
}

/** One getter per column: a cell lookup is a single function call, no switch per render. */
const GETTERS: Record<ColumnKey, (quote: Quote) => number | null> = {
  symbol: () => null,
  ceiling: (quote) => quote.ceiling,
  floor: (quote) => quote.floor,
  reference: (quote) => quote.reference,
  bid3Price: (quote) => levelPrice(quote.bids, 2),
  bid3Volume: (quote) => levelVolume(quote.bids, 2),
  bid2Price: (quote) => levelPrice(quote.bids, 1),
  bid2Volume: (quote) => levelVolume(quote.bids, 1),
  bid1Price: (quote) => levelPrice(quote.bids, 0),
  bid1Volume: (quote) => levelVolume(quote.bids, 0),
  lastPrice: (quote) => quote.lastPrice,
  lastVolume: (quote) => quote.lastVolume,
  change: (quote) => quote.change,
  changePercent: (quote) => quote.changePercent,
  ask1Price: (quote) => levelPrice(quote.asks, 0),
  ask1Volume: (quote) => levelVolume(quote.asks, 0),
  ask2Price: (quote) => levelPrice(quote.asks, 1),
  ask2Volume: (quote) => levelVolume(quote.asks, 1),
  ask3Price: (quote) => levelPrice(quote.asks, 2),
  ask3Volume: (quote) => levelVolume(quote.asks, 2),
  totalVolume: (quote) => quote.totalVolume,
  totalValue: (quote) => quote.totalValue,
  open: (quote) => quote.open,
  high: (quote) => quote.high,
  low: (quote) => quote.low,
  average: (quote) => quote.average,
  foreignBuy: (quote) => quote.foreignBuyVolume,
  foreignSell: (quote) => quote.foreignSellVolume,
  foreignRoom: (quote) => quote.foreignRoom,
}

export function columnValue(quote: Quote, key: ColumnKey): number | null {
  return GETTERS[key](quote)
}
