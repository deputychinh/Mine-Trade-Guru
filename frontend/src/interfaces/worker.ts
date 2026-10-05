import type { IndexQuote, Quote, Trade } from './market'
import type { SessionState } from './session'
import type { ConnectionStatus, ResyncReason, Snapshot } from './websocket'

/** Everything that changed since the previous patch. Posted by the worker at most every flush interval. */
export interface MarketPatch {
  quotes: Quote[]
  indices: IndexQuote[]
  sessions: SessionState[]
  /** New trades of the tracked (detail drawer) symbol, oldest first. */
  trades: Trade[]
  /** Newest server send time among batches in this patch; used for tick-to-paint latency. */
  serverTs: number | null
  /** Local time the newest quote frame arrived. */
  lastTickAt: number | null
}

export interface FeedMetrics {
  framesPerSecond: number
  batchesPerSecond: number
  bytesPerSecond: number
  averageBatchFrames: number
  /** Worker receive time − server send time, averaged over the last second. */
  transitLatencyMs: number | null
  droppedFrames: number
  resyncs: number
}

export type WorkerInbound =
  | { type: 'connect'; url: string }
  | { type: 'disconnect' }
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'pause'; isPaused: boolean }
  | { type: 'track'; symbol: string | null }

export type WorkerOutbound =
  | { type: 'status'; status: ConnectionStatus; attempt: number; retryInMs: number | null }
  | { type: 'needSnapshot'; reason: ResyncReason }
  | { type: 'patch'; patch: MarketPatch }
  | { type: 'metrics'; metrics: FeedMetrics }
