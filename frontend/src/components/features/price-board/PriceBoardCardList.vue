<template>
  <v-virtual-scroll :items="rows" item-key="symbol" :item-height="BOARD_CARD_HEIGHT" class="price-board-card-list">
    <template #default="{ item }">
      <button :key="item.symbol" type="button" class="price-board-card" @click="emit('select', item.symbol)">
        <span class="price-board-card__identity">
          <span class="price-board-card__symbol">
            <v-icon v-if="item.isWatched" :icon="ICONS.watched" color="warning" size="x-small" />
            {{ item.symbol }}
          </span>
          <span class="price-board-card__name">{{ item.instrument.name }}</span>
        </span>
        <span class="price-board-card__figures">
          <span class="price-board-card__price mtg-num" :class="textClass(cellsOf(item).price.color)">
            <span v-if="cellsOf(item).price.marker" aria-hidden="true">{{ cellsOf(item).price.marker }}</span>
            {{ cellsOf(item).price.text }}
            <span v-if="cellsOf(item).price.ariaKey" class="d-sr-only">{{ t(cellsOf(item).price.ariaKey ?? '') }}</span>
          </span>
          <span class="price-board-card__change mtg-num" :class="textClass(cellsOf(item).percent.color)">
            {{ cellsOf(item).percent.text }}
          </span>
        </span>
      </button>
    </template>
  </v-virtual-scroll>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFormatContext } from '@/composables/useFormatContext'
import { ICONS } from '@/constants/icons'
import { BOARD_CARD_HEIGHT } from '@/constants/limits'
import { COLUMNS } from '@/constants/priceBoardColumns'
import type { BoardCell, BoardRow, ColumnDefinition, ColumnKey } from '@/interfaces/board'
import type { MarketColorToken } from '@/interfaces/theme'
import { buildBoardCell } from '@/utils/boardCell'

/** Phone layout (FR-46): one card per symbol with price and change %. */
const { rows } = defineProps<{
  rows: readonly BoardRow[]
}>()

const emit = defineEmits<{
  select: [symbol: string]
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

function column(key: ColumnKey): ColumnDefinition {
  const found = COLUMNS.find((candidate) => candidate.key === key)
  if (!found) throw new Error(`Unknown column ${key}`)
  return found
}

const PRICE_COLUMN = column('lastPrice')
const PERCENT_COLUMN = column('changePercent')

const cache = new WeakMap<BoardRow['quote'], { price: BoardCell; percent: BoardCell }>()

/** Memoized per quote object, so the template can call it several times per card. */
function cellsOf(row: BoardRow): { price: BoardCell; percent: BoardCell } {
  let cells = cache.get(row.quote)
  if (!cells) {
    const type = row.instrument.type
    cells = {
      price: buildBoardCell(PRICE_COLUMN, row.quote, type, formatContext.value),
      percent: buildBoardCell(PERCENT_COLUMN, row.quote, type, formatContext.value),
    }
    cache.set(row.quote, cells)
  }
  return cells
}

function textClass(color: MarketColorToken | null): string {
  return color ? `text-${color}` : ''
}
</script>

<style scoped>
.price-board-card-list {
  height: var(--mtg-board-body-height);
}

.price-board-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mtg-space-3);
  width: 100%;
  height: 100%;
  padding-inline: var(--mtg-space-4);
  border: 0;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.price-board-card:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.price-board-card__identity,
.price-board-card__figures {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.price-board-card__figures {
  align-items: flex-end;
}

.price-board-card__symbol {
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-bold);
}

.price-board-card__name {
  overflow: hidden;
  font-size: var(--mtg-font-label-md);
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.price-board-card__price {
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
}

.price-board-card__change {
  font-size: var(--mtg-font-label-md);
}
</style>
