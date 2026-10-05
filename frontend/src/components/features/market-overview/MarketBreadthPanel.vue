<template>
  <BaseCard :title="t('overview.breadth')" class="market-breadth">
    <ul class="market-breadth__list">
      <li v-for="exchange in EXCHANGES" :key="exchange" class="market-breadth__item">
        <div class="market-breadth__head">
          <span class="market-breadth__exchange">{{ t(SESSION_MARKET_LABEL_KEYS[exchange]) }}</span>
          <span class="market-breadth__counts mtg-num">
            <span class="text-market-up">▲{{ breadth[exchange].advancers }}</span>
            <span class="text-market-reference">■{{ breadth[exchange].unchanged }}</span>
            <span class="text-market-down">▼{{ breadth[exchange].decliners }}</span>
          </span>
        </div>
        <div
          class="market-breadth__bar"
          role="img"
          :aria-label="
            t('overview.breadthSummary', {
              exchange: t(SESSION_MARKET_LABEL_KEYS[exchange]),
              advancers: breadth[exchange].advancers,
              unchanged: breadth[exchange].unchanged,
              decliners: breadth[exchange].decliners,
            })
          "
        >
          <span class="market-breadth__segment bg-market-up" :style="{ '--mtg-share': breadth[exchange].advancers }"></span>
          <span class="market-breadth__segment bg-market-reference" :style="{ '--mtg-share': breadth[exchange].unchanged }"></span>
          <span class="market-breadth__segment bg-market-down" :style="{ '--mtg-share': breadth[exchange].decliners }"></span>
        </div>
        <div class="market-breadth__extremes mtg-num">
          <span class="text-market-ceiling">{{ t('overview.ceilingCount', { count: breadth[exchange].ceiling }) }}</span>
          <span class="text-market-floor">{{ t('overview.floorCount', { count: breadth[exchange].floor }) }}</span>
        </div>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import { EXCHANGES } from '@/constants/market'
import { SESSION_MARKET_LABEL_KEYS } from '@/constants/sessions'
import type { ExchangeBreadth } from '@/interfaces/overview'

/** Advance / decline / unchanged per exchange, with ceiling and floor counts (FR-11). */
const { breadth } = defineProps<{
  breadth: ExchangeBreadth
}>()

const { t } = useI18n()
</script>

<style scoped>
.market-breadth__list {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.market-breadth__head,
.market-breadth__extremes {
  display: flex;
  justify-content: space-between;
  gap: var(--mtg-space-2);
}

.market-breadth__exchange {
  font-weight: var(--mtg-weight-medium);
}

.market-breadth__counts {
  display: flex;
  gap: var(--mtg-space-2);
  font-size: var(--mtg-font-body-sm);
}

.market-breadth__bar {
  display: flex;
  gap: var(--mtg-hairline);
  height: var(--mtg-bar-height);
  margin-block: var(--mtg-space-1);
  overflow: hidden;
  border-radius: var(--mtg-shape-full);
  background-color: rgb(var(--v-theme-surface-variant));
}

.market-breadth__segment {
  flex-grow: var(--mtg-share);
  flex-basis: 0;
}

.market-breadth__extremes {
  font-size: var(--mtg-font-label-md);
}
</style>
