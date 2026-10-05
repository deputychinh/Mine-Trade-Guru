<template>
  <v-sheet
    position="fixed"
    location="bottom left"
    color="inverse-surface"
    rounded="lg"
    class="perf-overlay mtg-num"
    role="status"
    :aria-label="t('perf.title')"
  >
    <dl class="perf-overlay__list">
      <template v-for="item in items" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd :class="{ 'perf-overlay__value--bad': item.isOverBudget }">{{ item.value }}</dd>
      </template>
    </dl>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PERF_BUDGET } from '@/constants/limits'
import { usePerfStore } from '@/stores/usePerfStore'

/** Dev-only live numbers for the performance NFRs (NFR-O1). Mounted only when import.meta.env.DEV. */
const perfStore = usePerfStore()
const { t } = useI18n()

function fixed(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? '—' : value.toFixed(digits)
}

const items = computed(() => {
  const { feed, tickToPaintP50Ms, tickToPaintP95Ms, applyPatchMs, heapUsedMb } = perfStore.snapshot
  return [
    { label: t('perf.framesPerSecond'), value: fixed(feed?.framesPerSecond), isOverBudget: false },
    { label: t('perf.transit'), value: `${fixed(feed?.transitLatencyMs, 1)} ms`, isOverBudget: false },
    { label: t('perf.tickToPaintP50'), value: `${fixed(tickToPaintP50Ms, 1)} ms`, isOverBudget: false },
    {
      label: t('perf.tickToPaintP95'),
      value: `${fixed(tickToPaintP95Ms, 1)} ms`,
      isOverBudget: (tickToPaintP95Ms ?? 0) > PERF_BUDGET.tickToPaintP95Ms,
    },
    {
      label: t('perf.applyPatch'),
      value: `${fixed(applyPatchMs, 2)} ms`,
      isOverBudget: (applyPatchMs ?? 0) > PERF_BUDGET.applyPatchMs,
    },
    { label: t('perf.dropped'), value: fixed(feed?.droppedFrames), isOverBudget: (feed?.droppedFrames ?? 0) > 0 },
    { label: t('perf.resyncs'), value: fixed(feed?.resyncs), isOverBudget: false },
    { label: t('perf.heap'), value: `${fixed(heapUsedMb, 1)} MB`, isOverBudget: false },
  ]
})
</script>

<style scoped>
.perf-overlay {
  margin: var(--mtg-space-2);
  padding: var(--mtg-space-2) var(--mtg-space-3);
  font-size: var(--mtg-font-label-sm);
  opacity: 0.9;
  pointer-events: none;
}

.perf-overlay__list {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: var(--mtg-space-3);
  margin: 0;
}

.perf-overlay__list dd {
  margin: 0;
  text-align: end;
}

.perf-overlay__value--bad {
  color: rgb(var(--v-theme-inverse-primary));
  font-weight: var(--mtg-weight-bold);
}
</style>
