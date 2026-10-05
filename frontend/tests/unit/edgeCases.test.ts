import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import type { AlertCondition, AlertRule } from '@/interfaces/alert'
import { useBoardStore } from '@/stores/useBoardStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import { useWatchlistStore } from '@/stores/useWatchlistStore'
import { INITIAL_RULE_STATE, nextRuleState } from '@/utils/alertEvaluate'
import { formatChange, formatCompact, formatIndex, formatIndexChange, formatPrice, formatVolume } from '@/utils/priceFormat'
import { parseBars, parseIndexPoints, parseIndexQuote, parseTrades, parseVolumeProfile, parseWireFrame } from '@/utils/typeGuards'
import { EN_CONTEXT, makeIndex, makeQuote } from '../helpers/fixtures'

const api = vi.hoisted(() => ({ fetchBars: vi.fn(), fetchTrades: vi.fn(), fetchVolumeProfile: vi.fn() }))
vi.mock('@/api/marketApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('alert conditions', () => {
  const cases: Array<[AlertCondition, number | null, Partial<Parameters<typeof makeQuote>[0]>, Partial<Parameters<typeof makeQuote>[0]>]> = [
    ['PRICE_BELOW', 99_000, { lastPrice: 100_000 }, { lastPrice: 98_000 }],
    ['CHANGE_PERCENT_ABOVE', 2, { changePercent: 1 }, { changePercent: 3 }],
    ['CHANGE_PERCENT_BELOW', -2, { changePercent: -1 }, { changePercent: -3 }],
    ['HITS_FLOOR', null, { lastPrice: 94_000 }, { lastPrice: 93_000 }],
  ]

  it.each(cases)('%s fires on the transition', (condition, threshold, before, after) => {
    const rule: AlertRule = { id: 'r', symbol: 'FPT', condition, threshold, isEnabled: true, createdAt: 0, lastTriggeredAt: null }
    const first = nextRuleState(rule, makeQuote(before), INITIAL_RULE_STATE)
    expect(nextRuleState(rule, makeQuote(after), first.state).firedValue).not.toBeNull()
  })
})

describe('formatting edge cases', () => {
  it('handles full VND, futures and missing values', () => {
    const vnd = { ...EN_CONTEXT, priceUnit: 'vnd' as const }
    expect(formatChange(-1_500, 'STOCK', vnd)).toBe('-1,500')
    expect(formatChange(1.5, 'FUTURES', EN_CONTEXT)).toBe('+1.5')
    expect(formatChange(null, 'STOCK', EN_CONTEXT)).toBe('')
    expect(formatVolume(37, 'FUTURES', EN_CONTEXT)).toBe('37')
    expect(formatPrice(undefined, 'STOCK', EN_CONTEXT)).toBe('')
    expect(formatIndex(1_280.5, EN_CONTEXT)).toBe('1,280.50')
    expect(formatIndexChange(-3.2, EN_CONTEXT)).toBe('-3.20')
    expect(formatIndex(null, EN_CONTEXT)).toBe('')
    expect(formatIndexChange(null, EN_CONTEXT)).toBe('')
    expect(formatCompact(1_200_000, EN_CONTEXT)).toBe('1.2M')
    expect(formatCompact(null, EN_CONTEXT)).toBe('')
  })
})

describe('wire validation edge cases', () => {
  it('rejects malformed frames of every channel', () => {
    expect(parseWireFrame({ ch: 'X', data: { symbol: 'FPT', v: 2, lastSide: 'Z' } })).toBeNull()
    expect(parseWireFrame({ ch: 'X', data: { symbol: 'FPT', v: 2, bids: [{ price: 1, volume: -1 }] } })).toBeNull()
    expect(parseWireFrame({ ch: 'R', data: { symbol: 'FPT', v: 2, foreignBuyVolume: 'x' } })).toBeNull()
    expect(parseWireFrame({ ch: 'R', data: { symbol: 'FPT', v: 2, foreignBuyVolume: 1, foreignSellVolume: 1, foreignRoom: 1, updatedAt: 1 } })?.ch).toBe('R')
    expect(parseWireFrame({ ch: 'MI', data: makeIndex() })?.ch).toBe('MI')
    expect(parseIndexQuote({ ...makeIndex(), code: 'SPX' })).toBeNull()
    expect(parseWireFrame({ ch: 'F', data: { market: 'HOSE', phase: 'ATO', nextPhase: null, nextPhaseAt: null, marketTime: 0, clockSpeed: 0 } })).toBeNull()
    expect(parseWireFrame(null)).toBeNull()
  })

  it('validates REST arrays', () => {
    expect(parseTrades([{ id: 1, symbol: 'FPT', time: 0, price: 1, volume: 1, side: 'B' }])).toHaveLength(1)
    expect(parseTrades([{ id: 1, symbol: 'FPT', time: 0, price: 1, volume: 1, side: 'X' }])).toBeNull()
    expect(parseBars([{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 'a' }])).toBeNull()
    expect(parseVolumeProfile('x')).toBeNull()
    expect(parseIndexPoints([{ time: 0, value: 1, volume: 5 }])).toHaveLength(1)
    expect(parseIndexPoints([{ time: 0, value: 1 }])).toBeNull()
  })
})

describe('board store actions', () => {
  it('pins, filters, resets and switches boards', () => {
    const board = useBoardStore()
    board.togglePin('FPT')
    expect(board.pinnedSet.has('FPT')).toBe(true)
    board.togglePin('FPT')
    expect(board.pinnedSymbols).toEqual([])
    board.setFilterText('fp')
    board.setSector('BANKING')
    board.toggleGroup('ohlc')
    expect(board.layout.hiddenGroups).not.toContain('ohlc')
    board.toggleGroup('ohlc')
    board.resetLayout()
    board.focus('FPT')
    board.setBoard('HOSE')
    expect([board.activeBoard.id, board.focusedSymbol, board.filterText, board.sector]).toEqual(['HOSE', null, 'fp', 'BANKING'])
    board.moveFocus(-1, ['A', 'B'])
    expect(board.focusedSymbol).toBe('B')
    board.moveFocus(1, [])
    expect(board.focusedSymbol).toBe('B')
  })
})

describe('watchlist store actions', () => {
  it('creates, renames, switches, exports and removes lists', () => {
    const watchlist = useWatchlistStore()
    const firstId = watchlist.activeId
    const id = watchlist.create('  Ngân hàng  ')
    expect(watchlist.activeList.name).toBe('Ngân hàng')
    watchlist.rename(id, 'Banks')
    watchlist.toggle('VCB')
    expect(watchlist.exportCsv(id)).toBe('symbol\nVCB\n')
    watchlist.setActive('missing')
    expect(watchlist.activeId).toBe(id)
    watchlist.remove(id)
    expect(watchlist.activeId).toBe(firstId)
    expect(watchlist.importCsv('missing', 'FPT', () => true).unknown).toEqual([])
  })
})

describe('symbol detail store', () => {
  it('reports load errors, ignores reopening and resets on close', async () => {
    api.fetchBars.mockRejectedValue(new Error('boom'))
    api.fetchTrades.mockResolvedValue([])
    api.fetchVolumeProfile.mockResolvedValue([])
    const detail = useSymbolDetailStore()
    await detail.open('FPT')
    expect([detail.status, detail.error]).toEqual(['error', 'boom'])

    api.fetchBars.mockResolvedValue([])
    await detail.open('FPT')
    expect(detail.status).toBe('ready')
    await detail.open('FPT')
    expect(api.fetchBars).toHaveBeenCalledTimes(2)

    detail.setTimeframe('5m')
    detail.setChartKind('line')
    detail.applyTrades([])
    detail.close()
    expect([detail.symbol, detail.status, detail.timeframe, detail.chartKind]).toEqual([null, 'idle', '5m', 'line'])
    detail.applyTrades([{ id: 1, symbol: 'FPT', time: 0, price: 1, volume: 1, side: 'B' }])
    expect(detail.trades).toEqual([])
  })
})

describe('useLocalStorage', () => {
  it('falls back on bad JSON and follows other tabs', async () => {
    window.localStorage.setItem('mtg.test', '{broken')
    const scope = effectScope()
    const state = scope.run(() => useLocalStorage<number>('mtg.test', 1, (raw) => (typeof raw === 'number' ? raw : null)))
    expect(state?.value).toBe(1)

    window.localStorage.setItem('mtg.test', '7')
    window.dispatchEvent(new StorageEvent('storage', { key: 'mtg.test' }))
    expect(state?.value).toBe(7)

    if (state) state.value = 9
    await nextTick()
    expect(window.localStorage.getItem('mtg.test')).toBe('9')
    scope.stop()
  })
})
