<template>
  <ol v-if="items.length > 0" class="alert-event-list">
    <li v-for="item in items" :key="item.id" class="alert-event-list__item" :class="{ 'alert-event-list__item--unread': !item.isRead }">
      <span v-if="!item.isRead" class="alert-event-list__dot bg-primary" aria-hidden="true"></span>
      <button type="button" class="alert-event-list__body" @click="emit('select', item.symbol)">
        <span class="alert-event-list__message">{{ item.message }}</span>
        <span class="alert-event-list__time mtg-num">{{ item.time }}</span>
        <span v-if="!item.isRead" class="d-sr-only">{{ t('alert.unread') }}</span>
      </button>
      <BaseIconButton v-if="!item.isRead" icon="check" size="x-small" :label="t('alert.markRead')" @click="emit('markRead', item.id)" />
    </li>
  </ol>
  <BaseEmptyState v-else icon="alerts" :title="t('alert.noEvents')" :text="t('alert.noEventsHint')" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import type { AlertEventView } from '@/interfaces/alert'

/** Triggered alerts, newest first (FR-33). */
const { items } = defineProps<{
  items: readonly AlertEventView[]
}>()

const emit = defineEmits<{
  markRead: [id: string]
  select: [symbol: string]
}>()

const { t } = useI18n()
</script>

<style scoped>
.alert-event-list {
  max-height: var(--mtg-panel-list-height);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.alert-event-list__item {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-2);
  padding: var(--mtg-space-1) var(--mtg-space-2);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.alert-event-list__item--unread {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.alert-event-list__dot {
  flex: none;
  width: var(--mtg-space-2);
  height: var(--mtg-space-2);
  border-radius: var(--mtg-shape-full);
}

.alert-event-list__body {
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

.alert-event-list__message {
  font-size: var(--mtg-font-body-sm);
}

.alert-event-list__time {
  text-align: start;
  font-size: var(--mtg-font-label-sm);
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
