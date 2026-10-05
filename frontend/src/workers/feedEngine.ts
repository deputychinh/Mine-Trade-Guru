import { MAX_BUFFERED_FRAMES } from '@/constants/feed'
import type { IndexCode, IndexQuote, Quote, QuoteDelta, SessionMarket, Trade } from '@/interfaces/market'
import type { SessionState } from '@/interfaces/session'
import type { ResyncReason, Snapshot, WireFrame } from '@/interfaces/websocket'
import type { FeedMetrics, MarketPatch } from '@/interfaces/worker'
import { parseServerMessage } from '@/utils/typeGuards'

type ApplyResult = 'gap' | null

/**
 * The worker's market state machine. Pure TypeScript — no sockets, timers or Vue — so it is
 * unit-tested directly. It validates frames, merges deltas by version, detects gaps,
 * tracks what changed, and hands out one patch per flush (NFR-P1, NFR-P2, NFR-R2).
 */
export class FeedEngine {
  private readonly quotes = new Map<string, Quote>()
  private readonly indices = new Map<IndexCode, IndexQuote>()
  private readonly sessions = new Map<SessionMarket, SessionState>()
  private readonly dirtyQuotes = new Set<string>()
  private readonly dirtyIndices = new Set<IndexCode>()
  private readonly dirtySessions = new Set<SessionMarket>()
  private pendingTrades: Trade[] = []
  private trackedSymbol: string | null = null
  /** Frames received while waiting for a snapshot; replayed (by version) once it arrives. */
  private buffered: WireFrame[] = []
  private ready = false
  private serverTs: number | null = null
  private lastTickAt: number | null = null

  private intervalFrames = 0
  private intervalBatches = 0
  private intervalBytes = 0
  private intervalTransitSum = 0
  private intervalTransitCount = 0
  private totalDropped = 0
  private totalResyncs = 0

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxBuffered: number = MAX_BUFFERED_FRAMES,
  ) {}

  /** True once a snapshot is applied and no gap has been seen since. */
  get hasSnapshot(): boolean {
    return this.ready
  }

  /** On (re)connect: keep the last known state but buffer new frames until a fresh snapshot arrives. */
  invalidate(): void {
    this.ready = false
    this.buffered = []
  }

  track(symbol: string | null): void {
    this.trackedSymbol = symbol
    this.pendingTrades = []
  }

  noteResync(): void {
    this.totalResyncs++
  }

  /** Feed one decoded message. Returns a reason when the client must reload the snapshot. */
  ingest(value: unknown, byteLength: number): ResyncReason | null {
    this.intervalBytes += byteLength
    const parsed = parseServerMessage(value)
    if (!parsed) {
      this.totalDropped++
      return null
    }
    this.totalDropped += parsed.invalidFrames
    const { message } = parsed
    if (message.type === 'hb') return null

    const now = this.now()
    this.intervalBatches++
    this.intervalFrames += message.frames.length
    this.intervalTransitSum += now - message.ts
    this.intervalTransitCount++

    if (!this.ready) {
      this.buffer(message.frames)
      return null
    }
    if (message.gap) {
      // The server skipped frames for us (backpressure) or the day rolled: state can't be trusted.
      this.ready = false
      this.buffer(message.frames)
      return 'gap'
    }

    this.serverTs = this.serverTs === null ? message.ts : Math.max(this.serverTs, message.ts)
    for (let i = 0; i < message.frames.length; i++) {
      const frame = message.frames[i]
      if (frame && this.applyFrame(frame, now) === 'gap') {
        this.ready = false
        this.buffer(message.frames.slice(i))
        return 'version'
      }
    }
    return null
  }

  /** Replace state with the snapshot, then replay buffered frames newer than it. */
  applySnapshot(snapshot: Snapshot): ResyncReason | null {
    this.quotes.clear()
    this.indices.clear()
    this.sessions.clear()
    this.dirtyQuotes.clear()
    this.dirtyIndices.clear()
    this.dirtySessions.clear()
    for (const quote of snapshot.quotes) this.quotes.set(quote.symbol, quote)
    for (const index of snapshot.indices) this.indices.set(index.code, index)
    for (const session of snapshot.sessions) this.sessions.set(session.market, session)
    this.ready = true

    const replay = this.buffered
    this.buffered = []
    const now = this.now()
    for (let i = 0; i < replay.length; i++) {
      const frame = replay[i]
      if (frame && this.applyFrame(frame, now) === 'gap') {
        this.ready = false
        this.buffer(replay.slice(i))
        return 'version'
      }
    }
    return null
  }

  /** Everything that changed since the last call, or null when nothing did. */
  takePatch(): MarketPatch | null {
    if (
      this.dirtyQuotes.size === 0 &&
      this.dirtyIndices.size === 0 &&
      this.dirtySessions.size === 0 &&
      this.pendingTrades.length === 0
    ) {
      return null
    }
    const patch: MarketPatch = {
      quotes: this.collect(this.dirtyQuotes, this.quotes),
      indices: this.collect(this.dirtyIndices, this.indices),
      sessions: this.collect(this.dirtySessions, this.sessions),
      trades: this.pendingTrades,
      serverTs: this.serverTs,
      lastTickAt: this.lastTickAt,
    }
    this.pendingTrades = []
    this.serverTs = null
    return patch
  }

  takeMetrics(intervalMs: number): FeedMetrics {
    const seconds = Math.max(intervalMs, 1) / 1_000
    const metrics: FeedMetrics = {
      framesPerSecond: this.intervalFrames / seconds,
      batchesPerSecond: this.intervalBatches / seconds,
      bytesPerSecond: this.intervalBytes / seconds,
      averageBatchFrames: this.intervalBatches > 0 ? this.intervalFrames / this.intervalBatches : 0,
      transitLatencyMs: this.intervalTransitCount > 0 ? this.intervalTransitSum / this.intervalTransitCount : null,
      droppedFrames: this.totalDropped,
      resyncs: this.totalResyncs,
    }
    this.intervalFrames = 0
    this.intervalBatches = 0
    this.intervalBytes = 0
    this.intervalTransitSum = 0
    this.intervalTransitCount = 0
    return metrics
  }

  private buffer(frames: readonly WireFrame[]): void {
    this.buffered.push(...frames)
    // Too far behind to catch up frame by frame: drop the backlog, the next snapshot covers it.
    if (this.buffered.length > this.maxBuffered) this.buffered = []
  }

  private collect<K, V>(keys: Set<K>, source: ReadonlyMap<K, V>): V[] {
    const values: V[] = []
    for (const key of keys) {
      const value = source.get(key)
      if (value !== undefined) values.push(value)
    }
    keys.clear()
    return values
  }

  private applyFrame(frame: WireFrame, now: number): ApplyResult {
    switch (frame.ch) {
      case 'X':
      case 'R':
        return this.applyQuoteDelta(frame.data, now)
      case 'MI': {
        const current = this.indices.get(frame.data.code)
        if (!current || frame.data.v > current.v) {
          this.indices.set(frame.data.code, frame.data)
          this.dirtyIndices.add(frame.data.code)
        }
        return null
      }
      case 'F':
        this.sessions.set(frame.data.market, frame.data)
        this.dirtySessions.add(frame.data.market)
        return null
    }
  }

  /** X and R share one version counter per symbol: older = already applied, +1 = apply, else gap. */
  private applyQuoteDelta(delta: QuoteDelta, now: number): ApplyResult {
    const current = this.quotes.get(delta.symbol)
    if (!current) return 'gap'
    if (delta.v <= current.v) return null
    if (delta.v !== current.v + 1) return 'gap'

    const next = { ...current, ...delta } as Quote
    this.quotes.set(delta.symbol, next)
    this.dirtyQuotes.add(delta.symbol)
    this.lastTickAt = now

    if (
      delta.symbol === this.trackedSymbol &&
      delta.lastTradeId !== undefined &&
      next.lastTradeId !== null &&
      next.lastTradeId !== current.lastTradeId &&
      next.lastPrice !== null &&
      next.lastVolume !== null &&
      next.lastSide !== null &&
      next.lastTradeTime !== null
    ) {
      this.pendingTrades.push({
        id: next.lastTradeId,
        symbol: next.symbol,
        time: next.lastTradeTime,
        price: next.lastPrice,
        volume: next.lastVolume,
        side: next.lastSide,
      })
    }
    return null
  }
}
