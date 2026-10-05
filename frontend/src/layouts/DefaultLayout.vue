<template>
  <v-app>
    <v-app-bar color="surface-container" flat>
      <slot name="header"></slot>
    </v-app-bar>
    <v-main>
      <div class="default-layout__content">
        <slot></slot>
      </div>
    </v-main>
    <AlertToastHost />
    <PerfOverlay v-if="isPerfOverlayEnabled" />
  </v-app>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AlertToastHost from '@/components/features/alerts/AlertToastHost.vue'

/** App shell: M3 top app bar, main region, alert toasts. Pages fill the header and body slots. */
defineSlots<{
  header(): unknown
  default(): unknown
}>()

// Dev-only; a separate chunk that production never requests (NFR-O1).
const PerfOverlay = defineAsyncComponent(() => import('@/components/common/PerfOverlay.vue'))

const isPerfOverlayEnabled = import.meta.env.DEV
</script>

<style scoped>
.default-layout__content {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-3);
  padding: var(--mtg-space-3);
}
</style>
