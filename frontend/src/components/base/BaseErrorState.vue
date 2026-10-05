<template>
  <div class="base-error-state" role="alert">
    <v-icon :icon="ICONS.warning" color="error" size="28" />
    <p class="base-error-state__title">{{ title }}</p>
    <p v-if="message" class="base-error-state__message">{{ message }}</p>
    <v-btn v-if="retryLabel" variant="tonal" color="primary" size="small" :prepend-icon="ICONS.retry" @click="emit('retry')">
      {{ retryLabel }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '@/constants/icons'

/** A panel that failed; the rest of the dashboard keeps working (NFR-R5). */
const { title, message = '', retryLabel = '' } = defineProps<{
  title: string
  message?: string
  /** Omit to hide the retry button. */
  retryLabel?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.base-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mtg-space-2);
  padding: var(--mtg-space-5) var(--mtg-space-4);
  text-align: center;
}

.base-error-state__title {
  margin: 0;
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
}

.base-error-state__message {
  margin: 0;
  max-width: 40ch;
  font-size: var(--mtg-font-body-sm);
  color: rgb(var(--v-theme-on-surface-variant));
  overflow-wrap: anywhere;
}
</style>
