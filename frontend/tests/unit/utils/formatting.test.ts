import { describe, expect, it } from 'vitest'
import { COLUMNS } from '@/constants/priceBoardColumns'
import type { ColumnKey } from '@/interfaces/board'
import { formatAlertNumber, parseAlertThreshold, thresholdUnitKey } from '@/utils/alertFormat'
import { boardGridTemplate, buildBoardCell, columnGroupSpans } from '@/utils/boardCell'
import { indexColor, priceColor } from '@/utils/priceColor'
import { formatChange, formatPercent, formatPrice, formatValue, formatVolume } from '@/utils/priceFormat'
import { priceMarker } from '@/utils/priceMarker'
import { EN_CONTEXT, makeQuote, VI_CONTEXT } from '../../helpers/fixtures'

function column(key: ColumnKey) {
  const found = COLUMNS.find((item) => item.key === key)
  if (!found) throw new Error(key)
  return found
}

describe('priceColor (VN 5-color rule)', () => {
  const bounds = { reference: 100_000, ceiling: 107_000, floor: 93_000 }

  it.each([
    [107_000, 'market-ceiling'],
    [93_000, 'market-floor'],
    [100_000, 'market-reference'],
    [100_100, 'market-up'],
    [99_900, 'market-down'],
  ])('%d → %s', (price, token) => {
    expect(priceColor(price, bounds)).toBe(token)
  })

  it('has no color without a price', () => {
    expect(priceColor(null, bounds)).toBeNull()
    expect(priceColor(Number.NaN, bounds)).toBeNull()
  })

  it('colors indices by direction only', () => {
    expect(indexColor(1.2)).toBe('market-up')
    expect(indexColor(-0.1)).toBe('market-down')
    expect(indexColor(0)).toBe('market-reference')
  })

  it('pairs every color with a marker and an aria key (rule C5)', () => {
    expect(priceMarker('market-ceiling')).toEqual({ symbol: '▲', ariaKey: 'price.aria.ceiling' })
    expect(priceMarker(null)).toBeNull()
  })
})

describe('priceFormat', () => {
  it('shows stock prices in thousands with 2 decimals (iBoard default)', () => {
    expect(formatPrice(95_300, 'STOCK', VI_CONTEXT)).toBe('95,30')
    expect(formatPrice(95_300, 'STOCK', EN_CONTEXT)).toBe('95.30')
    expect(formatPrice(95_300, 'STOCK', { ...EN_CONTEXT, priceUnit: 'vnd' })).toBe('95,300')
  })

  it('keeps futures in index points', () => {
    expect(formatPrice(1_320.4, 'FUTURES', EN_CONTEXT)).toBe('1,320.4')
  })

  it('shows volume in lots of 10 shares, blank for zero', () => {
    expect(formatVolume(12_340, 'STOCK', VI_CONTEXT)).toBe('1.234')
    expect(formatVolume(12_340, 'STOCK', { ...VI_CONTEXT, volumeUnit: 'one' })).toBe('12.340')
    expect(formatVolume(0, 'STOCK', VI_CONTEXT)).toBe('')
  })

  it('signs changes and percents', () => {
    expect(formatChange(200, 'STOCK', EN_CONTEXT)).toBe('+0.20')
    expect(formatChange(-200, 'STOCK', EN_CONTEXT)).toBe('-0.20')
    expect(formatPercent(1.5, EN_CONTEXT)).toBe('+1.50%')
    expect(formatPercent(null, EN_CONTEXT)).toBe('')
  })

  it('shows traded value in billions', () => {
    expect(formatValue(12_340_000_000, EN_CONTEXT)).toBe('12.34')
  })
})

describe('buildBoardCell', () => {
  it('colors and marks the matched price at ceiling', () => {
    const quote = makeQuote({ lastPrice: 107_000 })
    const cell = buildBoardCell(column('lastPrice'), quote, 'STOCK', EN_CONTEXT)
    expect(cell).toMatchObject({ text: '107.00', color: 'market-ceiling', marker: '▲', ariaKey: 'price.aria.ceiling', flashValue: 107_000 })
  })

  it('colors a volume by its price but gives it no marker', () => {
    const cell = buildBoardCell(column('bid1Volume'), makeQuote(), 'STOCK', EN_CONTEXT)
    expect(cell).toMatchObject({ text: '100', color: 'market-down', marker: null })
  })

  it('flashes every numeric cell, never the symbol', () => {
    const quote = makeQuote({ lastPrice: 101_000, change: 1_000, changePercent: 1, totalValue: 5_000_000_000 })
    const flash = (key: ColumnKey) => buildBoardCell(column(key), quote, 'STOCK', EN_CONTEXT).flashValue
    expect([flash('change'), flash('changePercent'), flash('totalValue')]).toEqual([1_000, 1, 5_000_000_000])
    expect(flash('symbol')).toBeNull()
  })

  it('leaves an empty order-book level blank and uncolored', () => {
    const cell = buildBoardCell(column('bid3Price'), makeQuote(), 'STOCK', EN_CONTEXT)
    expect(cell).toMatchObject({ text: '', color: null, marker: null })
  })

  it('colors the symbol by its last price, neutral before the first trade', () => {
    expect(buildBoardCell(column('symbol'), makeQuote(), 'STOCK', EN_CONTEXT).color).toBeNull()
    expect(buildBoardCell(column('symbol'), makeQuote({ lastPrice: 99_000 }), 'STOCK', EN_CONTEXT).color).toBe('market-down')
  })

  it('groups adjacent columns under one header and builds the grid from tokens', () => {
    const columns = [column('symbol'), column('ceiling'), column('floor'), column('lastPrice')]
    expect(columnGroupSpans(columns).map((span) => [span.key, span.span])).toEqual([
      ['symbol', 1],
      ['reference', 2],
      ['match', 1],
    ])
    expect(boardGridTemplate(columns)).toBe(
      'var(--mtg-board-col-symbol) var(--mtg-board-col-price) var(--mtg-board-col-price) var(--mtg-board-col-price)',
    )
  })
})

describe('alertFormat', () => {
  it('reads thresholds in the display unit and stores raw VND', () => {
    expect(parseAlertThreshold('95,3', 'price', 'STOCK', VI_CONTEXT)).toBe(95_300)
    expect(parseAlertThreshold('95300', 'price', 'STOCK', { ...VI_CONTEXT, priceUnit: 'vnd' })).toBe(95_300)
    expect(parseAlertThreshold('1320.5', 'price', 'FUTURES', VI_CONTEXT)).toBe(1_320.5)
    expect(parseAlertThreshold('2', 'percent', 'STOCK', VI_CONTEXT)).toBe(2)
  })

  it('rejects blanks and non-numbers', () => {
    expect(parseAlertThreshold('  ', 'price', 'STOCK', VI_CONTEXT)).toBeNull()
    expect(parseAlertThreshold('abc', 'price', 'STOCK', VI_CONTEXT)).toBeNull()
  })

  it('formats values and picks the unit hint', () => {
    expect(formatAlertNumber(95_300, 'price', 'STOCK', EN_CONTEXT)).toBe('95.30')
    expect(thresholdUnitKey('price', 'STOCK', VI_CONTEXT)).toBe('alert.unit.thousandVnd')
    expect(thresholdUnitKey('price', 'FUTURES', VI_CONTEXT)).toBe('alert.unit.points')
    expect(thresholdUnitKey('shares', 'FUTURES', VI_CONTEXT)).toBe('alert.unit.contracts')
  })
})
