import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { BOARDS, DEFAULT_BOARD } from '@/constants/boards'
import { SECTORS } from '@/constants/market'
import { COLUMN_GROUPS, COLUMNS, DEFAULT_GROUP_ORDER, DEFAULT_HIDDEN_GROUPS } from '@/constants/priceBoardColumns'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { BoardDefinition, BoardId, ColumnDefinition, ColumnGroupKey, ColumnKey, SortState } from '@/interfaces/board'
import type { Sector } from '@/interfaces/market'
import { parseBoardId, parseBoardLayout, parseSymbols, type BoardLayout } from '@/utils/storageParsers'

const DEFAULT_LAYOUT: BoardLayout = {
  groupOrder: [...DEFAULT_GROUP_ORDER],
  hiddenGroups: [...DEFAULT_HIDDEN_GROUPS],
}
const FIXED_GROUPS = new Set(COLUMN_GROUPS.filter((group) => group.isFixed).map((group) => group.key))

/** Board UI state: active tab, sort, column layout, pinned rows, keyboard focus (FR-03, FR-05, FR-08, FR-41). */
export const useBoardStore = defineStore('board', () => {
  const activeBoardId = useLocalStorage<BoardId>(STORAGE_KEYS.activeBoard, DEFAULT_BOARD, parseBoardId)
  const layout = useLocalStorage<BoardLayout>(STORAGE_KEYS.boardLayout, DEFAULT_LAYOUT, parseBoardLayout)
  const pinnedSymbols = useLocalStorage<string[]>(STORAGE_KEYS.pinnedSymbols, [], parseSymbols)
  const sector = ref<Sector>(SECTORS[0] ?? 'BANKING')
  const sort = ref<SortState | null>(null)
  const filterText = ref('')
  const focusedSymbol = ref<string | null>(null)

  const activeBoard = computed<BoardDefinition>(
    () => BOARDS.find((board) => board.id === activeBoardId.value) ?? (BOARDS[0] as BoardDefinition),
  )
  const pinnedSet = computed(() => new Set(pinnedSymbols.value))

  /** Visible columns in display order: group order first, then each group's own column order. */
  const visibleColumns = computed<ColumnDefinition[]>(() => {
    const hidden = new Set(layout.value.hiddenGroups)
    return layout.value.groupOrder
      .filter((group) => !hidden.has(group))
      .flatMap((group) => COLUMNS.filter((column) => column.group === group))
  })

  function setBoard(id: BoardId): void {
    activeBoardId.value = id
    focusedSymbol.value = null
  }

  function setSector(next: Sector): void {
    sector.value = next
  }

  /** Header click cycles: descending → ascending → unsorted (FR-05). */
  function toggleSort(key: ColumnKey): void {
    if (sort.value?.key !== key) sort.value = { key, direction: 'desc' }
    else if (sort.value.direction === 'desc') sort.value = { key, direction: 'asc' }
    else sort.value = null
  }

  function setGroupOrder(order: readonly ColumnGroupKey[]): void {
    const fixed = layout.value.groupOrder.filter((group) => FIXED_GROUPS.has(group))
    const movable = order.filter((group) => !FIXED_GROUPS.has(group))
    layout.value = { ...layout.value, groupOrder: [...fixed, ...movable] }
  }

  function toggleGroup(group: ColumnGroupKey): void {
    if (FIXED_GROUPS.has(group)) return
    const hidden = new Set(layout.value.hiddenGroups)
    if (hidden.has(group)) hidden.delete(group)
    else hidden.add(group)
    layout.value = { ...layout.value, hiddenGroups: [...hidden] }
  }

  function resetLayout(): void {
    layout.value = structuredClone(DEFAULT_LAYOUT)
  }

  function togglePin(symbol: string): void {
    pinnedSymbols.value = pinnedSet.value.has(symbol)
      ? pinnedSymbols.value.filter((pinned) => pinned !== symbol)
      : [...pinnedSymbols.value, symbol]
  }

  function setFilterText(text: string): void {
    filterText.value = text
  }

  function focus(symbol: string | null): void {
    focusedSymbol.value = symbol
  }

  /** Arrow keys: move focus within the rows currently shown (FR-41). */
  function moveFocus(step: 1 | -1, symbols: readonly string[]): void {
    if (symbols.length === 0) return
    const index = focusedSymbol.value === null ? -1 : symbols.indexOf(focusedSymbol.value)
    const next = index === -1 ? (step > 0 ? 0 : symbols.length - 1) : Math.min(symbols.length - 1, Math.max(0, index + step))
    focusedSymbol.value = symbols[next] ?? null
  }

  return {
    activeBoardId,
    activeBoard,
    layout,
    pinnedSymbols,
    pinnedSet,
    sector,
    sort,
    filterText,
    focusedSymbol,
    visibleColumns,
    setBoard,
    setSector,
    toggleSort,
    setGroupOrder,
    toggleGroup,
    resetLayout,
    togglePin,
    setFilterText,
    focus,
    moveFocus,
  }
})
