import type { MarketSocketLike, SocketFactory } from '@/api/marketSocket'
import {
  FEED_CHANNELS,
  FLUSH_INTERVAL_MS,
  METRICS_INTERVAL_MS,
  OFFLINE_AFTER_ATTEMPTS,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  SOCKET_IDLE_TIMEOUT_MS,
} from '@/constants/feed'
import type { ConnectionStatus, ResyncReason } from '@/interfaces/websocket'
import type { WorkerInbound, WorkerOutbound } from '@/interfaces/worker'
import { backoffDelay } from '@/utils/backoff'
import type { FeedEngine } from './feedEngine'

export interface FeedControllerDeps {
  createSocket: SocketFactory
  engine: FeedEngine
  post: (message: WorkerOutbound) => void
  random?: () => number
}

const IDLE_CLOSE_CODE = 4_000
const CLIENT_CLOSE_CODE = 1_000

/**
 * Socket lifecycle inside the worker: connect, subscribe, request snapshots, reconnect with
 * backoff (NFR-R1), detect dead connections, and post one patch per flush interval.
 * All state lives in FeedEngine; this class only orchestrates I/O and timers.
 */
export class FeedController {
  private socket: MarketSocketLike | null = null
  private url: string | null = null
  private attempt = 0
  private isStopped = true
  private isPaused = false
  private hasConnectedBefore = false
  private isSnapshotRequested = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private metricsTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly deps: FeedControllerDeps) {}

  handle(message: WorkerInbound): void {
    switch (message.type) {
      case 'connect':
        this.connect(message.url)
        break
      case 'disconnect':
        this.disconnect()
        break
      case 'snapshot':
        this.applySnapshot(message.snapshot)
        break
      case 'pause':
        this.isPaused = message.isPaused
        if (!this.isPaused) this.flush()
        break
      case 'track':
        this.deps.engine.track(message.symbol)
        break
    }
  }

  private connect(url: string): void {
    this.url = url
    this.isStopped = false
    this.attempt = 0
    this.startTimers()
    this.open()
  }

  private disconnect(): void {
    this.isStopped = true
    this.clearTimer('reconnect')
    this.clearTimer('idle')
    this.stopTimers()
    this.socket?.close(CLIENT_CLOSE_CODE, 'client disconnect')
    this.socket = null
    this.postStatus('idle', null)
  }

  private open(): void {
    if (this.isStopped || this.url === null) return
    this.postStatus(this.hasConnectedBefore ? 'reconnecting' : 'connecting', null)
    this.socket = this.deps.createSocket(this.url, {
      onOpen: () => this.onOpen(),
      onMessage: (data, byteLength) => this.onMessage(data, byteLength),
      onClose: () => this.onClose(),
      onError: () => undefined, // a close event always follows
    })
  }

  private onOpen(): void {
    this.attempt = 0
    this.postStatus('open', null)
    this.socket?.send({ op: 'subscribe', channels: [...FEED_CHANNELS] })
    this.deps.engine.invalidate()
    this.isSnapshotRequested = false
    this.requestSnapshot(this.hasConnectedBefore ? 'reconnect' : 'initial')
    this.hasConnectedBefore = true
    this.armIdleTimer()
  }

  private onMessage(data: string, byteLength: number): void {
    this.armIdleTimer()
    let value: unknown
    try {
      value = JSON.parse(data)
    } catch {
      value = undefined // counted as dropped by the engine
    }
    const reason = this.deps.engine.ingest(value, byteLength)
    if (reason) this.requestSnapshot(reason)
  }

  private onClose(): void {
    this.socket = null
    this.clearTimer('idle')
    if (this.isStopped) return
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    const delay = backoffDelay(this.attempt, RECONNECT_BASE_MS, RECONNECT_MAX_MS, this.deps.random)
    this.attempt++
    this.postStatus(this.attempt >= OFFLINE_AFTER_ATTEMPTS ? 'offline' : 'reconnecting', delay)
    this.clearTimer('reconnect')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }

  /** Server heartbeats every few seconds; silence longer than this means the connection is dead. */
  private armIdleTimer(): void {
    this.clearTimer('idle')
    this.idleTimer = setTimeout(() => this.socket?.close(IDLE_CLOSE_CODE, 'idle timeout'), SOCKET_IDLE_TIMEOUT_MS)
  }

  private requestSnapshot(reason: ResyncReason): void {
    if (this.isSnapshotRequested) return
    this.isSnapshotRequested = true
    if (reason !== 'initial') this.deps.engine.noteResync()
    this.deps.post({ type: 'needSnapshot', reason })
  }

  private applySnapshot(snapshot: Parameters<FeedEngine['applySnapshot']>[0]): void {
    this.isSnapshotRequested = false
    const reason = this.deps.engine.applySnapshot(snapshot)
    if (reason) this.requestSnapshot(reason)
    else this.flush()
  }

  private flush(): void {
    if (this.isPaused || !this.deps.engine.hasSnapshot) return
    const patch = this.deps.engine.takePatch()
    if (patch) this.deps.post({ type: 'patch', patch })
  }

  private startTimers(): void {
    this.stopTimers()
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
    this.metricsTimer = setInterval(
      () => this.deps.post({ type: 'metrics', metrics: this.deps.engine.takeMetrics(METRICS_INTERVAL_MS) }),
      METRICS_INTERVAL_MS,
    )
  }

  private stopTimers(): void {
    if (this.flushTimer !== null) clearInterval(this.flushTimer)
    if (this.metricsTimer !== null) clearInterval(this.metricsTimer)
    this.flushTimer = null
    this.metricsTimer = null
  }

  private clearTimer(which: 'reconnect' | 'idle'): void {
    const timer = which === 'reconnect' ? this.reconnectTimer : this.idleTimer
    if (timer !== null) clearTimeout(timer)
    if (which === 'reconnect') this.reconnectTimer = null
    else this.idleTimer = null
  }

  private postStatus(status: ConnectionStatus, retryInMs: number | null): void {
    this.deps.post({ type: 'status', status, attempt: this.attempt, retryInMs })
  }
}
