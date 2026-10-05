<template>
  <BaseCard :title="t('detail.keyStats')" class="key-stats">
    <dl class="key-stats__list">
      <div v-for="stat in stats" :key="stat.label" class="key-stats__item">
        <dt class="key-stats__label">{{ stat.label }}</dt>
        <dd class="key-stats__value mtg-num" :class="stat.className">{{ stat.value }}</dd>
      </div>
    </dl>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { SECTOR_LABEL_KEYS } from '@/constants/market'
import type { Instrument, Quote } from '@/interfaces/market'
import { priceColor } from '@/utils/priceColor'
import { formatCompact, formatPrice, formatValue, formatVolume } from '@/utils/priceFormat'

/** Session statistics and company facts (FR-25). */
const { quote, instrument } = defineProps<{
  quote: Quote
  instrument: Instrument
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const stats = computed(() => {
  const type = instrument.type
  const context = formatContext.value
  const price = (value: number | null) => {
    const color = priceColor(value, quote)
    return { value: formatPrice(value, type, context) || '—', className: color ? `text-${color}` : '' }
  }
  const plain = (value: string) => ({ value: value || '—', className: '' })
  const marketCap = instrument.sharesOutstanding * (quote.lastPrice ?? quote.reference)
  return [
    { label: t('column.open'), ...price(quote.open) },
    { label: t('column.high'), ...price(quote.high) },
    { label: t('column.low'), ...price(quote.low) },
    { label: t('column.average'), ...price(quote.average) },
    { label: t('column.totalVolume'), ...plain(formatVolume(quote.totalVolume, type, context)) },
    { label: t('detail.totalValueBillion'), ...plain(formatValue(quote.totalValue, context)) },
    { label: t('column.foreignBuy'), ...plain(formatVolume(quote.foreignBuyVolume, type, context)) },
    { label: t('column.foreignSell'), ...plain(formatVolume(quote.foreignSellVolume, type, context)) },
    { label: t('column.foreignRoom'), ...plain(formatVolume(quote.foreignRoom, type, context)) },
    { label: t('detail.marketCap'), ...plain(type === 'STOCK' ? formatCompact(marketCap, context) : '') },
    { label: t('detail.sector'), ...plain(instrument.sector ? t(SECTOR_LABEL_KEYS[instrument.sector]) : '') },
  ]
})
</script>

<style scoped>
.key-stats__list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--mtg-space-1) var(--mtg-space-4);
  margin: 0;
}

.key-stats__item {
  display: flex;
  justify-content: space-between;
  gap: var(--mtg-space-2);
  padding-block: var(--mtg-space-1);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  font-size: var(--mtg-font-body-sm);
}

.key-stats__label {
  color: rgb(var(--v-theme-on-surface-variant));
}

.key-stats__value {
  margin: 0;
}
</style>
