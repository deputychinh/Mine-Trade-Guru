<template>
  <div class="price-board-header" role="rowgroup">
    <div class="price-board-header__row" role="row">
      <div
        v-for="group in groupSpans"
        :key="group.key"
        class="price-board-header__group"
        role="columnheader"
        :aria-hidden="group.span === 1 || undefined"
        :style="{ '--mtg-span': group.span }"
      >
        {{ group.span > 1 ? t(group.labelKey) : '' }}
      </div>
    </div>
    <div class="price-board-header__row" role="row">
      <div
        v-for="column in columns"
        :key="column.key"
        class="price-board-header__cell"
        :class="{ 'price-board-header__cell--symbol': column.kind === 'symbol' }"
        role="columnheader"
        :aria-sort="ariaSort(column.key)"
      >
        <button v-if="column.isSortable" type="button" class="price-board-header__sort" @click="emit('sort', column.key)">
          {{ t(column.labelKey) }}
          <v-icon
            v-if="sort?.key === column.key"
            :icon="sort.direction === 'asc' ? ICONS.sortAsc : ICONS.sortDesc"
            size="x-small"
          />
        </button>
        <template v-else>{{ t(column.labelKey) }}</template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ICONS } from '@/constants/icons'
import type { ColumnDefinition, ColumnKey, SortState } from '@/interfaces/board'
import { columnGroupSpans } from '@/utils/boardCell'

/** Two-row iBoard header: column groups, then sortable column labels (FR-05). */
const { columns, sort } = defineProps<{
  columns: readonly ColumnDefinition[]
  sort: SortState | null
}>()

const emit = defineEmits<{
  sort: [key: ColumnKey]
}>()

const { t } = useI18n()

const groupSpans = computed(() => columnGroupSpans(columns))

function ariaSort(key: ColumnKey): 'ascending' | 'descending' | undefined {
  if (sort?.key !== key) return undefined
  return sort.direction === 'asc' ? 'ascending' : 'descending'
}
</script>

<style scoped>
.price-board-header {
  background-color: rgb(var(--v-theme-surface-container-high));
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: var(--mtg-font-label-md);
  font-weight: var(--mtg-weight-medium);
}

.price-board-header__row {
  display: grid;
  grid-template-columns: var(--mtg-board-columns);
  min-height: calc(var(--mtg-board-header-height) / 2);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.price-board-header__group {
  grid-column: span var(--mtg-span);
  padding-block: var(--mtg-space-1);
  text-align: center;
  border-inline-start: 1px solid rgb(var(--v-theme-outline-variant));
}

.price-board-header__cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-inline: var(--mtg-board-cell-padding-x);
  padding-block: var(--mtg-space-1);
  white-space: nowrap;
}

.price-board-header__cell--symbol {
  justify-content: flex-start;
}

.price-board-header__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--mtg-space-1);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.price-board-header__sort:hover {
  color: rgb(var(--v-theme-on-surface));
}
</style>
