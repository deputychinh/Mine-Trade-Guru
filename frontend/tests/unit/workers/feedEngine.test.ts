import { describe, expect, it } from 'vitest'
import { FeedEngine } from '@/workers/feedEngine'
import { makeQuote, makeSnapshot } from '../../helpers/fixtures'

const NOW = 1_000_000

function batch(frames: unknown[], gap = false) {
  return { type: 'batch', ts: NOW - 5, gap, frames }
}

function x(v: number, fields: Record<string, unknown> = {}) {
  return { ch: 'X', data: { symbol: 'FPT', v, ...fields } }
}

function engineWithSnapshot(): FeedEngine {
  const engine = new FeedEngine(() => NOW, 100)
  engine.applySnapshot(makeSnapshot([makeQuote({ v: 1 })]))
  engine.takePatch()
  return engine
}

describe('FeedEngine', () => {
  it('buffers frames until the snapshot, then replays only newer versions', () => {
    const engine = new FeedEngine(() => NOW, 100)
    expect(engine.ingest(batch([x(1, { lastPrice: 1 }), x(2, { lastPrice: 100_500 })]), 100)).toBeNull()
    expect(engine.takePatch()).toBeNull()

    expect(engine.applySnapshot(makeSnapshot([makeQuote({ v: 1 })]))).toBeNull()
    const patch = engine.takePatch()
    expect(patch?.quotes).toHaveLength(1)
    expect(patch?.quotes[0]).toMatchObject({ v: 2, lastPrice: 100_500 })
  })

  it('applies the next version and ignores stale ones', () => {
    const engine = engineWithSnapshot()
    engine.ingest(batch([x(2, { lastPrice: 101_000 }), x(2, { lastPrice: 1 })]), 50)
    expect(engine.takePatch()?.quotes[0]).toMatchObject({ v: 2, lastPrice: 101_000 })
    expect(engine.takePatch()).toBeNull()
  })

  it('asks for a snapshot when a version is skipped', () => {
    const engine = engineWithSnapshot()
    expect(engine.ingest(batch([x(3)]), 50)).toBe('version')
    expect(engine.hasSnapshot).toBe(false)
  })

  it('asks for a snapshot when the server flags a gap', () => {
    const engine = engineWithSnapshot()
    expect(engine.ingest(batch([x(2)], true), 50)).toBe('gap')
    expect(engine.hasSnapshot).toBe(false)
  })

  it('extracts trades only for the tracked symbol', () => {
    const engine = engineWithSnapshot()
    const trade = { lastTradeId: 7, lastPrice: 100_100, lastVolume: 200, lastSide: 'B', lastTradeTime: NOW }
    engine.ingest(batch([x(2, trade)]), 50)
    expect(engine.takePatch()?.trades).toEqual([])

    engine.track('FPT')
    engine.ingest(batch([x(3, { ...trade, lastTradeId: 8 })]), 50)
    expect(engine.takePatch()?.trades).toEqual([{ id: 8, symbol: 'FPT', time: NOW, price: 100_100, volume: 200, side: 'B' }])
  })

  it('drops invalid frames and reports them in metrics', () => {
    const engine = engineWithSnapshot()
    engine.ingest(batch([{ ch: 'X', data: { symbol: 'fpt!', v: 2 } }, x(2)]), 1_000)
    engine.ingest('not a message', 10)
    const metrics = engine.takeMetrics(1_000)
    expect(metrics.droppedFrames).toBe(2)
    expect(metrics.framesPerSecond).toBe(1)
    expect(metrics.transitLatencyMs).toBe(5)
  })

  it('throws away a backlog it can never catch up with', () => {
    const engine = new FeedEngine(() => NOW, 2)
    engine.ingest(batch([x(2), x(3), x(4)]), 10)
    engine.applySnapshot(makeSnapshot([makeQuote({ v: 1 })]))
    // Nothing replayed: the snapshot itself is applied by the main thread, so no patch.
    expect(engine.takePatch()).toBeNull()
    expect(engine.hasSnapshot).toBe(true)
  })
})
