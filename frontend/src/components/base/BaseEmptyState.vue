<template>
  <div class="base-empty-state" role="status">
    <v-icon :icon="ICONS[icon]" size="32" class="base-empty-state__icon" />
    <p class="base-empty-state__title">{{ title }}</p>
    <p v-if="text" class="base-empty-state__text">{{ text }}</p>
    <div v-if="$slots.actions" class="base-empty-state__actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/constants/icons'

/** Shown when a list or panel has nothing to display. */
const { icon = 'info', title, text = '' } = defineProps<{
  icon?: IconName
  title: string
  text?: string
}>()

defineSlots<{
  actions?(): unknown
}>()
</script>

<style scoped>
.base-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mtg-space-2);
  padding: var(--mtg-space-5) var(--mtg-space-4);
  text-align: center;
  color: rgb(var(--v-theme-on-surface-variant));
}

.base-empty-state__icon {
  opacity: 0.6;
}

.base-empty-state__title {
  margin: 0;
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
  color: rgb(var(--v-theme-on-surface));
}

.base-empty-state__text {
  margin: 0;
  font-size: var(--mtg-font-body-sm);
}

.base-empty-state__actions {
  display: flex;
  gap: var(--mtg-space-2);
  margin-top: var(--mtg-space-2);
}
</style>
