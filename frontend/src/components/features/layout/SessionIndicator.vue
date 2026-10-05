<template>
  <ul class="session-indicator" :aria-label="t('session.label')">
    <li v-for="item in items" :key="item.market">
      <BaseChip :color="SESSION_PHASE_COLORS[item.phase]" is-label size="small">
        <span class="session-indicator__market">{{ t(SESSION_MARKET_LABEL_KEYS[item.market]) }}</span>
        {{ t(SESSION_PHASE_LABEL_KEYS[item.phase]) }}
        <span v-if="item.countdownMs !== null" class="session-indicator__countdown mtg-num">
          <span class="d-sr-only">{{ t('session.nextIn') }}</span>
          {{ formatCountdown(item.countdownMs) }}
        </span>
      </BaseChip>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseChip from '@/components/base/BaseChip.vue'
import { SESSION_MARKET_LABEL_KEYS, SESSION_PHASE_COLORS, SESSION_PHASE_LABEL_KEYS } from '@/constants/sessions'
import type { SessionIndicatorItem } from '@/interfaces/session'
import { formatCountdown } from '@/utils/time'

/** Trading phase per market with a countdown to the next phase (FR-15). */
const { items } = defineProps<{
  items: readonly SessionIndicatorItem[]
}>()

const { t } = useI18n()
</script>

<style scoped>
.session-indicator {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--mtg-space-1);
  margin: 0;
  overflow: hidden;
  padding: 0;
  list-style: none;
}

.session-indicator__market {
  margin-inline-end: var(--mtg-space-1);
  font-weight: var(--mtg-weight-bold);
}

.session-indicator__countdown {
  margin-inline-start: var(--mtg-space-1);
}
</style>
