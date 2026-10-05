<template>
  <section class="index-ticker-bar" :aria-label="t('overview.indices')">
    <div class="index-ticker-bar__cards">
      <IndexChartCard
        v-for="(code, slot) in cardCodes"
        :key="`${slot}:${code}`"
        :code="code"
        :index="marketStore.indices.get(code)"
        :history="marketStore.indexHistory.get(code) ?? EMPTY_HISTORY"
        :session-label="sessionLabel(code)"
        :selectable-codes="INDEX_CODES"
        @select="setCard(slot, $event)"
      />
    </div>
    <IndexTable :rows="tableRows" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { DEFAULT_INDEX_CARDS, INDEX_CODES, INDEX_MARKET } from '@/constants/market'
import { SESSION_PHASE_LABEL_KEYS } from '@/constants/sessions'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { IndexCode, IndexPoint } from '@/interfaces/market'
import { useMarketStore } from '@/stores/useMarketStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { parseIndexCards } from '@/utils/storageParsers'
import IndexChartCard from './IndexChartCard.vue'
import IndexTable from './IndexTable.vue'

/**
 * Container for the index header (FR-10), laid out like iBoard: four intraday chart cards
 * (each can switch index; the choice is remembered) and a table of every index.
 */
const marketStore = useMarketStore()
const sessionStore = useSessionStore()
const { t } = useI18n()

const cardCodes = useLocalStorage<IndexCode[]>(STORAGE_KEYS.indexCards, [...DEFAULT_INDEX_CARDS], parseIndexCards)

/** Recomputed on every index tick (the store triggers its shallowRef once per patch). */
const tableRows = computed(() => INDEX_CODES.map((code) => ({ code, index: marketStore.indices.get(code) })))

/** Shared empty array so a missing history doesn't create a new prop value every render. */
const EMPTY_HISTORY: readonly IndexPoint[] = []

function sessionLabel(code: IndexCode): string {
  const state = sessionStore.stateOf(INDEX_MARKET[code])
  return state ? t('overview.session', { phase: t(SESSION_PHASE_LABEL_KEYS[state.phase]) }) : ''
}

function setCard(slot: number, code: IndexCode): void {
  cardCodes.value = cardCodes.value.map((current, position) => (position === slot ? code : current))
}
</script>

<style scoped>
.index-ticker-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--mtg-space-2);
}

.index-ticker-bar__cards {
  display: grid;
  grid-auto-columns: minmax(var(--mtg-index-card-min-width), 1fr);
  grid-auto-flow: column;
  gap: var(--mtg-space-2);
  overflow-x: auto;
}

/* Wide screens: cards and table side by side, as on iBoard. */
@media (width >= 1500px) {
  .index-ticker-bar {
    grid-template-columns: minmax(0, 2.4fr) minmax(var(--mtg-index-table-min-width), 1fr);
  }
}
</style>
