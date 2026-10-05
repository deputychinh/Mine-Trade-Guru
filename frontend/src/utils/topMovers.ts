import type { Instrument, Quote } from '@/interfaces/market'
import type { Mover, TopMovers } from '@/interfaces/overview'

function toMover(quote: Quote): Mover {
  return {
    symbol: quote.symbol,
    lastPrice: quote.lastPrice,
    change: quote.change,
    changePercent: quote.changePercent,
    totalVolume: quote.totalVolume,
    totalValue: quote.totalValue,
  }
}

function top(movers: readonly Mover[], compare: (a: Mover, b: Mover) => number, count: number): Mover[] {
  return [...movers].sort(compare).slice(0, count)
}

/** Top gainers / losers / by volume / by value among traded stocks (FR-12). */
export function computeTopMovers(
  quotes: Iterable<Quote>,
  instrumentsBySymbol: ReadonlyMap<string, Instrument>,
  count: number,
): TopMovers {
  const traded: Mover[] = []
  for (const quote of quotes) {
    if (quote.lastPrice === null) continue
    if (instrumentsBySymbol.get(quote.symbol)?.type !== 'STOCK') continue
    traded.push(toMover(quote))
  }
  const percent = (mover: Mover) => mover.changePercent ?? 0
  return {
    gainers: top(traded.filter((m) => percent(m) > 0), (a, b) => percent(b) - percent(a), count),
    losers: top(traded.filter((m) => percent(m) < 0), (a, b) => percent(a) - percent(b), count),
    volume: top(traded, (a, b) => b.totalVolume - a.totalVolume, count),
    value: top(traded, (a, b) => b.totalValue - a.totalValue, count),
  }
}
