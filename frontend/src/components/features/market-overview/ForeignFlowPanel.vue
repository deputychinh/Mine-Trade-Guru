<template>
  <BaseCard :title="t('overview.foreign.title')" class="foreign-flow">
    <div class="foreign-flow__columns">
      <section v-for="side in sides" :key="side.key" class="foreign-flow__side" :aria-label="side.label">
        <h3 class="foreign-flow__heading" :class="side.textClass">{{ side.label }}</h3>
        <ol v-if="side.entries.length > 0" class="foreign-flow__list">
          <li v-for="entry in side.entries" :key="entry.symbol">
            <button type="button" class="foreign-flow__row" @click="emit('select', entry.symbol)">
              <span class="foreign-flow__symbol">{{ entry.symbol }}</span>
              <span class="foreign-flow__bar" aria-hidden="true">
                <span class="foreign-flow__fill" :class="side.fillClass" :style="{ '--mtg-share': share(entry.netValue) }"></span>
              </span>
              <span class="mtg-num">{{ formatValue(Math.abs(entry.netValue), formatContext) }}</span>
            </button>
          </li>
        </ol>
        <p v-else class="foreign-flow__empty">{{ t('overview.foreign.empty') }}</p>
      </section>
    </div>
    <p class="foreign-flow__unit">{{ t('overview.foreign.unit') }}</p>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import { useFormatContext } from '@/composables/useFormatContext'
import type { ForeignFlow } from '@/interfaces/overview'
import { formatValue } from '@/utils/priceFormat'

/** Top net foreign buyers and sellers by value (FR-13). Bars share one scale so sides compare. */
const { flow } = defineProps<{
  flow: ForeignFlow
}>()

const emit = defineEmits<{
  select: [symbol: string]
}>()

const { t } = useI18n()
const formatContext = useFormatContext()

const maxAbs = computed(() =>
  Math.max(1, ...[...flow.topNetBuy, ...flow.topNetSell].map((entry) => Math.abs(entry.netValue))),
)

const sides = computed(() => [
  {
    key: 'buy',
    label: t('overview.foreign.netBuy'),
    entries: flow.topNetBuy,
    textClass: 'text-market-up',
    fillClass: 'bg-market-up',
  },
  {
    key: 'sell',
    label: t('overview.foreign.netSell'),
    entries: flow.topNetSell,
    textClass: 'text-market-down',
    fillClass: 'bg-market-down',
  },
])

function share(netValue: number): number {
  return Math.abs(netValue) / maxAbs.value
}
</script>

<style scoped>
.foreign-flow__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(calc(var(--mtg-panel-min-width) / 2), 1fr));
  gap: var(--mtg-space-4);
}

.foreign-flow__heading {
  margin: 0 0 var(--mtg-space-1);
  font-size: var(--mtg-font-label-md);
  font-weight: var(--mtg-weight-medium);
}

.foreign-flow__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.foreign-flow__row {
  display: grid;
  grid-template-columns: var(--mtg-board-col-symbol) 1fr auto;
  align-items: center;
  gap: var(--mtg-space-2);
  width: 100%;
  padding-block: var(--mtg-space-1);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: var(--mtg-font-body-sm);
  text-align: start;
  cursor: pointer;
}

.foreign-flow__row:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.foreign-flow__symbol {
  font-weight: var(--mtg-weight-bold);
}

.foreign-flow__bar {
  height: var(--mtg-bar-height);
  overflow: hidden;
  border-radius: var(--mtg-shape-full);
  background-color: rgb(var(--v-theme-surface-variant));
}

.foreign-flow__fill {
  display: block;
  height: 100%;
  transform: scaleX(var(--mtg-share));
  transform-origin: left center;
}

.foreign-flow__empty,
.foreign-flow__unit {
  margin: 0;
  font-size: var(--mtg-font-label-md);
  color: rgb(var(--v-theme-on-surface-variant));
}

.foreign-flow__unit {
  margin-top: var(--mtg-space-2);
  text-align: end;
}
</style>
