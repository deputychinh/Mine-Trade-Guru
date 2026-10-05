<template>
  <v-dialog v-model="isOpen" :max-width="maxWidth" scrollable>
    <v-card color="surface-container-high" class="base-dialog">
      <v-card-item>
        <v-card-title class="base-dialog__title">{{ title }}</v-card-title>
        <template #append>
          <v-btn :icon="ICONS.close" :aria-label="closeLabel" variant="text" size="small" @click="isOpen = false" />
        </template>
      </v-card-item>
      <v-card-text class="base-dialog__body">
        <slot></slot>
      </v-card-text>
      <v-card-actions v-if="$slots.actions" class="base-dialog__actions">
        <slot name="actions"></slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/** M3 basic dialog. Esc and the scrim close it; focus is trapped by Vuetify (NFR-U2). */
const { title, closeLabel, maxWidth = 560 } = defineProps<{
  title: string
  closeLabel: string
  maxWidth?: number | string
}>()

const isOpen = defineModel<boolean>({ required: true })

defineSlots<{
  default(): unknown
  actions?(): unknown
}>()
</script>

<style scoped>
.base-dialog {
  border-radius: var(--mtg-shape-xl);
}

.base-dialog__title {
  font-size: var(--mtg-font-headline-sm);
}

.base-dialog__body {
  padding-inline: var(--mtg-space-5);
}

.base-dialog__actions {
  justify-content: flex-end;
  padding: var(--mtg-space-2) var(--mtg-space-5) var(--mtg-space-4);
}
</style>
