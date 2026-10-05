<template>
  <BaseCard color="surface-container-low" :has-padding="false" class="index-card">
    <IndexChart :points="history" :reference="index?.reference ?? null" :label="t('overview.chart', { index: INDEX_LABELS[code] })" />
    <div class="index-card__footer">
      <div class="index-card__row">
        <BaseMenu location="bottom">
          <template #activator="{ props: activatorProps }">
            <button v-bind="activatorProps" type="button" class="index-card__name" :aria-label="t('overview.chooseIndex')">
              {{ INDEX_LABELS[code] }}
              <v-icon :icon="ICONS.expand" size="x-small" />
            </button>
          </template>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="option in selectableCodes"
              :key="option"
              :title="INDEX_LABELS[option]"
              :active="option === code"
              @click="emit('select', option)"
            />
          </v-list>
        </BaseMenu>
        <span class="mtg-num" :class="colorClass">
          <span v-if="marker" aria-hidden="true">{{ marker.symbol }}</span>
          {{ formatIndex(index?.value, formatContext) }}
          <template v-if="index">
            ({{ formatIndexChange(index.change, formatContext) }} {{ formatPercent(index.changePercent, formatContext) }})
          </template>
          <span v-if="marker" class="d-sr-only">{{ t(marker.ariaKey) }}</span>
        </span>
      </div>
      <div v-if="index" class="index-card__row index-card__row--muted mtg-num">
        <span>{{ formatShares(index.totalVolume, formatContext) }} {{ t('unit.shares') }}</span>
        <span>{{ formatValue(index.totalValue, formatContext) }} {{ t('unit.billionTitle') }}</span>
      </div>
      <div v-if="index" class="index-card__row mtg-num">
        <span class="index-card__breadth">
          <span class="text-market-up">
            ▲{{ index.advancers }}<span class="text-market-ceiling"> ({{ index.ceilingCount }})</span>
            <span class="d-sr-only">{{ t('overview.advancersWithCeiling') }}</span>
          </span>
          <span class="text-market-reference">
            ■{{ index.unchanged }}<span class="d-sr-only">{{ t('overview.unchanged') }}</span>
          </span>
          <span class="text-market-down">
            ▼{{ index.decliners }}<span class="text-market-floor"> ({{ index.floorCount }})</span>
            <span class="d-sr-only">{{ t('overview.declinersWithFloor') }}</span>
          </span>
        </span>
        <span class="index-card__session">{{ sessionLabel }}</span>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseMenu from '@/components/base/BaseMenu.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { ICONS } from '@/constants/icons'
import { INDEX_LABELS } from '@/constants/market'
import type { IndexCode, IndexPoint, IndexQuote } from '@/interfaces/market'
import { indexColor } from '@/utils/priceColor'
import { formatIndex, formatIndexChange, formatPercent, formatShares, formatValue } from '@/utils/priceFormat'
import { priceMarker } from '@/utils/priceMarker'

/** One index card (FR-10): intraday chart plus value, volume, value, breadth and session. */
const { code, index, history, sessionLabel, selectableCodes } = defineProps<{
  code: IndexCode
  index: IndexQuote | undefined
  history: readonly IndexPoint[]
  /** e.g. "Phiên liên tục"; empty when the session is unknown. */
  sessionLabel: string
  selectableCodes: readonly IndexCode[]
}>()

const emit = defineEmits<{
  select: [code: IndexCode]
}>()

// The chart library is ~45 KB gzip; the numbers paint first, the chart follows (NFR-P4).
const IndexChart = defineAsyncComponent(() => import('./IndexChart.vue'))

const { t } = useI18n()
const formatContext = useFormatContext()

const color = computed(() => indexColor(index?.change))
const colorClass = computed(() => (color.value ? `text-${color.value}` : ''))
const marker = computed(() => priceMarker(color.value))
</script>

<style scoped>
.index-card {
  min-width: 0;
}

.index-card__footer {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-1);
  padding: var(--mtg-space-1) var(--mtg-space-2) var(--mtg-space-2);
  font-size: var(--mtg-font-label-md);
}

.index-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mtg-space-2);
  white-space: nowrap;
}

.index-card__row--muted {
  color: rgb(var(--v-theme-on-surface-variant));
}

.index-card__name {
  display: inline-flex;
  align-items: center;
  gap: var(--mtg-space-1);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: var(--mtg-weight-bold);
  cursor: pointer;
}

.index-card__breadth {
  display: flex;
  gap: var(--mtg-space-2);
}

.index-card__session {
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
