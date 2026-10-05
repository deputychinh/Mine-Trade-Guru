<template>
  <BaseCard :title="t('detail.orderBook')" class="order-book">
    <table class="order-book__table">
      <thead>
        <tr>
          <th scope="col">{{ t('detail.bidVolume') }}</th>
          <th scope="col">{{ t('detail.bid') }}</th>
          <th scope="col">{{ t('detail.ask') }}</th>
          <th scope="col">{{ t('detail.askVolume') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.level">
          <td class="order-book__volume mtg-num">
            <span class="order-book__bar order-book__bar--bid bg-market-up" :style="{ '--mtg-share': row.bidShare }" aria-hidden="true"></span>
            <span class="order-book__text">{{ formatVolume(row.bid?.volume, type, formatContext) }}</span>
          </td>
          <td class="mtg-num" :class="row.bidClass">{{ formatPrice(row.bid?.price, type, formatContext) }}</td>
          <td class="mtg-num" :class="row.askClass">{{ formatPrice(row.ask?.price, type, formatContext) }}</td>
          <td class="order-book__volume mtg-num">
            <span class="order-book__bar order-book__bar--ask bg-market-down" :style="{ '--mtg-share': row.askShare }" aria-hidden="true"></span>
            <span class="order-book__text">{{ formatVolume(row.ask?.volume, type, formatContext) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import type { InstrumentType, PriceLevel, Quote } from '@/interfaces/market'
import { priceColor } from '@/utils/priceColor'
import { formatPrice, formatVolume } from '@/utils/priceFormat'

/** Three best bids and asks as horizontal bars on one shared scale (FR-22). */
const { quote, type } = defineProps<{
  quote: Quote
  type: InstrumentType
}>()

const LEVELS = [0, 1, 2] as const

const { t } = useI18n()
const formatContext = useFormatContext()

function volumeOf(level: PriceLevel | undefined): number {
  return level && level.price !== null ? level.volume : 0
}

function colorClass(level: PriceLevel | undefined): string {
  const color = priceColor(level?.price, quote)
  return color ? `text-${color}` : ''
}

const rows = computed(() => {
  const max = Math.max(1, ...LEVELS.flatMap((i) => [volumeOf(quote.bids[i]), volumeOf(quote.asks[i])]))
  return LEVELS.map((level) => {
    const bid = quote.bids[level]
    const ask = quote.asks[level]
    return {
      level,
      bid,
      ask,
      bidShare: volumeOf(bid) / max,
      askShare: volumeOf(ask) / max,
      bidClass: colorClass(bid),
      askClass: colorClass(ask),
    }
  })
})
</script>

<style scoped>
.order-book__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mtg-font-body-sm);
}

.order-book__table th {
  padding-block: var(--mtg-space-1);
  font-size: var(--mtg-font-label-sm);
  font-weight: var(--mtg-weight-medium);
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: end;
}

.order-book__table td {
  padding: var(--mtg-space-1) var(--mtg-space-2);
}

.order-book__volume {
  position: relative;
}

.order-book__bar {
  position: absolute;
  inset-block: var(--mtg-space-1);
  inset-inline: 0;
  opacity: var(--mtg-state-dragged);
  transform: scaleX(var(--mtg-share));
  border-radius: var(--mtg-shape-xs);
}

.order-book__bar--bid {
  transform-origin: right center;
}

.order-book__bar--ask {
  transform-origin: left center;
}

.order-book__text {
  position: relative;
}
</style>
