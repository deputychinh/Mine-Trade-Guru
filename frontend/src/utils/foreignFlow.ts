import type { Instrument, Quote } from '@/interfaces/market'
import type { ForeignFlow, ForeignFlowEntry } from '@/interfaces/overview'

/** Top net foreign buyers and sellers by VND value, stocks and ETFs (FR-13). */
export function computeForeignFlow(
  quotes: Iterable<Quote>,
  instrumentsBySymbol: ReadonlyMap<string, Instrument>,
  count: number,
): ForeignFlow {
  const entries: ForeignFlowEntry[] = []
  for (const quote of quotes) {
    const type = instrumentsBySymbol.get(quote.symbol)?.type
    if (type !== 'STOCK' && type !== 'ETF') continue
    const netVolume = quote.foreignBuyVolume - quote.foreignSellVolume
    if (netVolume === 0) continue
    entries.push({
      symbol: quote.symbol,
      buyVolume: quote.foreignBuyVolume,
      sellVolume: quote.foreignSellVolume,
      netVolume,
      netValue: netVolume * (quote.lastPrice ?? quote.reference),
    })
  }
  return {
    topNetBuy: entries
      .filter((entry) => entry.netValue > 0)
      .sort((a, b) => b.netValue - a.netValue)
      .slice(0, count),
    topNetSell: entries
      .filter((entry) => entry.netValue < 0)
      .sort((a, b) => a.netValue - b.netValue)
      .slice(0, count),
  }
}
