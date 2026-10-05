<template>
  <v-sheet color="inverse-surface" rounded="lg" elevation="3" class="alert-toast">
    <v-icon :icon="ICONS.alertsActive" class="alert-toast__icon" />
    <button type="button" class="alert-toast__body" @click="emit('open', item.symbol)">
      <span class="alert-toast__message">{{ item.message }}</span>
      <span class="alert-toast__time mtg-num">{{ item.time }}</span>
    </button>
    <BaseIconButton icon="close" size="x-small" :label="t('common.dismiss')" @click="emit('dismiss', item.id)" />
  </v-sheet>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { ICONS } from '@/constants/icons'
import type { AlertEventView } from '@/interfaces/alert'

/** One in-app alert notification (FR-33). */
const { item } = defineProps<{
  item: AlertEventView
}>()

const emit = defineEmits<{
  open: [symbol: string]
  dismiss: [id: string]
}>()

const { t } = useI18n()
</script>

<style scoped>
.alert-toast {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-2);
  width: var(--mtg-search-width);
  max-width: calc(100vw - var(--mtg-space-6));
  padding: var(--mtg-space-2) var(--mtg-space-2) var(--mtg-space-2) var(--mtg-space-3);
}

.alert-toast__icon {
  color: rgb(var(--v-theme-inverse-primary));
}

.alert-toast__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.alert-toast__message {
  font-size: var(--mtg-font-body-sm);
}

.alert-toast__time {
  text-align: start;
  font-size: var(--mtg-font-label-sm);
  opacity: 0.8;
}
</style>
