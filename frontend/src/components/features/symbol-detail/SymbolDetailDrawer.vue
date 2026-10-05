<template>
  <v-navigation-drawer
    :model-value="detailStore.isOpen"
    location="right"
    temporary
    :width="drawerWidth"
    class="symbol-detail"
    @update:model-value="onDrawerToggle"
  >
    <template v-if="instrument">
      <SymbolHeader
        :instrument="instrument"
        :quote="quote"
        :is-watched="watchlistStore.watchedSymbols.has(instrument.symbol)"
        :is-flash-enabled="settingsStore.settings.isFlashEnabled"
        @toggle-watch="watchlistStore.toggle"
        @add-alert="emit('addAlert', instrument.symbol)"
        @close="detailStore.close()"
      />
      <div class="symbol-detail__content">
        <BaseErrorState
          v-if="detailStore.status === 'error'"
          :title="t('detail.loadError')"
          :message="detailStore.error ?? ''"
          :retry-label="t('common.retry')"
          @retry="detailStore.open(instrument.symbol)"
        />
        <template v-else>
          <ErrorBoundary :title="t('detail.chart')">
            <BaseCard :title="t('detail.chart')" :has-padding="false">
              <template #actions>
                <TimeframeToggle v-model:timeframe="timeframe" v-model:chart-kind="chartKind" />
              </template>
              <BaseSkeleton v-if="detailStore.status === 'loading'" type="image" :label="t('common.loading')" />
              <CandleChart v-else :bars="chartBars" :kind="detailStore.chartKind" :guides="guides" :type="instrument.type" />
            </BaseCard>
          </ErrorBoundary>
          <div v-if="quote" class="symbol-detail__grid">
            <ErrorBoundary :title="t('detail.orderBook')">
              <OrderBookDepth :quote="quote" :type="instrument.type" />
            </ErrorBoundary>
            <ErrorBoundary :title="t('detail.keyStats')">
              <KeyStats :quote="quote" :instrument="instrument" />
            </ErrorBoundary>
          </div>
          <BaseCard v-if="quote" :has-padding="false">
            <BaseTabs v-model="activeTab" :items="tabs" :label="t('detail.tabsLabel')" />
            <BaseSkeleton v-if="detailStore.status === 'loading'" type="list-item@6" :label="t('common.loading')" />
            <ErrorBoundary v-else-if="activeTab === 'trades'" :title="t('detail.tab.trades')">
              <TradeTape :trades="detailStore.trades" :bounds="quote" :type="instrument.type" />
            </ErrorBoundary>
            <ErrorBoundary v-else :title="t('detail.tab.volumeByPrice')">
              <VolumeByPrice :profile="detailStore.profile" :bounds="quote" :type="instrument.type" />
            </ErrorBoundary>
          </BaseCard>
        </template>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseErrorState from '@/components/base/BaseErrorState.vue'
import BaseSkeleton from '@/components/base/BaseSkeleton.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import { DRAWER_WIDTH } from '@/constants/limits'
import { TIMEFRAMES } from '@/constants/timeframes'
import type { ChartKind, PriceGuides, Timeframe } from '@/interfaces/chart'
import type { TabItem } from '@/interfaces/ui'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import { useWatchlistStore } from '@/stores/useWatchlistStore'
import { aggregateBars } from '@/utils/barAggregate'
import CandleChart from './CandleChart.vue'
import KeyStats from './KeyStats.vue'
import OrderBookDepth from './OrderBookDepth.vue'
import SymbolHeader from './SymbolHeader.vue'
import TimeframeToggle from './TimeframeToggle.vue'
import TradeTape from './TradeTape.vue'
import VolumeByPrice from './VolumeByPrice.vue'

type DetailTab = 'trades' | 'volumeByPrice'

/** Container for the symbol drawer (FR-20 … FR-25). Loaded async the first time a symbol opens. */
const emit = defineEmits<{
  addAlert: [symbol: string]
}>()

const detailStore = useSymbolDetailStore()
const instrumentStore = useInstrumentStore()
const marketStore = useMarketStore()
const settingsStore = useSettingsStore()
const watchlistStore = useWatchlistStore()
const { t } = useI18n()
const { xs, width } = useDisplay()

const activeTab = ref<DetailTab>('trades')

const instrument = computed(() => (detailStore.symbol ? instrumentStore.get(detailStore.symbol) : undefined))
/** Same object until this symbol's quote changes, so the drawer ignores other symbols' ticks. */
const quote = computed(() => (detailStore.symbol ? marketStore.quotes.get(detailStore.symbol) : undefined))
const drawerWidth = computed(() => (xs.value ? width.value : DRAWER_WIDTH))

const timeframe = computed<Timeframe>({
  get: () => detailStore.timeframe,
  set: (next) => detailStore.setTimeframe(next),
})
const chartKind = computed<ChartKind>({
  get: () => detailStore.chartKind,
  set: (next) => detailStore.setChartKind(next),
})

const chartBars = computed(() => {
  const minutes = TIMEFRAMES.find((item) => item.timeframe === detailStore.timeframe)?.minutes ?? 1
  return aggregateBars(detailStore.bars, minutes)
})

const guides = computed<PriceGuides | null>(() => {
  const current = quote.value
  return current ? { reference: current.reference, ceiling: current.ceiling, floor: current.floor } : null
})

const tabs = computed<TabItem<DetailTab>[]>(() => [
  { value: 'trades', label: t('detail.tab.trades') },
  { value: 'volumeByPrice', label: t('detail.tab.volumeByPrice') },
])

function onDrawerToggle(isOpen: boolean): void {
  if (!isOpen) detailStore.close()
}
</script>

<style scoped>
.symbol-detail__content {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-3);
  padding: var(--mtg-space-3);
}

.symbol-detail__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--mtg-space-3);
}
</style>
