<template>
  <header class="symbol-header">
    <div class="symbol-header__identity">
      <div class="symbol-header__title-row">
        <h2 class="symbol-header__symbol">{{ instrument.symbol }}</h2>
        <BaseChip is-label size="x-small">{{ instrument.exchange }}</BaseChip>
        <BaseChip is-label size="x-small">{{ t(INSTRUMENT_TYPE_LABEL_KEYS[instrument.type]) }}</BaseChip>
      </div>
      <p class="symbol-header__name">{{ instrument.name }}</p>
    </div>
    <div v-if="quote" class="symbol-header__price mtg-num" :class="colorClass" aria-live="polite">
      <span class="symbol-header__last" :class="flashClass">
        <span v-if="marker" aria-hidden="true">{{ marker.symbol }}</span>
        {{ formatPrice(quote.lastPrice ?? quote.reference, instrument.type, formatContext) }}
        <span v-if="marker" class="d-sr-only">{{ t(marker.ariaKey) }}</span>
      </span>
      <span class="symbol-header__change">
        {{ formatChange(quote.change, instrument.type, formatContext) }}
        ({{ formatPercent(quote.changePercent, formatContext) }})
      </span>
    </div>
    <div class="symbol-header__actions">
      <WatchlistToggleButton :symbol="instrument.symbol" :is-watched="isWatched" @toggle="emit('toggleWatch', $event)" />
      <BaseIconButton icon="addAlert" :label="t('alert.createFor', { symbol: instrument.symbol })" @click="emit('addAlert')" />
      <BaseIconButton icon="close" :label="t('common.close')" @click="emit('close')" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChip from '@/components/base/BaseChip.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import WatchlistToggleButton from '@/components/features/watchlist/WatchlistToggleButton.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { usePriceFlash } from '@/composables/usePriceFlash'
import { INSTRUMENT_TYPE_LABEL_KEYS } from '@/constants/market'
import type { Instrument, Quote } from '@/interfaces/market'
import { priceColor } from '@/utils/priceColor'
import { formatChange, formatPercent, formatPrice } from '@/utils/priceFormat'
import { priceMarker } from '@/utils/priceMarker'

/** Drawer title: identity, live price and the symbol's actions (FR-20). */
const { instrument, quote, isWatched, isFlashEnabled } = defineProps<{
  instrument: Instrument
  quote: Quote | undefined
  isWatched: boolean
  isFlashEnabled: boolean
}>()

const emit = defineEmits<{
  toggleWatch: [symbol: string]
  addAlert: []
  close: []
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const color = computed(() => (quote ? priceColor(quote.lastPrice ?? quote.reference, quote) : null))
const colorClass = computed(() => (color.value ? `text-${color.value}` : ''))
const marker = computed(() => priceMarker(color.value))
const flashClass = usePriceFlash(
  () => quote?.lastPrice ?? null,
  () => isFlashEnabled,
)
</script>

<style scoped>
.symbol-header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'identity actions'
    'price price';
  gap: var(--mtg-space-1) var(--mtg-space-2);
  padding: var(--mtg-space-3) var(--mtg-space-4);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.symbol-header__identity {
  grid-area: identity;
  min-width: 0;
}

.symbol-header__title-row {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-2);
}

.symbol-header__symbol {
  margin: 0;
  font-size: var(--mtg-font-headline-sm);
  font-weight: var(--mtg-weight-bold);
}

.symbol-header__name {
  margin: 0;
  overflow: hidden;
  font-size: var(--mtg-font-body-sm);
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.symbol-header__price {
  grid-area: price;
  display: flex;
  align-items: baseline;
  gap: var(--mtg-space-3);
  text-align: start;
}

.symbol-header__last {
  font-size: var(--mtg-font-headline-sm);
  font-weight: var(--mtg-weight-medium);
  border-radius: var(--mtg-shape-xs);
}

.symbol-header__change {
  font-size: var(--mtg-font-body-md);
}

.symbol-header__actions {
  grid-area: actions;
  display: flex;
  align-items: flex-start;
}
</style>
