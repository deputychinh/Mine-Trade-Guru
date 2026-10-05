<template>
  <v-tooltip :text="text" :location="location">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps"></slot>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import type { PopupLocation } from '@/interfaces/ui'

/** Plain tooltip for non-button targets; icon buttons already get one from BaseIconButton. */
const { text, location = 'bottom' } = defineProps<{
  text: string
  location?: PopupLocation
}>()

defineSlots<{
  activator(scope: { props: Record<string, unknown> }): unknown
}>()
</script>
