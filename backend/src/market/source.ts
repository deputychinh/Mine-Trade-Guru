import type { Bar, IndexCode, IndexPoint, Instrument, Snapshot, Trade, VolumeAtPrice, WireFrame } from './types.js'

export interface StepResult {
  frames: WireFrame[]
  /** A new trading day started: every client must reload the snapshot. */
  dayRolled: boolean
}

/** Produces wire frames as time passes. The WebSocket gateway depends only on this. */
export interface FrameSource {
  step(elapsedMs: number): StepResult
}

/**
 * Everything REST and WebSocket need from a market feed (NFR-M3).
 * `MarketSimulator` implements it today; an SSI FastConnect relay would implement it
 * later, mapping SSI payloads to these types — so the credentials stay on the server
 * and the frontend never changes.
 */
export interface MarketDataSource extends FrameSource {
  readonly instruments: readonly Instrument[]
  getSnapshot(): Snapshot
  hasSymbol(symbol: string): boolean
  /** Newest first. */
  getTrades(symbol: string, limit: number): Trade[]
  getBars(symbol: string): Bar[]
  /** Highest price first. */
  getVolumeByPrice(symbol: string): VolumeAtPrice[]
  getIndexHistory(code: IndexCode): IndexPoint[]
}
