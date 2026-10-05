<template>
  <BaseCard color="surface-container-low" :has-padding="false" class="index-table">
    <table class="index-table__table">
      <thead>
        <tr>
          <th scope="col" class="index-table__name">{{ t('overview.table.index') }}</th>
          <th scope="col">{{ t('overview.table.points') }}</th>
          <th scope="col">
            <button type="button" class="index-table__toggle" :aria-label="t('overview.table.toggleChange')" @click="isPercent = !isPercent">
              ‹ {{ isPercent ? t('overview.table.percent') : t('overview.table.change') }} ›
            </button>
          </th>
          <th scope="col">{{ t('overview.table.volume') }}</th>
          <th scope="col">{{ t('overview.table.value') }}</th>
          <th scope="col">{{ t('overview.table.breadth') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.code">
          <th scope="row" class="index-table__name">{{ INDEX_LABELS[row.code] }}</th>
          <td class="mtg-num" :class="row.colorClass">{{ formatIndex(row.index?.value, formatContext) }}</td>
          <td class="mtg-num" :class="row.colorClass">
            {{ isPercent ? formatPercent(row.index?.changePercent, formatContext) : formatIndexChange(row.index?.change, formatContext) }}
          </td>
          <td class="mtg-num">{{ formatMillions(row.index?.totalVolume, formatContext) }}</td>
          <td class="mtg-num">{{ formatValue(row.index?.totalValue, formatContext) }}</td>
          <td class="mtg-num index-table__breadth">
            <template v-if="row.index">
              <span class="text-market-up">▲{{ row.index.advancers }}</span>
              <span class="text-market-reference">■{{ row.index.unchanged }}</span>
              <span class="text-market-down">▼{{ row.index.decliners }}</span>
              <span class="d-sr-only">
                {{ t('overview.breadthSummary', { exchange: INDEX_LABELS[row.code], advancers: row.index.advancers, unchanged: row.index.unchanged, decliners: row.index.decliners }) }}
              </span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { INDEX_LABELS } from '@/constants/market'
import type { IndexCode, IndexQuote } from '@/interfaces/market'
import { indexColor } from '@/utils/priceColor'
import { formatIndex, formatIndexChange, formatMillions, formatPercent, formatValue } from '@/utils/priceFormat'

/**
 * All indices at a glance, iBoard style (FR-10). The +/- column toggles to %.
 * Takes fresh rows (not the store's Map, whose identity never changes) so it re-renders on ticks.
 */
const { rows: indexRows } = defineProps<{
  rows: ReadonlyArray<{ code: IndexCode; index: IndexQuote | undefined }>
}>()

const { t } = useI18n()
const formatContext = useFormatContext()
const isPercent = ref(false)

const rows = computed(() =>
  indexRows.map(({ code, index }) => {
    const color = indexColor(index?.change)
    return { code, index, colorClass: color ? `text-${color}` : '' }
  }),
)
</script>

<style scoped>
.index-table {
  overflow-x: auto;
}

.index-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mtg-font-body-sm);
  white-space: nowrap;
}

.index-table__table th,
.index-table__table td {
  padding: var(--mtg-space-1) var(--mtg-space-2);
  text-align: end;
}

.index-table__table thead th {
  font-size: var(--mtg-font-label-md);
  font-weight: var(--mtg-weight-medium);
  color: rgb(var(--v-theme-on-surface-variant));
}

.index-table__table tbody tr:nth-child(even) {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.index-table__table .index-table__name {
  font-weight: var(--mtg-weight-medium);
  text-align: start;
}

.index-table__toggle {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.index-table__breadth {
  display: flex;
  justify-content: flex-end;
  gap: var(--mtg-space-2);
}
</style>
