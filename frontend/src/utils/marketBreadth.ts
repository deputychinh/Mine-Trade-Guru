import { EXCHANGES } from '@/constants/market'
import type { Instrument, Quote } from '@/interfaces/market'
import type { ExchangeBreadth, MarketBreadth } from '@/interfaces/overview'

export function emptyBreadth(): MarketBreadth {
  return { advancers: 0, decliners: 0, unchanged: 0, ceiling: 0, floor: 0, total: 0 }
}

/**
 * Advance / decline / unchanged per exchange, stocks only (FR-11).
 * Untraded symbols count as unchanged; ceiling and floor are subsets of advancers and decliners.
 */
export function computeBreadth(
  quotes: Iterable<Quote>,
  instrumentsBySymbol: ReadonlyMap<string, Instrument>,
): ExchangeBreadth {
  const result = Object.fromEntries(EXCHANGES.map((exchange) => [exchange, emptyBreadth()])) as ExchangeBreadth
  for (const quote of quotes) {
    const instrument = instrumentsBySymbol.get(quote.symbol)
    if (!instrument || instrument.type !== 'STOCK') continue
    const breadth = result[instrument.exchange]
    breadth.total++
    const last = quote.lastPrice
    if (last === null || last === quote.reference) {
      breadth.unchanged++
      continue
    }
    if (last > quote.reference) breadth.advancers++
    else breadth.decliners++
    if (last === quote.ceiling) breadth.ceiling++
    if (last === quote.floor) breadth.floor++
  }
  return result
}
