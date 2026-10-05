import type { BoardDefinition, BoardId } from '@/interfaces/board'

/** Board tabs (FR-03). Adding a board is a new entry here, nothing else (NFR-M4). */
export const BOARDS: readonly BoardDefinition[] = [
  { id: 'VN30', labelKey: 'board.vn30', match: { index: 'VN30' } },
  { id: 'HOSE', labelKey: 'board.hose', match: { exchange: 'HOSE', types: ['STOCK'] } },
  { id: 'HNX30', labelKey: 'board.hnx30', match: { index: 'HNX30' } },
  { id: 'HNX', labelKey: 'board.hnx', match: { exchange: 'HNX', types: ['STOCK'] } },
  { id: 'UPCOM', labelKey: 'board.upcom', match: { exchange: 'UPCOM', types: ['STOCK'] } },
  { id: 'WATCHLIST', labelKey: 'board.watchlist', match: { source: 'watchlist' } },
  { id: 'DERIVATIVES', labelKey: 'board.derivatives', match: { types: ['FUTURES'] } },
  { id: 'CW', labelKey: 'board.cw', match: { types: ['CW'] } },
  { id: 'ETF', labelKey: 'board.etf', match: { types: ['ETF'] } },
  { id: 'SECTOR', labelKey: 'board.sector', match: { source: 'sector', types: ['STOCK'] } },
]

export const DEFAULT_BOARD: BoardId = 'VN30'
