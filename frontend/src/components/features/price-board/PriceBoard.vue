<template>
  <BaseCard :has-padding="false" class="price-board">
    <PriceBoardToolbar
      v-model:board-id="boardId"
      v-model:sector="sector"
      v-model:filter-text="filterText"
      :watchlist-count="watchlistStore.activeList.symbols.length"
      :groups="COLUMN_GROUPS"
      :group-order="boardStore.layout.groupOrder"
      :hidden-groups="boardStore.layout.hiddenGroups"
      @toggle-group="boardStore.toggleGroup"
      @reorder-groups="boardStore.setGroupOrder"
      @reset-layout="boardStore.resetLayout"
    />
    <BaseErrorState
      v-if="instrumentStore.status === 'error'"
      :title="t('board.loadError')"
      :message="instrumentStore.error ?? ''"
      :retry-label="t('common.retry')"
      @retry="instrumentStore.load"
    />
    <BaseSkeleton v-else-if="isLoading" type="table-row@12" :label="t('common.loading')" />
    <BaseEmptyState v-else-if="rows.length === 0" :icon="emptyState.icon" :title="emptyState.title" :text="emptyState.text" />
    <PriceBoardCardList v-else-if="isPhone" :rows="rows" @select="select" />
    <div
      v-else
      class="price-board__scroll"
      :style="{ '--mtg-board-columns': gridTemplate }"
      role="table"
      :aria-label="t(boardStore.activeBoard.labelKey)"
      :aria-rowcount="rows.length"
    >
      <PriceBoardHeader :columns="columns" :sort="boardStore.sort" @sort="boardStore.toggleSort" />
      <PriceBoardBody
        :rows="rows"
        :columns="columns"
        :row-height="rowHeight"
        :focused-symbol="boardStore.focusedSymbol"
        :is-flash-enabled="settingsStore.settings.isFlashEnabled"
        @select="select"
        @toggle-watch="watchlistStore.toggle"
        @toggle-pin="boardStore.togglePin"
      />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import BaseErrorState from '@/components/base/BaseErrorState.vue'
import BaseSkeleton from '@/components/base/BaseSkeleton.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import type { IconName } from '@/constants/icons'
import { BOARD_ROW_HEIGHT } from '@/constants/limits'
import { COLUMN_GROUPS, NARROW_VISIBLE_GROUPS } from '@/constants/priceBoardColumns'
import type { BoardId, BoardRow } from '@/interfaces/board'
import type { Sector } from '@/interfaces/market'
import { useBoardStore } from '@/stores/useBoardStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import { useWatchlistStore } from '@/stores/useWatchlistStore'
import { symbolsForBoard } from '@/utils/boardFilter'
import { boardGridTemplate } from '@/utils/boardCell'
import { sortBoardRows } from '@/utils/quoteSort'
import PriceBoardBody from './PriceBoardBody.vue'
import PriceBoardCardList from './PriceBoardCardList.vue'
import PriceBoardHeader from './PriceBoardHeader.vue'
import PriceBoardToolbar from './PriceBoardToolbar.vue'

/** Container: turns store state into rows and routes row events to stores (FR-01 … FR-08, FR-46). */
const boardStore = useBoardStore()
const instrumentStore = useInstrumentStore()
const marketStore = useMarketStore()
const settingsStore = useSettingsStore()
const detailStore = useSymbolDetailStore()
const watchlistStore = useWatchlistStore()
const { t } = useI18n()
const { xs, mdAndDown } = useDisplay()

const boardId = computed<BoardId>({
  get: () => boardStore.activeBoardId,
  set: (id) => boardStore.setBoard(id),
})
const sector = computed<Sector>({
  get: () => boardStore.sector,
  set: (next) => boardStore.setSector(next),
})
const filterText = computed<string | null>({
  get: () => boardStore.filterText,
  set: (text) => boardStore.setFilterText(text ?? ''),
})

const isLoading = computed(() => instrumentStore.status !== 'ready' || !marketStore.hasSnapshot)
const isPhone = computed(() => xs.value)

/** Symbols on the active board; changes only with board, catalogue or watchlist — not per tick. */
const boardSymbols = computed(() => {
  const symbols = symbolsForBoard(boardStore.activeBoard, instrumentStore.instruments, instrumentStore.bySymbol, {
    watchlistSymbols: watchlistStore.activeList.symbols,
    sector: boardStore.sector,
  })
  const query = boardStore.filterText.trim().toUpperCase()
  return query ? symbols.filter((symbol) => symbol.startsWith(query)) : symbols
})

/** Re-evaluated once per applied patch (one triggerRef per frame), never per message. */
const rows = computed<BoardRow[]>(() => {
  const quotes = marketStore.quotes
  const pinned = boardStore.pinnedSet
  const watched = watchlistStore.watchedSymbols
  const result: BoardRow[] = []
  for (const symbol of boardSymbols.value) {
    const quote = quotes.get(symbol)
    const instrument = instrumentStore.bySymbol.get(symbol)
    if (!quote || !instrument) continue
    result.push({ symbol, instrument, quote, isPinned: pinned.has(symbol), isWatched: watched.has(symbol) })
  }
  return sortBoardRows(result, boardStore.sort)
})

const columns = computed(() =>
  mdAndDown.value
    ? boardStore.visibleColumns.filter((column) => NARROW_VISIBLE_GROUPS.includes(column.group))
    : boardStore.visibleColumns,
)
const gridTemplate = computed(() => boardGridTemplate(columns.value))
const rowHeight = computed(() =>
  settingsStore.settings.fontScale === 'large' ? BOARD_ROW_HEIGHT.large : BOARD_ROW_HEIGHT[settingsStore.settings.density],
)

const emptyState = computed<{ icon: IconName; title: string; text: string }>(() =>
  boardStore.activeBoardId === 'WATCHLIST' && boardStore.filterText === ''
    ? { icon: 'unwatched', title: t('board.emptyWatchlistTitle'), text: t('board.emptyWatchlistText') }
    : { icon: 'search', title: t('board.emptyTitle'), text: t('board.emptyText') },
)

function select(symbol: string): void {
  boardStore.focus(symbol)
  void detailStore.open(symbol)
}

function withFocused(action: (symbol: string) => void): () => void {
  return () => {
    if (boardStore.focusedSymbol !== null) action(boardStore.focusedSymbol)
  }
}

// Row-level shortcuts live here because only the board knows the visible row order (FR-41).
useKeyboardShortcuts({
  rowUp: () =>
    boardStore.moveFocus(
      -1,
      rows.value.map((row) => row.symbol),
    ),
  rowDown: () =>
    boardStore.moveFocus(
      1,
      rows.value.map((row) => row.symbol),
    ),
  openDetail: withFocused(select),
  toggleWatch: withFocused((symbol) => void watchlistStore.toggle(symbol)),
})
</script>

<style scoped>
.price-board {
  overflow: hidden;
}

.price-board__scroll {
  overflow-x: auto;
}

.price-board__scroll > * {
  min-width: max-content;
}
</style>
