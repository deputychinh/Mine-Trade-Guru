<template>
  <v-card :color="color" class="base-card">
    <v-card-item v-if="title || $slots.actions" class="base-card__header">
      <v-card-title class="base-card__title">{{ title }}</v-card-title>
      <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
      <template v-if="$slots.actions" #append>
        <slot name="actions"></slot>
      </template>
    </v-card-item>
    <div class="base-card__body" :class="{ 'base-card__body--padded': hasPadding }">
      <slot></slot>
    </div>
  </v-card>
</template>

<script setup lang="ts">
/** M3 filled card used for every dashboard panel. */
const {
  title = '',
  subtitle = '',
  color = 'surface-container',
  hasPadding = true,
} = defineProps<{
  title?: string
  subtitle?: string
  color?: string
  /** Turn off for edge-to-edge content (tables, charts). */
  hasPadding?: boolean
}>()

defineSlots<{
  default(): unknown
  actions?(): unknown
}>()
</script>

<style scoped>
.base-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.base-card__header {
  padding-block: var(--mtg-space-2);
  padding-inline: var(--mtg-space-4) var(--mtg-space-2);
}

.base-card__title {
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
}

.base-card__body {
  flex: 1;
  min-height: 0;
}

.base-card__body--padded {
  padding: 0 var(--mtg-space-4) var(--mtg-space-4);
}
</style>
