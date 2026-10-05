<template>
  <div
    class="price-board-row"
    :class="{ 'price-board-row--focused': isFocused, 'price-board-row--pinned': row.isPinned }"
    role="row"
    :aria-current="isFocused || undefined"
    @click="emit('select', row.symbol)"
  >
    <template v-for="cell in cells" :key="cell.key">
      <div v-if="cell.kind === 'symbol'" class="price-board-row__symbol" role="rowheader">
        <button
          type="button"
          class="price-board-row__icon-button"
          :aria-label="t(row.isWatched ? 'watchlist.removeSymbol' : 'watchlist.addSymbol', { symbol: row.symbol })"
          :aria-pressed="row.isWatched"
          @click.stop="emit('toggleWatch', row.symbol)"
        >
          <v-icon :icon="row.isWatched ? ICONS.watched : ICONS.unwatched" :color="row.isWatched ? 'warning' : undefined" size="x-small" />
        </button>
        <span class="price-board-row__code" :class="cell.color ? `text-${cell.color}` : ''">
          {{ cell.text }}<span v-if="cell.marker" class="price-board-row__marker" aria-hidden="true">{{ cell.marker }}</span>
        </span>
        <button
          type="button"
          class="price-board-row__icon-button price-board-row__pin"
          :class="{ 'price-board-row__pin--active': row.isPinned }"
          :aria-label="t(row.isPinned ? 'board.unpinSymbol' : 'board.pinSymbol', { symbol: row.symbol })"
          :aria-pressed="row.isPinned"
          @click.stop="emit('togglePin', row.symbol)"
        >
          <v-icon :icon="ICONS.pin" size="x-small" />
        </button>
      </div>
      <VolumeCell
        v-else-if="cell.kind === 'volume' || cell.kind === 'value'"
        :text="cell.text"
        :color="cell.color"
        :flash-value="cell.flashValue"
        :is-flash-enabled="isFlashEnabled"
      />
      <PriceCell
        v-else
        :text="cell.text"
        :color="cell.color"
        :marker="cell.marker"
        :aria-text="cell.ariaKey ? t(cell.ariaKey) : ''"
        :flash-value="cell.flashValue"
        :is-flash-enabled="isFlashEnabled"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatContext } from '@/composables/useFormatContext'
import { ICONS } from '@/constants/icons'
import type { BoardRow, ColumnDefinition } from '@/interfaces/board'
import { buildBoardCell } from '@/utils/boardCell'
import PriceCell from './PriceCell.vue'
import VolumeCell from './VolumeCell.vue'

/** One symbol on the board. Rendered under v-memo, so it only updates when its quote changes. */
const { row, columns, isFocused, isFlashEnabled } = defineProps<{
  row: BoardRow
  columns: readonly ColumnDefinition[]
  isFocused: boolean
  isFlashEnabled: boolean
}>()

const emit = defineEmits<{
  select: [symbol: string]
  toggleWatch: [symbol: string]
  togglePin: [symbol: string]
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const cells = computed(() =>
  columns.map((column) => buildBoardCell(column, row.quote, row.instrument.type, formatContext.value)),
)
</script>

<style scoped>
.price-board-row {
  display: grid;
  grid-template-columns: var(--mtg-board-columns);

  /* Cells fill the full row height so a flash colors the whole cell, not just the text line. */
  align-items: stretch;
  height: var(--mtg-board-row-height);
  font-size: var(--mtg-board-font-size);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  cursor: pointer;
}

.price-board-row:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.price-board-row--pinned {
  background-color: color-mix(in srgb, rgb(var(--v-theme-secondary-container)) calc(var(--mtg-state-dragged) * 100%), transparent);
}

.price-board-row--focused {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) calc(var(--mtg-state-selected) * 100%), transparent);
  box-shadow: inset var(--mtg-focus-ring-width) 0 0 rgb(var(--v-theme-primary));
}

.price-board-row__symbol {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
  padding-inline: var(--mtg-space-1);
  min-width: 0;
}

.price-board-row__code {
  flex: 1;
  font-weight: var(--mtg-weight-bold);
  white-space: nowrap;
}

.price-board-row__marker {
  margin-inline-start: var(--mtg-space-1);
  font-size: var(--mtg-board-marker-size);
  vertical-align: middle;
}

.price-board-row__icon-button {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: none;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  border-radius: var(--mtg-shape-xs);
}

.price-board-row__pin {
  opacity: 0;
  transition: opacity var(--mtg-duration-short2) var(--mtg-easing-standard);
}

.price-board-row__pin:focus-visible,
.price-board-row__pin--active {
  opacity: 1;
}

.price-board-row:hover .price-board-row__pin {
  opacity: 1;
}

.price-board-row__pin--active {
  color: rgb(var(--v-theme-primary));
}

@media (prefers-reduced-motion: reduce) {
  .price-board-row__pin {
    transition: none;
  }
}
</style>
