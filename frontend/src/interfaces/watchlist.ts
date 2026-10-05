export interface Watchlist {
  id: string
  name: string
  /** Display order is the array order (drag to reorder). */
  symbols: string[]
  createdAt: number
}

export interface WatchlistImportResult {
  added: string[]
  unknown: string[]
  duplicates: string[]
}
