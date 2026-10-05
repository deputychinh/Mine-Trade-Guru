import { describe, expect, it } from 'vitest'
import { BOARDS } from '@/constants/boards'
import { COLUMNS } from '@/constants/priceBoardColumns'
import type { BoardDefinition } from '@/interfaces/board'
import { symbolsForBoard } from '@/utils/boardFilter'
import { columnValue } from '@/utils/columnValue'
import { computeForeignFlow } from '@/utils/foreignFlow'
import { computeBreadth } from '@/utils/marketBreadth'
import { average, percentile } from '@/utils/stats'
import { parseAlertEvents, parseAlertRules, parseBoardId, parseBoardLayout, parseSymbols } from '@/utils/storageParsers'
import { formatCountdown, formatMarketTime } from '@/utils/time'
import { computeTopMovers } from '@/utils/topMovers'
import { parseInstruments, parseServerMessage, parseSnapshot } from '@/utils/typeGuards'
import { makeInstrument, makeQuote, makeSnapshot } from '../../helpers/fixtures'

const instruments = [
  makeInstrument({ symbol: 'FPT' }),
  makeInstrument({ symbol: 'VCB', sector: 'BANKING' }),
  makeInstrument({ symbol: 'SHS', exchange: 'HNX', indices: ['HNX30'], sector: 'SECURITIES' }),
  makeInstrument({ symbol: 'E1VFVN30', type: 'ETF', sector: null, indices: [] }),
]
const bySymbol = new Map(instruments.map((instrument) => [instrument.symbol, instrument]))
const quotes = [
  makeQuote({ symbol: 'FPT', lastPrice: 107_000, changePercent: 7, totalVolume: 100, totalValue: 5, foreignBuyVolume: 50 }),
  makeQuote({ symbol: 'VCB', lastPrice: 99_000, changePercent: -1, totalVolume: 300, totalValue: 9, foreignSellVolume: 40 }),
  makeQuote({ symbol: 'SHS', lastPrice: null }),
  makeQuote({ symbol: 'E1VFVN30', lastPrice: 100_000, foreignBuyVolume: 10 }),
]

function board(id: string): BoardDefinition {
  const found = BOARDS.find((item) => item.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('market overview calculations', () => {
  it('counts breadth per exchange, stocks only', () => {
    const breadth = computeBreadth(quotes, bySymbol)
    expect(breadth.HOSE).toEqual({ advancers: 1, decliners: 1, unchanged: 0, ceiling: 1, floor: 0, total: 2 })
    expect(breadth.HNX.unchanged).toBe(1)
  })

  it('ranks top movers among traded stocks', () => {
    const movers = computeTopMovers(quotes, bySymbol, 10)
    expect(movers.gainers.map((m) => m.symbol)).toEqual(['FPT'])
    expect(movers.losers.map((m) => m.symbol)).toEqual(['VCB'])
    expect(movers.volume.map((m) => m.symbol)).toEqual(['VCB', 'FPT'])
  })

  it('ranks net foreign flow by value, including ETFs', () => {
    const flow = computeForeignFlow(quotes, bySymbol, 10)
    expect(flow.topNetBuy.map((entry) => entry.symbol)).toEqual(['FPT', 'E1VFVN30'])
    expect(flow.topNetSell.map((entry) => [entry.symbol, entry.netValue])).toEqual([['VCB', -40 * 99_000]])
  })

  it('selects board members from config', () => {
    const context = { watchlistSymbols: ['VCB', 'ZZZ', 'FPT'], sector: 'BANKING' as const }
    expect(symbolsForBoard(board('VN30'), instruments, bySymbol, context)).toEqual(['FPT', 'VCB'])
    expect(symbolsForBoard(board('HNX'), instruments, bySymbol, context)).toEqual(['SHS'])
    expect(symbolsForBoard(board('ETF'), instruments, bySymbol, context)).toEqual(['E1VFVN30'])
    expect(symbolsForBoard(board('WATCHLIST'), instruments, bySymbol, context)).toEqual(['VCB', 'FPT'])
    expect(symbolsForBoard(board('SECTOR'), instruments, bySymbol, context)).toEqual(['VCB'])
  })

  it('reads every column from a quote', () => {
    const quote = makeQuote({ lastPrice: 100_100, foreignRoom: 5 })
    const values = Object.fromEntries(COLUMNS.map((column) => [column.key, columnValue(quote, column.key)]))
    expect(values).toMatchObject({ symbol: null, bid1Price: 99_900, bid3Volume: null, ask3Price: 100_300, lastPrice: 100_100, foreignRoom: 5 })
  })
})

describe('stats and time', () => {
  it('computes nearest-rank percentiles', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3)
    expect(percentile([5, 1, 3, 2, 4], 95)).toBe(5)
    expect(percentile([], 50)).toBeNull()
    expect(average([1, 2, 3])).toBe(2)
    expect(average([])).toBeNull()
  })

  it('shows market times in Vietnam time and formats countdowns', () => {
    // 02:15:30 UTC = 09:15:30 in Ho Chi Minh City.
    expect(formatMarketTime(Date.UTC(2026, 0, 5, 2, 15, 30), 'en')).toBe('09:15:30')
    expect(formatMarketTime(Date.UTC(2026, 0, 5, 2, 15, 30), 'en', 'minutes')).toBe('09:15')
    expect(formatMarketTime(null, 'en')).toBe('')
    expect(formatCountdown(125_000)).toBe('02:05')
    expect(formatCountdown(3_725_000)).toBe('1:02:05')
    expect(formatCountdown(-5)).toBe('00:00')
  })
})

describe('runtime validation', () => {
  it('accepts a full snapshot and rejects a broken one', () => {
    expect(parseSnapshot(makeSnapshot())).not.toBeNull()
    expect(parseSnapshot({ ...makeSnapshot(), quotes: [{ symbol: 'FPT' }] })).toBeNull()
  })

  it('validates instrument lists all-or-nothing', () => {
    expect(parseInstruments(instruments)).toHaveLength(4)
    expect(parseInstruments([...instruments, { symbol: 'X' }])).toBeNull()
  })

  it('reads heartbeats and rejects malformed envelopes', () => {
    expect(parseServerMessage({ type: 'hb', ts: 1 })?.message).toEqual({ type: 'hb', ts: 1 })
    expect(parseServerMessage({ type: 'batch', ts: 1, frames: [] })).toBeNull()
    expect(parseServerMessage({ type: 'batch', ts: 1, gap: false, frames: [{ ch: 'Z' }] })?.invalidFrames).toBe(1)
  })
})

describe('storage parsers', () => {
  it('repairs board layouts from older versions', () => {
    const layout = parseBoardLayout({ groupOrder: ['match', 'bogus', 'symbol'], hiddenGroups: ['symbol', 'ohlc'] })
    expect(layout?.groupOrder.slice(0, 2)).toEqual(['match', 'symbol'])
    expect(layout?.groupOrder).toHaveLength(8)
    expect(layout?.hiddenGroups).toEqual(['ohlc'])
    expect(parseBoardLayout('nope')).toBeNull()
  })

  it('keeps only valid rules, events, symbols and board ids', () => {
    const rule = { id: 'r', symbol: 'FPT', condition: 'PRICE_ABOVE', threshold: 1, isEnabled: true, createdAt: 0, lastTriggeredAt: null }
    expect(parseAlertRules([rule, { ...rule, condition: 'EXPLODE' }])).toHaveLength(1)
    const event = { id: 'e', ruleId: 'r', symbol: 'FPT', condition: 'HITS_FLOOR', threshold: null, value: 1, triggeredAt: 0, isRead: false }
    expect(parseAlertEvents([event, { ...event, isRead: 'no' }])).toHaveLength(1)
    expect(parseSymbols(['FPT', 'FPT'])).toEqual(['FPT'])
    expect(parseSymbols(['<script>'])).toBeNull()
    expect(parseBoardId('HOSE')).toBe('HOSE')
    expect(parseBoardId('NASDAQ')).toBeNull()
  })
})
