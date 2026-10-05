<template>
  <BaseCard :title="t('overview.movers.title')" :has-padding="false" class="top-movers">
    <BaseTabs v-model="category" :items="tabs" :label="t('overview.movers.title')" />
    <ol v-if="movers[category].length > 0" class="top-movers__list">
      <li v-for="mover in movers[category]" :key="mover.symbol">
        <button type="button" class="top-movers__row" @click="emit('select', mover.symbol)">
          <span class="top-movers__symbol">{{ mover.symbol }}</span>
          <span class="mtg-num">{{ formatPrice(mover.lastPrice, 'STOCK', formatContext) }}</span>
          <span class="mtg-num" :class="colorClass(mover.changePercent)">{{ formatPercent(mover.changePercent, formatContext) }}</span>
          <span class="mtg-num top-movers__secondary">{{ secondary(mover) }}</span>
        </button>
      </li>
    </ol>
    <BaseEmptyState v-else :title="t('overview.movers.empty')" />
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { MOVER_CATEGORIES } from '@/constants/overview'
import type { Mover, MoverCategory, TopMovers } from '@/interfaces/overview'
import type { TabItem } from '@/interfaces/ui'
import { indexColor } from '@/utils/priceColor'
import { formatCompact, formatPercent, formatPrice, formatValue } from '@/utils/priceFormat'

/** Top 10 gainers / losers / volume / value (FR-12); a row opens the symbol. */
const { movers } = defineProps<{
  movers: TopMovers
}>()

const emit = defineEmits<{
  select: [symbol: string]
}>()

const { t } = useI18n()
const formatContext = useFormatContext()
const category = ref<MoverCategory>('gainers')

const tabs = computed<TabItem<MoverCategory>[]>(() =>
  MOVER_CATEGORIES.map((item) => ({ value: item.category, label: t(item.labelKey) })),
)

function colorClass(changePercent: number | null): string {
  const color = indexColor(changePercent)
  return color ? `text-${color}` : ''
}

/** Third figure follows the ranking: value for the value tab, volume otherwise. */
function secondary(mover: Mover): string {
  return category.value === 'value'
    ? `${formatValue(mover.totalValue, formatContext.value)} ${t('unit.billion')}`
    : formatCompact(mover.totalVolume, formatContext.value)
}
</script>

<style scoped>
.top-movers__list {
  max-height: var(--mtg-panel-list-height);
  margin: 0;
  padding: var(--mtg-space-1) 0;
  overflow-y: auto;
  list-style: none;
}

.top-movers__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: var(--mtg-space-2);
  width: 100%;
  padding: var(--mtg-space-1) var(--mtg-space-4);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: var(--mtg-font-body-sm);
  text-align: start;
  cursor: pointer;
}

.top-movers__row:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.top-movers__symbol {
  font-weight: var(--mtg-weight-bold);
}

.top-movers__secondary {
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
