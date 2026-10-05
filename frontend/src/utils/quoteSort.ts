import type { BoardRow, SortState } from '@/interfaces/board'
import { columnValue } from './columnValue'

/**
 * Pinned rows first (FR-08), then the chosen column. Missing values sort last in both
 * directions so empty rows never jump to the top; ties fall back to symbol for a stable order.
 */
export function compareBoardRows(a: BoardRow, b: BoardRow, sort: SortState | null): number {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
  if (sort === null) return 0

  const direction = sort.direction === 'asc' ? 1 : -1
  if (sort.key === 'symbol') return a.symbol.localeCompare(b.symbol) * direction

  const left = columnValue(a.quote, sort.key)
  const right = columnValue(b.quote, sort.key)
  if (left === null && right === null) return a.symbol.localeCompare(b.symbol)
  if (left === null) return 1
  if (right === null) return -1
  if (left !== right) return (left - right) * direction
  return a.symbol.localeCompare(b.symbol)
}

/** Returns a new array; with no sort, keeps the incoming order (board / watchlist order). */
export function sortBoardRows(rows: readonly BoardRow[], sort: SortState | null): BoardRow[] {
  return [...rows].sort((a, b) => compareBoardRows(a, b, sort))
}
