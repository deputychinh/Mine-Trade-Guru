<template>
  <div class="volume-by-price">
    <ol v-if="rows.length > 0" class="volume-by-price__list" :aria-label="t('detail.tab.volumeByPrice')">
      <li v-for="row in rows" :key="row.price" class="volume-by-price__row">
        <span class="mtg-num" :class="row.className">
          <span v-if="row.marker" aria-hidden="true">{{ row.marker }}</span>
          {{ formatPrice(row.price, type, formatContext) }}
        </span>
        <span class="volume-by-price__bar" aria-hidden="true">
          <span class="volume-by-price__segment bg-market-up" :style="{ '--mtg-share': row.buyShare }"></span>
          <span class="volume-by-price__segment bg-market-down" :style="{ '--mtg-share': row.sellShare }"></span>
          <span class="volume-by-price__segment volume-by-price__segment--other" :style="{ '--mtg-share': row.otherShare }"></span>
        </span>
        <span class="mtg-num">{{ formatVolume(row.volume, type, formatContext) }}</span>
      </li>
    </ol>
    <BaseEmptyState v-else :title="t('detail.noTrades')" icon="chartLine" />
    <p class="volume-by-price__legend">
      <span class="text-market-up">■ {{ t('trade.side.buy') }}</span>
      <span class="text-market-down">■ {{ t('trade.side.sell') }}</span>
      <span class="text-medium-emphasis">■ {{ t('trade.side.unknown') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import type { InstrumentType, VolumeAtPrice } from '@/interfaces/market'
import { priceColor, type PriceBounds } from '@/utils/priceColor'
import { formatPrice, formatVolume } from '@/utils/priceFormat'
import { priceMarker } from '@/utils/priceMarker'
import { maxProfileVolume } from '@/utils/volumeByPrice'

/** Session volume at each price, split by aggressor side (FR-24). */
const { profile, bounds, type } = defineProps<{
  /** Highest price first. */
  profile: readonly VolumeAtPrice[]
  bounds: PriceBounds
  type: InstrumentType
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const rows = computed(() => {
  const max = Math.max(1, maxProfileVolume(profile))
  return profile.map((level) => {
    const color = priceColor(level.price, bounds)
    const other = Math.max(0, level.volume - level.buyVolume - level.sellVolume)
    return {
      price: level.price,
      volume: level.volume,
      className: color ? `text-${color}` : '',
      marker: priceMarker(color)?.symbol ?? null,
      buyShare: level.buyVolume / max,
      sellShare: level.sellVolume / max,
      otherShare: other / max,
    }
  })
})
</script>

<style scoped>
.volume-by-price {
  padding: var(--mtg-space-2) var(--mtg-space-4);
}

.volume-by-price__list {
  max-height: var(--mtg-panel-list-height);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.volume-by-price__row {
  display: grid;
  grid-template-columns: var(--mtg-board-col-price) 1fr var(--mtg-board-col-volume);
  align-items: center;
  gap: var(--mtg-space-2);
  padding-block: var(--mtg-space-1);
  font-size: var(--mtg-font-body-sm);
}

.volume-by-price__bar {
  display: flex;
  height: var(--mtg-bar-height);
}

.volume-by-price__segment {
  flex-grow: var(--mtg-share);
  flex-basis: 0;
}

.volume-by-price__segment--other {
  background-color: rgb(var(--v-theme-outline));
}

.volume-by-price__legend {
  display: flex;
  gap: var(--mtg-space-3);
  margin: var(--mtg-space-2) 0 0;
  font-size: var(--mtg-font-label-sm);
}
</style>
