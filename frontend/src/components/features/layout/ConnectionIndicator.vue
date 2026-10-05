<template>
  <div class="connection-indicator">
    <BaseChip :color="isPaused ? 'secondary' : view.color" :prepend-icon="isPaused ? 'pause' : view.icon" is-label size="small">
      <!-- Compact (phones): icon only; the status stays readable for screen readers. -->
      <span role="status" :class="{ 'd-sr-only': isCompact }">{{ isPaused ? t('connection.paused') : t(view.labelKey) }}</span>
      <span v-if="secondsSinceTick !== null && !isCompact" class="connection-indicator__age mtg-num">
        {{ t('connection.lastTick', { seconds: secondsSinceTick }) }}
      </span>
    </BaseChip>
    <BaseIconButton
      :icon="isPaused ? 'resume' : 'pause'"
      :label="t(isPaused ? 'connection.resume' : 'connection.pause')"
      :is-pressed="isPaused"
      @click="emit('togglePause')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChip from '@/components/base/BaseChip.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { CONNECTION_STATUS_VIEW } from '@/constants/connection'
import type { ConnectionStatus } from '@/interfaces/websocket'

/** Feed status, time since the last tick, and pause/resume (FR-45). */
const {
  status,
  isPaused,
  secondsSinceTick,
  isCompact = false,
} = defineProps<{
  status: ConnectionStatus
  isPaused: boolean
  secondsSinceTick: number | null
  isCompact?: boolean
}>()

const emit = defineEmits<{
  togglePause: []
}>()

const { t } = useI18n()

const view = computed(() => CONNECTION_STATUS_VIEW[status])
</script>

<style scoped>
.connection-indicator {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
}

.connection-indicator__age {
  margin-inline-start: var(--mtg-space-1);
  opacity: 0.8;
}
</style>
