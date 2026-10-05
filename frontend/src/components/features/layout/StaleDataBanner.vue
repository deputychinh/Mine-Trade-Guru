<template>
  <v-alert :type="ALERT_TYPES[kind]" variant="tonal" density="compact" role="alert" class="stale-data-banner">
    {{ message }}
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FeedBannerKind } from '@/interfaces/ui'

/** Warns that prices on screen may be old (NFR-R3): no ticks while the market is open, or feed down. */
const { kind, count } = defineProps<{
  kind: FeedBannerKind
  /** Seconds since the last tick ('stale') or reconnect attempt number ('reconnecting'). */
  count: number
}>()

const ALERT_TYPES: Record<FeedBannerKind, 'warning' | 'info' | 'error'> = {
  stale: 'warning',
  reconnecting: 'info',
  offline: 'error',
}

const { t } = useI18n()

const message = computed(() => {
  if (kind === 'stale') return t('banner.stale', { seconds: count })
  if (kind === 'reconnecting') return t('banner.reconnecting', { attempt: count })
  return t('banner.offline')
})
</script>

<style scoped>
.stale-data-banner {
  margin-block-end: var(--mtg-space-2);
}
</style>
