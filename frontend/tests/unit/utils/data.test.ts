import { describe, expect, it } from 'vitest'
import type { BoardRow } from '@/interfaces/board'
import type { Bar, Trade } from '@/interfaces/market'
import type { MarketPatch } from '@/interfaces/worker'
import { backoffDelay } from '@/utils/backoff'
import { aggregateBars, applyTradesToBars } from '@/utils/barAggregate'
import { toCandles, toLinePoints } from '@/utils/chartData'
import { parseSymbolsCsv, symbolsToCsv } from '@/utils/csv'
import { computeHeatmapLayout, heatBucket } from '@/utils/heatmapLayout'
import { mergePatches } from '@/utils/patchMerge'
import { sortBoardRows } from '@/utils/quoteSort'
import { appendCapped, prependCapped } from '@/utils/ringBuffer'
import { buildSearchIndex, normalizeText, searchInstruments } from '@/utils/searchIndex'
import { parseSettings } from '@/utils/storageParsers'
import { makeInstrument, makeQuote } from '../../helpers/fixtures'

const MINUTE = 60_000

function row(symbol: string, changePercent: number | null, isPinned = false): BoardRow {
  return { symbol, instrument: makeInstrument({ symbol }), quote: makeQuote({ symbol, changePercent }), isPinned, isWatched: false }
}

function patch(overrides: Partial<MarketPatch>): MarketPatch {
  return { quotes: [], indices: [], sessions: [], trades: [], serverTs: null, lastTickAt: null, ...overrides }
}

describe('ringBuffer', () => {
  it('keeps the newest items in both directions', () => {
    expect(appendCapped([1, 2, 3], [4, 5], 3)).toEqual([3, 4, 5])
    expect(prependCapped([3, 2, 1], [5, 4], 3)).toEqual([5, 4, 3])
  })
})

describe('sortBoardRows', () => {
  const rows = [row('AAA', 1), row('BBB', null), row('CCC', 3), row('DDD', -2, true)]

  it('keeps pinned rows first and missing values last in both directions', () => {
    const desc = sortBoardRows(rows, { key: 'changePercent', direction: 'desc' }).map((r) => r.symbol)
    const asc = sortBoardRows(rows, { key: 'changePercent', direction: 'asc' }).map((r) => r.symbol)
    expect(desc).toEqual(['DDD', 'CCC', 'AAA', 'BBB'])
    expect(asc).toEqual(['DDD', 'AAA', 'CCC', 'BBB'])
  })

  it('keeps the incoming order without a sort, pinned first', () => {
    expect(sortBoardRows(rows, null).map((r) => r.symbol)).toEqual(['DDD', 'AAA', 'BBB', 'CCC'])
  })
})

describe('searchIndex', () => {
  const index = buildSearchIndex([
    makeInstrument({ symbol: 'FPT', name: 'FPT Corporation' }),
    makeInstrument({ symbol: 'DGW', name: 'Thế Giới Số' }),
    makeInstrument({ symbol: 'GVR', name: 'Tập đoàn Công nghiệp Cao su' }),
  ])

  it('ignores Vietnamese diacritics', () => {
    expect(normalizeText('Đức Giang')).toBe('duc giang')
    expect(searchInstruments(index, 'the gioi', 5)).toEqual(['DGW'])
  })

  it('ranks symbol matches above name matches', () => {
    expect(searchInstruments(index, 'g', 5)).toEqual(['GVR', 'DGW'])
    expect(searchInstruments(index, '', 5)).toEqual([])
  })
})

describe('csv', () => {
  it('accepts any separator, drops headers, duplicates and formula injection', () => {
    expect(parseSymbolsCsv('symbol\nfpt, VCB;FPT\n=HYPERLINK("x")')).toEqual({
      symbols: ['FPT', 'VCB'],
      invalid: ['=HYPERLINK("x")'],
    })
    expect(symbolsToCsv(['FPT', '=CMD'])).toBe('symbol\nFPT\n')
  })
})

describe('storage parsers', () => {
  it('falls back to defaults for unknown or tampered values', () => {
    const parsed = parseSettings({ theme: 'neon', locale: 'en', isFlashEnabled: 'yes' })
    expect(parsed.theme).toBe('dark')
    expect(parsed.locale).toBe('en')
    expect(parsed.isFlashEnabled).toBe(true)
  })
})

describe('mergePatches', () => {
  it('keeps the latest quote per symbol and every trade in order', () => {
    const first = patch({ quotes: [makeQuote({ v: 2 })], trades: [{ id: 1 } as Trade], serverTs: 10 })
    const second = patch({ quotes: [makeQuote({ v: 3 })], trades: [{ id: 2 } as Trade], serverTs: 20 })
    const merged = mergePatches([first, second])
    expect(merged?.quotes.map((q) => q.v)).toEqual([3])
    expect(merged?.trades.map((t) => t.id)).toEqual([1, 2])
    expect(merged?.serverTs).toBe(20)
    expect(mergePatches([])).toBeNull()
  })
})

describe('bars', () => {
  const trade = (id: number, time: number, price: number): Trade => ({ id, symbol: 'FPT', time, price, volume: 10, side: 'B' })

  it('folds trades into 1-minute bars', () => {
    const bars = applyTradesToBars([], [trade(1, 0, 100), trade(2, 30_000, 105), trade(3, MINUTE, 99)], 10)
    expect(bars).toEqual([
      { time: 0, open: 100, high: 105, low: 100, close: 105, volume: 20 },
      { time: MINUTE, open: 99, high: 99, low: 99, close: 99, volume: 10 },
    ])
  })

  it('aggregates to larger timeframes', () => {
    const minutes: Bar[] = [0, 1, 2, 3, 4, 5].map((i) => ({ time: i * MINUTE, open: i, high: i + 1, low: i, close: i + 0.5, volume: 1 }))
    const fives = aggregateBars(minutes, 5)
    expect(fives).toHaveLength(2)
    expect(fives[0]).toEqual({ time: 0, open: 0, high: 5, low: 0, close: 4.5, volume: 5 })
  })

  it('converts to strictly ascending chart points in seconds', () => {
    expect(toLinePoints([{ time: 2_000, value: 1, volume: 0 }, { time: 2_000, value: 2, volume: 0 }, { time: 1_000, value: 3, volume: 0 }])).toEqual([{ time: 2, value: 2 }])
    expect(toCandles([{ time: 60_000, open: 1, high: 2, low: 0, close: 1, volume: 5 }])[0]?.time).toBe(60)
  })
})

describe('backoffDelay', () => {
  it('doubles the window per attempt within the cap', () => {
    expect(backoffDelay(0, 1_000, 30_000, () => 0)).toBe(500)
    expect(backoffDelay(3, 1_000, 30_000, () => 1)).toBe(8_000)
    expect(backoffDelay(20, 1_000, 30_000, () => 1)).toBe(30_000)
  })
})

describe('heatmap', () => {
  it('buckets change % into the 7-step scale', () => {
    expect([5, 2.5, 0.1, 0, -0.1, -2.5, -5].map(heatBucket)).toEqual(['p3', 'p2', 'p1', '0', 'n1', 'n2', 'n3'])
  })

  it('lays tiles inside the box, grouped by sector', () => {
    const layout = computeHeatmapLayout(
      [
        { symbol: 'VCB', sector: 'BANKING', marketCap: 300, changePercent: 1 },
        { symbol: 'BID', sector: 'BANKING', marketCap: 100, changePercent: -1 },
        { symbol: 'FPT', sector: 'TECHNOLOGY', marketCap: 200, changePercent: 2 },
      ],
      400,
      200,
    )
    expect(layout.groups.map((group) => group.sector).sort()).toEqual(['BANKING', 'TECHNOLOGY'])
    expect(layout.tiles).toHaveLength(3)
    for (const tile of layout.tiles) {
      expect(tile.x0).toBeGreaterThanOrEqual(0)
      expect(tile.x1).toBeLessThanOrEqual(400)
      expect(tile.y1).toBeLessThanOrEqual(200)
    }
    expect(computeHeatmapLayout([], 400, 200).tiles).toEqual([])
  })
})
