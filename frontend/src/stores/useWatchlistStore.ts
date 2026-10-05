import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { Watchlist, WatchlistImportResult } from '@/interfaces/watchlist'
import { parseSymbolsCsv, symbolsToCsv } from '@/utils/csv'
import { createId } from '@/utils/id'
import { parseString, parseWatchlists, sanitizeWatchlistName } from '@/utils/storageParsers'

const DEFAULT_LIST_ID = 'default'
/** An empty name means "use the translated default name" in the UI. */
const DEFAULT_LISTS: Watchlist[] = [
  { id: DEFAULT_LIST_ID, name: '', symbols: ['FPT', 'VCB', 'HPG', 'MWG', 'VNM'], createdAt: 0 },
]

/** Multiple named watchlists, persisted locally (FR-30, FR-31). */
export const useWatchlistStore = defineStore('watchlist', () => {
  const lists = useLocalStorage<Watchlist[]>(STORAGE_KEYS.watchlists, DEFAULT_LISTS, parseWatchlists)
  const activeId = useLocalStorage<string>(STORAGE_KEYS.activeWatchlist, DEFAULT_LIST_ID, parseString)

  const activeList = computed<Watchlist>(
    () => lists.value.find((list) => list.id === activeId.value) ?? (lists.value[0] as Watchlist),
  )
  const watchedSymbols = computed(() => new Set(activeList.value.symbols))

  function replace(id: string, update: (list: Watchlist) => Watchlist): void {
    lists.value = lists.value.map((list) => (list.id === id ? update(list) : list))
  }

  function create(name: string): string {
    const id = createId()
    lists.value = [...lists.value, { id, name: sanitizeWatchlistName(name), symbols: [], createdAt: Date.now() }]
    activeId.value = id
    return id
  }

  function rename(id: string, name: string): void {
    replace(id, (list) => ({ ...list, name: sanitizeWatchlistName(name) }))
  }

  /** The last list can't be removed; there is always one to add symbols to. */
  function remove(id: string): void {
    if (lists.value.length <= 1) return
    lists.value = lists.value.filter((list) => list.id !== id)
    if (activeId.value === id) activeId.value = lists.value[0]?.id ?? DEFAULT_LIST_ID
  }

  function setActive(id: string): void {
    if (lists.value.some((list) => list.id === id)) activeId.value = id
  }

  function isWatched(symbol: string): boolean {
    return watchedSymbols.value.has(symbol)
  }

  /** Adds to or removes from the active list; returns whether the symbol is now watched. */
  function toggle(symbol: string): boolean {
    const watched = isWatched(symbol)
    replace(activeList.value.id, (list) => ({
      ...list,
      symbols: watched ? list.symbols.filter((item) => item !== symbol) : [...list.symbols, symbol],
    }))
    return !watched
  }

  /** Drag-to-reorder result; ignores symbols that aren't in the list. */
  function reorder(id: string, symbols: readonly string[]): void {
    replace(id, (list) => {
      const current = new Set(list.symbols)
      const ordered = symbols.filter((symbol) => current.has(symbol))
      const rest = list.symbols.filter((symbol) => !ordered.includes(symbol))
      return { ...list, symbols: [...ordered, ...rest] }
    })
  }

  function importCsv(id: string, text: string, isKnownSymbol: (symbol: string) => boolean): WatchlistImportResult {
    const { symbols, invalid } = parseSymbolsCsv(text)
    const list = lists.value.find((candidate) => candidate.id === id)
    if (!list) return { added: [], unknown: [...invalid], duplicates: [] }
    const existing = new Set(list.symbols)
    const result: WatchlistImportResult = { added: [], unknown: [...invalid], duplicates: [] }
    for (const symbol of symbols) {
      if (!isKnownSymbol(symbol)) result.unknown.push(symbol)
      else if (existing.has(symbol)) result.duplicates.push(symbol)
      else result.added.push(symbol)
    }
    replace(id, (current) => ({ ...current, symbols: [...current.symbols, ...result.added] }))
    return result
  }

  function exportCsv(id: string): string {
    return symbolsToCsv(lists.value.find((list) => list.id === id)?.symbols ?? [])
  }

  return {
    lists,
    activeId,
    activeList,
    watchedSymbols,
    create,
    rename,
    remove,
    setActive,
    isWatched,
    toggle,
    reorder,
    importCsv,
    exportCsv,
  }
})
