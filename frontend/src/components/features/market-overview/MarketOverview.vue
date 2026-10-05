<template>
  <section class="market-overview" :aria-label="t('overview.title')">
    <div class="market-overview__header">
      <h2 class="market-overview__title">{{ t('overview.title') }}</h2>
      <BaseIconButton
        :icon="isExpanded ? 'collapse' : 'expand'"
        :label="t(isExpanded ? 'overview.collapse' : 'overview.expand')"
        :is-pressed="isExpanded"
        @click="isExpanded = !isExpanded"
      />
    </div>
    <div v-show="isExpanded" class="market-overview__grid">
      <ErrorBoundary :title="t('overview.breadth')">
        <MarketBreadthPanel :breadth="marketStore.breadth" />
      </ErrorBoundary>
      <ErrorBoundary :title="t('overview.movers.title')">
        <TopMoversPanel :movers="marketStore.movers" @select="emit('select', $event)" />
      </ErrorBoundary>
      <ErrorBoundary :title="t('overview.foreign.title')">
        <ForeignFlowPanel :flow="marketStore.foreignFlow" @select="emit('select', $event)" />
      </ErrorBoundary>
      <ErrorBoundary :title="t('overview.heatmap.title')">
        <SectorHeatmap v-if="isExpanded" :items="heatmapItems" class="market-overview__heatmap" @select="emit('select', $event)" />
      </ErrorBoundary>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { HEATMAP_THROTTLE_MS } from '@/constants/limits'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useMarketStore } from '@/stores/useMarketStore'
import type { HeatmapInput } from '@/utils/heatmapLayout'
import { parseBoolean } from '@/utils/storageParsers'
import ForeignFlowPanel from './ForeignFlowPanel.vue'
import MarketBreadthPanel from './MarketBreadthPanel.vue'
import TopMoversPanel from './TopMoversPanel.vue'

/**
 * Container for the overview panels (FR-11 … FR-14). Breadth, movers and foreign flow are
 * throttled in the market store; the heatmap input is throttled here, even more coarsely.
 */
const emit = defineEmits<{
  select: [symbol: string]
}>()

// The treemap pulls in d3-hierarchy; load it only when the panel is shown (rule 9.10).
const SectorHeatmap = defineAsyncComponent(() => import('./SectorHeatmap.vue'))

const marketStore = useMarketStore()
const instrumentStore = useInstrumentStore()
const { t } = useI18n()
const isExpanded = useLocalStorage<boolean>(STORAGE_KEYS.overviewExpanded, true, parseBoolean)

const heatmapItems = shallowRef<HeatmapInput[]>([])
let lastHeatmapAt = 0

function refreshHeatmap(): void {
  const items: HeatmapInput[] = []
  for (const quote of marketStore.snapshotQuotes()) {
    const instrument = instrumentStore.get(quote.symbol)
    if (!instrument || instrument.type !== 'STOCK' || instrument.sector === null) continue
    items.push({
      symbol: quote.symbol,
      sector: instrument.sector,
      marketCap: instrument.sharesOutstanding * (quote.lastPrice ?? quote.reference),
      changePercent: quote.changePercent ?? 0,
    })
  }
  heatmapItems.value = items
  lastHeatmapAt = Date.now()
}

watch(
  [() => marketStore.overviewVersion, isExpanded],
  () => {
    if (isExpanded.value && Date.now() - lastHeatmapAt >= HEATMAP_THROTTLE_MS) refreshHeatmap()
  },
  { immediate: true },
)
</script>

<style scoped>
.market-overview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: var(--mtg-space-2);
}

.market-overview__title {
  margin: 0;
  font-size: var(--mtg-font-title-md);
  font-weight: var(--mtg-weight-medium);
}

.market-overview__grid {
  display: grid;

  /* At most three panels per row (30 % each), never narrower than the panel minimum. */
  grid-template-columns: repeat(auto-fit, minmax(max(var(--mtg-panel-min-width), 30%), 1fr));
  gap: var(--mtg-space-3);
}

.market-overview__heatmap {
  grid-column: 1 / -1;
}
</style>
