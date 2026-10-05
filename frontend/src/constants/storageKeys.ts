/** Versioned so a stored shape can change without reading stale data. */
export const STORAGE_KEYS = {
  settings: 'mtg.settings.v1',
  watchlists: 'mtg.watchlists.v1',
  activeWatchlist: 'mtg.activeWatchlist.v1',
  boardLayout: 'mtg.boardLayout.v1',
  activeBoard: 'mtg.activeBoard.v1',
  pinnedSymbols: 'mtg.pinnedSymbols.v1',
  alertRules: 'mtg.alertRules.v1',
  alertEvents: 'mtg.alertEvents.v1',
  overviewExpanded: 'mtg.overviewExpanded.v1',
  indexCards: 'mtg.indexCards.v1',
} as const
