import type { BoardDefinition, BoardMatch } from '@/interfaces/board'
import type { Instrument, Sector } from '@/interfaces/market'

export interface BoardContext {
  watchlistSymbols: readonly string[]
  sector: Sector | null
}

export function matchesBoard(instrument: Instrument, match: BoardMatch, context: BoardContext): boolean {
  if (match.exchange && instrument.exchange !== match.exchange) return false
  if (match.types && !match.types.includes(instrument.type)) return false
  if (match.index && !instrument.indices.includes(match.index)) return false
  if (match.source === 'sector') return context.sector !== null && instrument.sector === context.sector
  return true
}

/**
 * Symbols on a board, in display order. The watchlist board keeps the user's drag order
 * (FR-30); other boards follow catalogue order until a sort is chosen.
 */
export function symbolsForBoard(
  board: BoardDefinition,
  instruments: readonly Instrument[],
  instrumentsBySymbol: ReadonlyMap<string, Instrument>,
  context: BoardContext,
): string[] {
  if (board.match.source === 'watchlist') {
    return context.watchlistSymbols.filter((symbol) => instrumentsBySymbol.has(symbol))
  }
  return instruments
    .filter((instrument) => matchesBoard(instrument, board.match, context))
    .map((instrument) => instrument.symbol)
}
