<template>
  <v-tabs v-model="value" :aria-label="label" color="primary" density="compact" show-arrows>
    <v-tab v-for="item in items" :key="item.value" :value="item.value" :prepend-icon="item.icon ? ICONS[item.icon] : undefined">
      {{ item.label }}
      <span v-if="item.count !== undefined" class="base-tabs__count mtg-num">{{ item.count }}</span>
    </v-tab>
  </v-tabs>
</template>

<script setup lang="ts" generic="T extends string">
import { ICONS } from '@/constants/icons'
import type { TabItem } from '@/interfaces/ui'

/** M3 primary tabs; scrolls horizontally on narrow screens. */
const { items, label } = defineProps<{
  items: ReadonlyArray<TabItem<T>>
  /** Accessible name of the tab list. */
  label: string
}>()

const value = defineModel<T>({ required: true })
</script>

<style scoped>
.base-tabs__count {
  margin-inline-start: var(--mtg-space-1);
  font-size: var(--mtg-font-label-sm);
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
