<template>
  <v-menu v-model="isOpen" :location="location" :close-on-content-click="isClosedOnContentClick" :max-height="maxHeight">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps"></slot>
    </template>
    <v-sheet color="surface-container-high" rounded="lg" elevation="2" class="base-menu">
      <slot></slot>
    </v-sheet>
  </v-menu>
</template>

<script setup lang="ts">
import type { PopupLocation } from '@/interfaces/ui'

/** M3 menu surface; content is free-form (lists, forms). */
const {
  location = 'bottom',
  isClosedOnContentClick = true,
  maxHeight = 480,
} = defineProps<{
  location?: PopupLocation
  isClosedOnContentClick?: boolean
  maxHeight?: number
}>()

const isOpen = defineModel<boolean>({ default: false })

defineSlots<{
  activator(scope: { props: Record<string, unknown> }): unknown
  default(): unknown
}>()
</script>

<style scoped>
.base-menu {
  min-width: var(--mtg-panel-min-width);
  overflow: auto;
}
</style>
