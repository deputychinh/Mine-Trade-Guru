import type { ForeignDelta, IndexQuote, Quote, QuoteDelta } from './market'
import type { SessionState } from './session'

// Feed protocol shared by REST snapshot and WebSocket. Mirrors backend/src/market/types.ts.

export type Channel = 'X' | 'R' | 'MI' | 'F'

export type WireFrame =
  | { ch: 'X'; data: QuoteDelta }
  | { ch: 'R'; data: ForeignDelta }
  | { ch: 'MI'; data: IndexQuote }
  | { ch: 'F'; data: SessionState }

export type ServerMessage =
  | { type: 'batch'; ts: number; gap: boolean; frames: WireFrame[] }
  | { type: 'hb'; ts: number }

export type ClientMessage =
  | { op: 'subscribe'; channels: Channel[] }
  | { op: 'unsubscribe'; channels: Channel[] }

export interface Snapshot {
  serverTime: number
  quotes: Quote[]
  indices: IndexQuote[]
  sessions: SessionState[]
}

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'offline'

export type ResyncReason = 'initial' | 'reconnect' | 'gap' | 'version'
