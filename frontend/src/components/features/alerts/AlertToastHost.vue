<template>
  <div class="alert-toast-host" role="status" aria-live="polite">
    <TransitionGroup name="alert-toast">
      <AlertToast v-for="item in items" :key="item.id" :item="item" @open="open" @dismiss="dismiss" />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useAlertText } from '@/composables/useAlertText'
import { ALERT_TOAST_TIMEOUT_MS } from '@/constants/alerts'
import { useAlertStore } from '@/stores/useAlertStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import AlertToast from './AlertToast.vue'

/** Container: shows queued alert toasts and dismisses each after a timeout (FR-33). */
const alertStore = useAlertStore()
const detailStore = useSymbolDetailStore()
const { toView } = useAlertText()

/** One timer per visible toast; cleared when the toast goes, so nothing outlives the host. */
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const items = computed(() => alertStore.toasts.map(toView))

function dismiss(id: string): void {
  const timer = timers.get(id)
  if (timer !== undefined) clearTimeout(timer)
  timers.delete(id)
  alertStore.dismissToast(id)
}

function open(symbol: string): void {
  void detailStore.open(symbol)
  const event = alertStore.toasts.find((toast) => toast.symbol === symbol)
  if (event) {
    alertStore.markRead(event.id)
    dismiss(event.id)
  }
}

watch(
  () => alertStore.toasts,
  (toasts) => {
    const live = new Set(toasts.map((toast) => toast.id))
    for (const [id, timer] of timers) {
      if (live.has(id)) continue
      clearTimeout(timer)
      timers.delete(id)
    }
    for (const toast of toasts) {
      if (!timers.has(toast.id)) timers.set(toast.id, setTimeout(() => dismiss(toast.id), ALERT_TOAST_TIMEOUT_MS))
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
})
</script>

<style scoped>
.alert-toast-host {
  position: fixed;
  inset-block-end: var(--mtg-space-4);
  inset-inline-end: var(--mtg-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-2);
  pointer-events: none;
}

.alert-toast-host > * {
  pointer-events: auto;
}

.alert-toast-enter-active,
.alert-toast-leave-active {
  transition:
    opacity var(--mtg-duration-medium2) var(--mtg-easing-emphasized-decelerate),
    transform var(--mtg-duration-medium2) var(--mtg-easing-emphasized-decelerate);
}

.alert-toast-enter-from,
.alert-toast-leave-to {
  opacity: 0;
  transform: translateY(var(--mtg-space-4));
}

@media (prefers-reduced-motion: reduce) {
  .alert-toast-enter-active,
  .alert-toast-leave-active {
    transition: none;
  }
}
</style>
