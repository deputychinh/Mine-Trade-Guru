<template>
  <div class="timeframe-toggle">
    <v-btn-toggle v-model="timeframe" mandatory density="compact" divided :aria-label="t('chart.timeframeLabel')">
      <BaseButton v-for="item in TIMEFRAMES" :key="item.timeframe" :value="item.timeframe" variant="text" size="small">
        {{ t(item.labelKey) }}
      </BaseButton>
    </v-btn-toggle>
    <BaseIconButton
      :icon="chartKind === 'candle' ? 'chartLine' : 'chartCandle'"
      :label="t(chartKind === 'candle' ? 'chart.showLine' : 'chart.showCandles')"
      @click="chartKind = chartKind === 'candle' ? 'line' : 'candle'"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { TIMEFRAMES } from '@/constants/timeframes'
import type { ChartKind, Timeframe } from '@/interfaces/chart'

/** 1m / 5m / 15m / 1h and candle ↔ line (FR-21). */
const timeframe = defineModel<Timeframe>('timeframe', { required: true })
const chartKind = defineModel<ChartKind>('chartKind', { required: true })

const { t } = useI18n()
</script>

<style scoped>
.timeframe-toggle {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
}
</style>
