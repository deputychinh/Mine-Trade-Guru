import type { IndexCode, IndexQuote, Quote, SessionMarket } from '@/interfaces/market'
import type { SessionState } from '@/interfaces/session'
import type { MarketPatch } from '@/interfaces/worker'

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a === null) return b
  if (b === null) return a
  return Math.max(a, b)
}

/**
 * Combines every patch that arrived within one animation frame into a single store update.
 * Later values win per key; trades keep arrival order.
 */
export function mergePatches(patches: readonly MarketPatch[]): MarketPatch | null {
  if (patches.length === 0) return null
  if (patches.length === 1) return patches[0] ?? null

  const quotes = new Map<string, Quote>()
  const indices = new Map<IndexCode, IndexQuote>()
  const sessions = new Map<SessionMarket, SessionState>()
  const merged: MarketPatch = { quotes: [], indices: [], sessions: [], trades: [], serverTs: null, lastTickAt: null }

  for (const patch of patches) {
    for (const quote of patch.quotes) quotes.set(quote.symbol, quote)
    for (const index of patch.indices) indices.set(index.code, index)
    for (const session of patch.sessions) sessions.set(session.market, session)
    merged.trades.push(...patch.trades)
    merged.serverTs = maxOrNull(merged.serverTs, patch.serverTs)
    merged.lastTickAt = maxOrNull(merged.lastTickAt, patch.lastTickAt)
  }
  merged.quotes = [...quotes.values()]
  merged.indices = [...indices.values()]
  merged.sessions = [...sessions.values()]
  return merged
}
