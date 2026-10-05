<template>
  <div class="trade-tape" role="table" :aria-label="t('detail.tab.trades')">
    <div class="trade-tape__row trade-tape__row--head" role="row">
      <span role="columnheader">{{ t('detail.time') }}</span>
      <span role="columnheader">{{ t('detail.price') }}</span>
      <span role="columnheader">{{ t('detail.volume') }}</span>
      <span role="columnheader">{{ t('detail.side') }}</span>
    </div>
    <v-virtual-scroll
      v-if="trades.length > 0"
      :items="trades"
      item-key="id"
      :item-height="TAPE_ROW_HEIGHT"
      class="trade-tape__body"
      role="rowgroup"
    >
      <template #default="{ item }">
        <div :key="item.id" class="trade-tape__row" role="row">
          <span role="cell" class="mtg-num">{{ formatMarketTime(item.time, formatContext.locale) }}</span>
          <span role="cell" class="mtg-num" :class="priceView(item.price).className">
            <span v-if="priceView(item.price).marker" aria-hidden="true">{{ priceView(item.price).marker }}</span>
            {{ formatPrice(item.price, type, formatContext) }}
          </span>
          <span role="cell" class="mtg-num">{{ formatVolume(item.volume, type, formatContext) }}</span>
          <span role="cell" class="trade-tape__side" :class="SIDE_CLASSES[item.side]">{{ t(TRADE_SIDE_LABEL_KEYS[item.side]) }}</span>
        </div>
      </template>
    </v-virtual-scroll>
    <BaseEmptyState v-else :title="t('detail.noTrades')" icon="list" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { TAPE_ROW_HEIGHT } from '@/constants/limits'
import { TRADE_SIDE_LABEL_KEYS } from '@/constants/market'
import type { InstrumentType, Trade, TradeSide } from '@/interfaces/market'
import { priceColor, type PriceBounds } from '@/utils/priceColor'
import { formatPrice, formatVolume } from '@/utils/priceFormat'
import { priceMarker } from '@/utils/priceMarker'
import { formatMarketTime } from '@/utils/time'

/** Time & sales, newest first, virtualized so the 500-trade cap costs nothing to scroll (FR-23). */
const { trades, bounds, type } = defineProps<{
  trades: readonly Trade[]
  bounds: PriceBounds
  type: InstrumentType
}>()

const SIDE_CLASSES: Record<TradeSide, string> = {
  B: 'text-market-up',
  S: 'text-market-down',
  U: 'text-medium-emphasis',
}

const { t } = useI18n()
const formatContext = useFormatContext()

function priceView(price: number): { className: string; marker: string | null } {
  const color = priceColor(price, bounds)
  return { className: color ? `text-${color}` : '', marker: priceMarker(color)?.symbol ?? null }
}
</script>

<style scoped>
.trade-tape__body {
  height: var(--mtg-panel-list-height);
}

.trade-tape__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  align-items: center;
  gap: var(--mtg-space-2);
  height: 100%;
  padding-inline: var(--mtg-space-4);
  font-size: var(--mtg-font-body-sm);
}

.trade-tape__row--head {
  padding-block: var(--mtg-space-1);
  font-size: var(--mtg-font-label-sm);
  font-weight: var(--mtg-weight-medium);
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: end;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.trade-tape__side {
  min-width: var(--mtg-space-6);
  font-weight: var(--mtg-weight-medium);
  text-align: center;
}
</style>
