import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConnectionStatus, ResyncReason } from '@/interfaces/websocket'

/** Feed connection state for the header indicator and stale-data warning (FR-45, NFR-R3). */
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('idle')
  const attempt = ref(0)
  const retryInMs = ref<number | null>(null)
  /** Local time of the last quote tick applied to the board. */
  const lastTickAt = ref<number | null>(null)
  const isPaused = ref(false)
  const resyncCount = ref(0)
  const lastResyncReason = ref<ResyncReason | null>(null)
  const snapshotError = ref<string | null>(null)

  function setStatus(next: ConnectionStatus, nextAttempt: number, nextRetryInMs: number | null): void {
    status.value = next
    attempt.value = nextAttempt
    retryInMs.value = nextRetryInMs
  }

  function markTick(at: number | null): void {
    if (at !== null && (lastTickAt.value === null || at > lastTickAt.value)) lastTickAt.value = at
  }

  function markResync(reason: ResyncReason): void {
    lastResyncReason.value = reason
    if (reason !== 'initial') resyncCount.value++
  }

  function setSnapshotError(message: string | null): void {
    snapshotError.value = message
  }

  function setPaused(value: boolean): void {
    isPaused.value = value
  }

  function togglePause(): void {
    isPaused.value = !isPaused.value
  }

  return {
    status,
    attempt,
    retryInMs,
    lastTickAt,
    isPaused,
    resyncCount,
    lastResyncReason,
    snapshotError,
    setStatus,
    markTick,
    markResync,
    setSnapshotError,
    setPaused,
    togglePause,
  }
})
