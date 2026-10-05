import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OVERVIEW_THROTTLE_MS } from '@/constants/limits'
import type { SessionState } from '@/interfaces/session'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { usePerfStore } from '@/stores/usePerfStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { makeIndex, makeInstrument, makeQuote, makeSnapshot } from '../../helpers/fixtures'

const api = vi.hoisted(() => ({ fetchInstruments: vi.fn(), fetchIndexHistory: vi.fn() }))
vi.mock('@/api/marketApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))

function session(overrides: Partial<SessionState> = {}): SessionState {
  return { market: 'HOSE', phase: 'CONTINUOUS', nextPhase: 'LUNCH', nextPhaseAt: 10_000, marketTime: 0, clockSpeed: 2, ...overrides }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useConnectionStore', () => {
  it('tracks status, newest tick, resyncs and pause', () => {
    const connection = useConnectionStore()
    connection.setStatus('reconnecting', 2, 4_000)
    expect([connection.status, connection.attempt, connection.retryInMs]).toEqual(['reconnecting', 2, 4_000])
    connection.markTick(10)
    connection.markTick(5)
    expect(connection.lastTickAt).toBe(10)
    connection.markResync('initial')
    connection.markResync('gap')
    expect(connection.resyncCount).toBe(1)
    connection.setPaused(true)
    connection.togglePause()
    expect(connection.isPaused).toBe(false)
  })
})

describe('useSessionStore', () => {
  it('extrapolates market time and the countdown with the clock speed', () => {
    const sessions = useSessionStore()
    sessions.applySessions([session()], 1_000)
    expect(sessions.stateOf('HOSE')?.phase).toBe('CONTINUOUS')
    expect(sessions.marketTimeAt('HOSE', 2_000)).toBe(2_000)
    expect(sessions.msUntilNextPhase('HOSE', 2_000)).toBe(4_000)
    expect(sessions.isAnyOpen).toBe(true)
    expect(sessions.stateOf('HNX')).toBeNull()
  })

  it('is closed when no market is in an open phase', () => {
    const sessions = useSessionStore()
    sessions.applySessions([session({ phase: 'LUNCH', nextPhaseAt: null })])
    expect(sessions.isAnyOpen).toBe(false)
    expect(sessions.msUntilNextPhase('HOSE', 0)).toBeNull()
  })
})

describe('usePerfStore', () => {
  it('summarizes paint samples on each metrics tick', () => {
    const perf = usePerfStore()
    for (let i = 1; i <= 100; i++) perf.recordPaint(i)
    perf.recordApply(1.5)
    perf.recordFeedMetrics({
      framesPerSecond: 60,
      batchesPerSecond: 10,
      bytesPerSecond: 1,
      averageBatchFrames: 6,
      transitLatencyMs: 1,
      droppedFrames: 0,
      resyncs: 0,
    })
    expect(perf.snapshot).toMatchObject({ tickToPaintP50Ms: 50, tickToPaintP95Ms: 95, applyPatchMs: 1.5 })
  })
})

describe('useInstrumentStore', () => {
  it('loads once and indexes by symbol', async () => {
    api.fetchInstruments.mockResolvedValue([makeInstrument()])
    const store = useInstrumentStore()
    await Promise.all([store.load(), store.load()])
    expect(api.fetchInstruments).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('ready')
    expect(store.get('FPT')?.name).toBe('FPT Corporation')
    expect(store.searchIndex).toHaveLength(1)
  })

  it('keeps the error and allows a retry', async () => {
    api.fetchInstruments.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
    const store = useInstrumentStore()
    await store.load()
    expect([store.status, store.error]).toEqual(['error', 'offline'])
    await store.load()
    expect(store.status).toBe('ready')
  })
})

describe('useSettingsStore', () => {
  it('patches, persists and resets', async () => {
    const settings = useSettingsStore()
    settings.patch({ locale: 'en', priceUnit: 'vnd' })
    settings.update('theme', 'light')
    expect(settings.formatContext).toEqual({ locale: 'en', priceUnit: 'vnd', volumeUnit: 'ten' })
    await Promise.resolve()
    expect(JSON.parse(window.localStorage.getItem('mtg.settings.v1') ?? '{}').theme).toBe('light')
    settings.reset()
    expect(settings.settings.theme).toBe('dark')
  })
})

describe('useMarketStore overview', () => {
  it('throttles derived panels and builds the index sparkline', () => {
    vi.useFakeTimers()
    const market = useMarketStore()
    const instruments = useInstrumentStore()
    instruments.instruments = [makeInstrument({ symbol: 'FPT' }), makeInstrument({ symbol: 'VCB' })]
    market.applySnapshot(makeSnapshot([makeQuote({ symbol: 'FPT', lastPrice: 101_000 }), makeQuote({ symbol: 'VCB' })]))
    const version = market.overviewVersion
    expect(market.breadth.HOSE.advancers).toBe(1)

    const patch = (v: number) => ({ quotes: [makeQuote({ symbol: 'VCB', v, lastPrice: 99_000 })], indices: [makeIndex({ v, updatedAt: v, totalVolume: 1_000_000 + v * 100 })], sessions: [], trades: [], serverTs: null, lastTickAt: null })
    market.applyPatch(patch(2))
    market.applyPatch(patch(3))
    expect(market.overviewVersion).toBe(version)
    vi.advanceTimersByTime(OVERVIEW_THROTTLE_MS)
    expect(market.overviewVersion).toBe(version + 1)
    expect(market.breadth.HOSE.decliners).toBe(1)
    // One minute bucket; its volume is what traded between the two index updates.
    expect(market.indexHistory.get('VNINDEX')).toEqual([{ time: 0, value: 1_280, volume: 300 }])
    expect(market.snapshotQuotes()).toHaveLength(2)
  })

  it('loads index history and keeps what succeeded', async () => {
    api.fetchIndexHistory.mockImplementation(async (code: string) => {
      if (code === 'VN30') throw new Error('missing')
      return [{ time: 0, value: 1, volume: 0 }]
    })
    const market = useMarketStore()
    await market.loadIndexHistory()
    expect(market.indexHistory.get('VNINDEX')).toHaveLength(1)
    expect(market.indexHistory.has('VN30')).toBe(false)
  })
})
