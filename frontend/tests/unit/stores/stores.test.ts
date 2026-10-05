import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { Trade } from '@/interfaces/market'
import { useAlertStore } from '@/stores/useAlertStore'
import { useBoardStore } from '@/stores/useBoardStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'
import { useWatchlistStore } from '@/stores/useWatchlistStore'
import { makeQuote, makeSnapshot } from '../../helpers/fixtures'

const api = vi.hoisted(() => ({
  fetchBars: vi.fn(),
  fetchTrades: vi.fn(),
  fetchVolumeProfile: vi.fn(),
}))
vi.mock('@/api/marketApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))

function trade(id: number): Trade {
  return { id, symbol: 'FPT', time: id * 1_000, price: 100_000, volume: 10, side: 'B' }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useMarketStore', () => {
  it('applies a patch to the same Map and notifies once', async () => {
    const market = useMarketStore()
    market.applySnapshot(makeSnapshot([makeQuote({ symbol: 'FPT' }), makeQuote({ symbol: 'VCB' })]))
    const before = market.quotes
    market.applyPatch({
      quotes: [makeQuote({ symbol: 'FPT', v: 2, lastPrice: 101_000 })],
      indices: [],
      sessions: [],
      trades: [],
      serverTs: null,
      lastTickAt: null,
    })
    await nextTick()
    expect(market.quotes).toBe(before)
    expect(market.quote('FPT')?.lastPrice).toBe(101_000)
    expect(market.quote('VCB')?.v).toBe(1)
  })
})

describe('useWatchlistStore', () => {
  it('toggles, reorders and imports without duplicates', () => {
    const watchlist = useWatchlistStore()
    expect(watchlist.toggle('ACB')).toBe(true)
    expect(watchlist.isWatched('ACB')).toBe(true)
    expect(watchlist.toggle('ACB')).toBe(false)

    const id = watchlist.activeId
    const result = watchlist.importCsv(id, 'FPT\nACB\nZZZ', (symbol) => symbol !== 'ZZZ')
    expect(result).toEqual({ added: ['ACB'], unknown: ['ZZZ'], duplicates: ['FPT'] })

    watchlist.reorder(id, ['ACB', 'FPT'])
    expect(watchlist.activeList.symbols.slice(0, 2)).toEqual(['ACB', 'FPT'])
  })

  it('never deletes the last list', () => {
    const watchlist = useWatchlistStore()
    watchlist.remove(watchlist.activeId)
    expect(watchlist.lists).toHaveLength(1)
  })
})

describe('useBoardStore', () => {
  it('cycles sort desc → asc → none', () => {
    const board = useBoardStore()
    board.toggleSort('changePercent')
    expect(board.sort).toEqual({ key: 'changePercent', direction: 'desc' })
    board.toggleSort('changePercent')
    expect(board.sort?.direction).toBe('asc')
    board.toggleSort('changePercent')
    expect(board.sort).toBeNull()
  })

  it('keeps the symbol group fixed when hiding or reordering', () => {
    const board = useBoardStore()
    board.toggleGroup('symbol')
    expect(board.visibleColumns[0]?.key).toBe('symbol')
    board.setGroupOrder(['foreign', 'symbol', 'reference'])
    expect(board.layout.groupOrder[0]).toBe('symbol')
  })

  it('moves keyboard focus within bounds', () => {
    const board = useBoardStore()
    board.moveFocus(1, ['A', 'B'])
    expect(board.focusedSymbol).toBe('A')
    board.moveFocus(1, ['A', 'B'])
    board.moveFocus(1, ['A', 'B'])
    expect(board.focusedSymbol).toBe('B')
  })
})

describe('useAlertStore', () => {
  it('requires a threshold where the condition needs one', () => {
    const alerts = useAlertStore()
    expect(alerts.addRule({ symbol: 'FPT', condition: 'PRICE_ABOVE', threshold: null })).toBeNull()
    expect(alerts.addRule({ symbol: 'FPT', condition: 'HITS_CEILING', threshold: 5 })?.threshold).toBeNull()
  })

  it('records events, caps toasts and tracks unread', () => {
    const alerts = useAlertStore()
    const rule = alerts.addRule({ symbol: 'FPT', condition: 'PRICE_ABOVE', threshold: 1 })
    if (!rule) throw new Error('rule')
    const events = [1, 2, 3, 4].map((value) => alerts.recordEvent(rule, value, value))
    events.forEach((event) => alerts.pushToast(event))
    expect(alerts.toasts).toHaveLength(3)
    expect(alerts.unreadCount).toBe(4)
    alerts.markAllRead()
    expect(alerts.unreadCount).toBe(0)
  })
})

describe('useSymbolDetailStore', () => {
  it('merges live trades that arrive during the history load, without duplicates', async () => {
    let resolveTrades: (trades: Trade[]) => void = () => {}
    api.fetchBars.mockResolvedValue([])
    api.fetchVolumeProfile.mockResolvedValue([])
    api.fetchTrades.mockReturnValue(new Promise<Trade[]>((resolve) => (resolveTrades = resolve)))

    const detail = useSymbolDetailStore()
    const opening = detail.open('FPT')
    detail.applyTrades([trade(4), trade(5)])
    resolveTrades([trade(4), trade(3)])
    await opening

    expect(detail.trades.map((t) => t.id)).toEqual([5, 4, 3])
    detail.applyTrades([trade(5), trade(6)])
    expect(detail.trades.map((t) => t.id)).toEqual([6, 5, 4, 3])
    expect(detail.bars.length).toBeGreaterThan(0)
  })
})
