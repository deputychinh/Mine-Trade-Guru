<template>
  <v-virtual-scroll ref="scroller" :items="rows" item-key="symbol" :item-height="rowHeight" class="price-board-body" role="rowgroup">
    <template #default="{ item }">
      <PriceBoardRow
        :key="item.symbol"
        v-memo="[item.quote, item.isPinned, item.isWatched, item.symbol === focusedSymbol, columns, isFlashEnabled]"
        :row="item"
        :columns="columns"
        :is-focused="item.symbol === focusedSymbol"
        :is-flash-enabled="isFlashEnabled"
        @select="emit('select', $event)"
        @toggle-watch="emit('toggleWatch', $event)"
        @toggle-pin="emit('togglePin', $event)"
      />
    </template>
  </v-virtual-scroll>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import type { BoardRow, ColumnDefinition } from '@/interfaces/board'
import PriceBoardRow from './PriceBoardRow.vue'

/**
 * Virtualized rows (NFR-P3): only the visible ~40 rows exist in the DOM. Rows are keyed by
 * symbol so a recycled slot never flashes with another symbol's change.
 */
const { rows, columns, rowHeight, focusedSymbol, isFlashEnabled } = defineProps<{
  rows: readonly BoardRow[]
  columns: readonly ColumnDefinition[]
  rowHeight: number
  focusedSymbol: string | null
  isFlashEnabled: boolean
}>()

const emit = defineEmits<{
  select: [symbol: string]
  toggleWatch: [symbol: string]
  togglePin: [symbol: string]
}>()

const scroller = useTemplateRef<{ scrollToIndex: (index: number) => void }>('scroller')

// Keyboard focus (↑/↓) keeps the focused row on screen.
watch(
  () => focusedSymbol,
  (symbol) => {
    if (symbol === null) return
    const index = rows.findIndex((row) => row.symbol === symbol)
    if (index >= 0) scroller.value?.scrollToIndex(index)
  },
)
</script>

<style scoped>
.price-board-body {
  height: var(--mtg-board-body-height);
}
</style>
