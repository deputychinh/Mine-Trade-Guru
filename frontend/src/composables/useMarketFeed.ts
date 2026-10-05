import { onMounted, onUnmounted, watch } from 'vue'
import { fetchSnapshot } from '@/api/marketApi'
import { resolveWsUrl } from '@/api/marketSocket'
import { WS_URL_OVERRIDE } from '@/constants/api'
import { RECONNECT_MAX_MS, SNAPSHOT_RETRY_MS } from '@/constants/feed'
import type { ResyncReason } from '@/interfaces/websocket'
import type { MarketPatch, WorkerInbound, WorkerOutbound } from '@/interfaces/worker'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { usePerfStore } from '@/stores/usePerfStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import { backoffDelay } from '@/utils/backoff'
import { mergePatches } from '@/utils/patchMerge'

export interface MarketFeedOptions {
  /** Injected in tests; the default spawns the real module worker. */
  createWorker?: () => Worker
}

function createTickWorker(): Worker {
  // Static relative URL so Vite can bundle the worker.
  return new Worker(new URL('../workers/tickWorker.ts', import.meta.url), { type: 'module' })
}

/**
 * Owns the market data path on the main thread (plan §6): starts the worker, loads a
 * snapshot whenever the worker asks, and applies worker patches once per animation frame
 * (NFR-P1, NFR-P2). The worker does all parsing and merging; this only moves results into
 * stores. Call once, from the page container.
 */
export function useMarketFeed(options: MarketFeedOptions = {}) {
  const market = useMarketStore()
  const sessions = useSessionStore()
  const connection = useConnectionStore()
  const detail = useSymbolDetailStore()
  const perf = usePerfStore()
  const isPerfEnabled = import.meta.env.DEV

  let worker: Worker | null = null
  let pending: MarketPatch[] = []
  let frameHandle: number | null = null
  let snapshotController: AbortController | null = null
  let snapshotRetryTimer: ReturnType<typeof setTimeout> | null = null
  let snapshotAttempt = 0

  function post(message: WorkerInbound): void {
    worker?.postMessage(message)
  }

  function clearSnapshotRetry(): void {
    if (snapshotRetryTimer !== null) clearTimeout(snapshotRetryTimer)
    snapshotRetryTimer = null
  }

  async function loadSnapshot(reason: ResyncReason): Promise<void> {
    connection.markResync(reason)
    clearSnapshotRetry()
    snapshotController?.abort()
    const controller = new AbortController()
    snapshotController = controller
    try {
      const snapshot = await fetchSnapshot(controller.signal)
      if (controller.signal.aborted) return
      snapshotAttempt = 0
      connection.setSnapshotError(null)
      pending = [] // anything queued is older than the snapshot
      market.applySnapshot(snapshot)
      sessions.applySessions(snapshot.sessions)
      post({ type: 'snapshot', snapshot })
    } catch (cause) {
      if (controller.signal.aborted) return
      connection.setSnapshotError(cause instanceof Error ? cause.message : String(cause))
      const delay = backoffDelay(snapshotAttempt++, SNAPSHOT_RETRY_MS, RECONNECT_MAX_MS)
      snapshotRetryTimer = setTimeout(() => void loadSnapshot(reason), delay)
    }
  }

  /** All patches that arrive within one frame become a single store update. */
  function flush(): void {
    frameHandle = null
    const patch = mergePatches(pending)
    pending = []
    if (!patch) return

    const startedAt = performance.now()
    market.applyPatch(patch)
    sessions.applySessions(patch.sessions)
    detail.applyTrades(patch.trades)
    connection.markTick(patch.lastTickAt)

    if (isPerfEnabled) {
      perf.recordApply(performance.now() - startedAt)
      const { serverTs } = patch
      // The next frame callback runs after this frame has painted: that's tick-to-paint.
      if (serverTs !== null) requestAnimationFrame(() => perf.recordPaint(Date.now() - serverTs))
    }
  }

  function schedule(patch: MarketPatch): void {
    pending.push(patch)
    if (frameHandle === null) frameHandle = requestAnimationFrame(flush)
  }

  function onWorkerMessage(event: MessageEvent<WorkerOutbound>): void {
    const message = event.data
    switch (message.type) {
      case 'status':
        connection.setStatus(message.status, message.attempt, message.retryInMs)
        break
      case 'needSnapshot':
        void loadSnapshot(message.reason)
        break
      case 'patch':
        schedule(message.patch)
        break
      case 'metrics':
        if (isPerfEnabled) perf.recordFeedMetrics(message.metrics)
        break
    }
  }

  function start(): void {
    if (worker) return
    worker = (options.createWorker ?? createTickWorker)()
    worker.addEventListener('message', onWorkerMessage)
    post({ type: 'pause', isPaused: connection.isPaused })
    post({ type: 'track', symbol: detail.symbol })
    post({ type: 'connect', url: resolveWsUrl(WS_URL_OVERRIDE, window.location) })
  }

  function stop(): void {
    post({ type: 'disconnect' })
    worker?.removeEventListener('message', onWorkerMessage)
    worker?.terminate()
    worker = null
    if (frameHandle !== null) cancelAnimationFrame(frameHandle)
    frameHandle = null
    pending = []
    snapshotController?.abort()
    clearSnapshotRetry()
    connection.setStatus('idle', 0, null)
  }

  // Pause keeps the socket open and state current inside the worker; it only stops patches (FR-45).
  watch(
    () => connection.isPaused,
    (isPaused) => post({ type: 'pause', isPaused }),
  )
  // Trades for the tape/chart are only extracted for the symbol the drawer shows.
  watch(
    () => detail.symbol,
    (symbol) => post({ type: 'track', symbol }),
  )

  onMounted(start)
  onUnmounted(stop)

  return { start, stop }
}
