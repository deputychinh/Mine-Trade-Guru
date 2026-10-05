import { describe, expect, it } from 'vitest'
import { createRandom } from '../src/lib/random.js'
import { buildCatalogue } from '../src/market/instruments.js'
import { tickSize } from '../src/market/rules.js'
import { MarketClock, type SessionMode } from '../src/market/session.js'
import { MarketSimulator, diffQuote } from '../src/market/simulator.js'
import type { Quote, WireFrame } from '../src/market/types.js'

function vnTime(hour: number, minute: number): number {
  return Date.UTC(2026, 9, 1, hour - 7, minute)
}

function createSimulator(mode: SessionMode, startTime = '10:00', ticksPerSecond = 5, realHour = 10) {
  const clockState = { real: vnTime(realHour, 0) }
  const random = createRandom(7)
  const clock = new MarketClock(mode, 60, startTime, () => clockState.real)
  const simulator = new MarketSimulator({
    catalogue: buildCatalogue(0, random),
    clock,
    random,
    ticksPerSecond,
    tradeHistoryLimit: 5_000,
    loopDay: true,
  })
  return { simulator, clockState }
}

function run(simulator: MarketSimulator, clockState: { real: number }, steps: number, stepMs = 100): WireFrame[] {
  const frames: WireFrame[] = []
  for (let i = 0; i < steps; i++) {
    clockState.real += stepMs
    frames.push(...simulator.step(stepMs).frames)
  }
  return frames
}

describe('MarketSimulator', () => {
  it('replaying every delta on the initial snapshot reproduces the final state exactly', () => {
    const { simulator, clockState } = createSimulator('always-open')
    const quotes = new Map(simulator.getSnapshot().quotes.map((quote) => [quote.symbol, { ...quote }]))

    const frames = run(simulator, clockState, 300)
    expect(frames.length).toBeGreaterThan(1_000)

    for (const frame of frames) {
      if (frame.ch !== 'X' && frame.ch !== 'R') continue
      const current = quotes.get(frame.data.symbol)
      expect(current).toBeDefined()
      if (!current) continue
      expect(frame.data.v).toBe(current.v + 1)
      quotes.set(frame.data.symbol, { ...current, ...frame.data } as Quote)
    }

    for (const final of simulator.getSnapshot().quotes) {
      expect(quotes.get(final.symbol)).toEqual(final)
    }
  })

  it('keeps every price inside the daily band and on a valid tick', () => {
    const { simulator, clockState } = createSimulator('always-open')
    run(simulator, clockState, 600)
    const instruments = new Map(simulator.instruments.map((instrument) => [instrument.symbol, instrument]))

    for (const quote of simulator.getSnapshot().quotes) {
      const instrument = instruments.get(quote.symbol)
      if (!instrument || quote.lastPrice === null) continue
      expect(quote.lastPrice).toBeGreaterThanOrEqual(quote.floor)
      expect(quote.lastPrice).toBeLessThanOrEqual(quote.ceiling)
      if (instrument.type !== 'CW') {
        const tick = tickSize(instrument, quote.lastPrice)
        const units = quote.lastPrice / tick
        expect(Math.abs(units - Math.round(units))).toBeLessThan(1e-6)
      }
      for (const level of [...quote.bids, ...quote.asks]) {
        if (level.price === null) continue
        expect(level.price).toBeGreaterThanOrEqual(quote.floor)
        expect(level.price).toBeLessThanOrEqual(quote.ceiling)
      }
    }
  })

  it('records every trade and its volume in the 1-minute bars', () => {
    const { simulator, clockState } = createSimulator('always-open')
    run(simulator, clockState, 400)
    const quote = simulator.getSnapshot().quotes.find((candidate) => candidate.totalVolume > 0)
    expect(quote).toBeDefined()
    if (!quote) return

    const trades = simulator.getTrades(quote.symbol, 5_000)
    const barVolume = simulator.getBars(quote.symbol).reduce((sum, bar) => sum + bar.volume, 0)
    const profile = simulator.getVolumeByPrice(quote.symbol)
    expect(trades.reduce((sum, trade) => sum + trade.volume, 0)).toBe(quote.totalVolume)
    expect(barVolume).toBe(quote.totalVolume)
    expect(profile.reduce((sum, level) => sum + level.volume, 0)).toBe(quote.totalVolume)
    expect(profile.map((level) => level.price)).toEqual([...profile.map((level) => level.price)].sort((a, b) => b - a))
    expect(trades[0]?.id).toBe(quote.lastTradeId)
  })

  it('index breadth counts add up to the number of constituents', () => {
    const { simulator, clockState } = createSimulator('always-open')
    run(simulator, clockState, 300)
    const { indices } = simulator.getSnapshot()
    const vn30 = indices.find((index) => index.code === 'VN30')
    expect(vn30).toBeDefined()
    expect((vn30?.advancers ?? 0) + (vn30?.decliners ?? 0) + (vn30?.unchanged ?? 0)).toBe(30)
    expect(simulator.getIndexHistory('VN30').length).toBeGreaterThan(0)
    const points = simulator.getIndexHistory('VN30')
    expect(points.every((point) => Number.isInteger(point.volume) && point.volume >= 0)).toBe(true)
    expect(points.reduce((sum, point) => sum + point.volume, 0)).toBeGreaterThan(0)
  })

  it('runs an opening auction when HOSE leaves ATO', () => {
    const { simulator, clockState } = createSimulator('simulated', '09:14', 2)
    const hoseSymbols = new Set(
      simulator.instruments
        .filter((instrument) => instrument.exchange === 'HOSE' && instrument.type !== 'CW')
        .map((instrument) => instrument.symbol),
    )
    // 09:14 → ~09:16 market time at 60x speed
    const frames = run(simulator, clockState, 25)
    const sessionFrame = frames.find((frame) => frame.ch === 'F' && frame.data.market === 'HOSE')
    expect(sessionFrame?.data).toMatchObject({ phase: 'CONTINUOUS' })

    const auctionTrades = frames.filter(
      (frame) => frame.ch === 'X' && hoseSymbols.has(frame.data.symbol) && frame.data.lastSide === 'U',
    )
    expect(auctionTrades.length).toBe(hoseSymbols.size)
  })

  it('rolls to a new trading day after the close and uses the last price as the new reference', () => {
    const { simulator, clockState } = createSimulator('simulated', '15:04', 5)
    const before = simulator.getSnapshot().quotes.find((quote) => quote.symbol === 'FPT')
    let rolled = false
    for (let i = 0; i < 40 && !rolled; i++) {
      clockState.real += 100
      rolled = simulator.step(100).dayRolled
    }
    expect(rolled).toBe(true)
    const after = simulator.getSnapshot().quotes.find((quote) => quote.symbol === 'FPT')
    expect(after?.reference).toBe(before?.lastPrice ?? before?.reference)
    expect(after?.totalVolume).toBe(0)
    expect((after?.v ?? 0) > (before?.v ?? 0)).toBe(true)
  })
})

describe('diffQuote', () => {
  it('contains only changed fields plus symbol and version', () => {
    const { simulator } = createSimulator('always-open')
    const quote = simulator.getSnapshot().quotes[0]
    if (!quote) throw new Error('no quote')
    const next: Quote = { ...quote, v: quote.v + 1, lastPrice: quote.reference, totalVolume: 100 }
    expect(diffQuote(quote, next)).toEqual({
      symbol: quote.symbol,
      v: quote.v + 1,
      lastPrice: quote.reference,
      totalVolume: 100,
    })
  })
})

describe('index history backfill', () => {
  it('fills the session from 09:00 to now, flat over lunch, ending at the live value', () => {
    // Started at 14:00 Vietnam time with the market open.
    const { simulator } = createSimulator('always-open', '10:00', 5, 14)
    const points = simulator.getIndexHistory('VNINDEX')
    const minuteOf = (time: number) => Math.round((time - vnTime(0, 0)) / 60_000)

    expect(minuteOf(points[0]!.time)).toBe(9 * 60)
    expect(minuteOf(points.at(-1)!.time)).toBe(14 * 60)
    const lunch = points.filter((point) => minuteOf(point.time) >= 11 * 60 + 30 && minuteOf(point.time) < 13 * 60)
    expect(lunch).toHaveLength(90)
    expect(new Set(lunch.map((point) => point.value)).size).toBe(1)
    expect(lunch.every((point) => point.volume === 0)).toBe(true)
    for (let i = 1; i < points.length; i++) expect(points[i]!.time).toBeGreaterThan(points[i - 1]!.time)
  })
})
