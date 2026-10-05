import { describe, expect, it } from 'vitest'
import IndexTable from '@/components/features/market-overview/IndexTable.vue'
import type { IndexCode, IndexQuote } from '@/interfaces/market'
import { indexSessionAxis, toIndexVolumeBars, vietnamDayStart } from '@/utils/chartData'
import { formatMillions, formatShares } from '@/utils/priceFormat'
import { parseIndexCards } from '@/utils/storageParsers'
import { formatHourTick } from '@/utils/time'
import { EN_CONTEXT, makeIndex } from '../helpers/fixtures'
import { mountWithPlugins } from '../helpers/mountWithPlugins'

const MINUTE = 60_000
/** 5 January 2026, 00:00 in Ho Chi Minh City (UTC+7). */
const VN_MIDNIGHT = Date.UTC(2026, 0, 4, 17, 0)
const at = (hours: number, minutes = 0) => VN_MIDNIGHT + (hours * 60 + minutes) * MINUTE

describe('index chart data', () => {
  it('finds the Vietnam trading day of a timestamp', () => {
    expect(vietnamDayStart(at(10, 30))).toBe(VN_MIDNIGHT)
    expect(vietnamDayStart(at(23, 59))).toBe(VN_MIDNIGHT)
  })

  it('spans the whole 09h–15h session, one empty point per minute', () => {
    const axis = indexSessionAxis([{ time: at(10), value: 1, volume: 5 }], 0)
    expect(axis).toHaveLength(6 * 60 + 1)
    expect(axis[0]).toEqual({ time: at(9) / 1_000 })
    expect(axis.at(-1)).toEqual({ time: at(15) / 1_000 })
  })

  it('widens the axis for data outside the session, and works without data', () => {
    const axis = indexSessionAxis([{ time: at(8, 50), value: 1, volume: 0 }, { time: at(15, 10), value: 1, volume: 0 }], 0)
    expect(axis[0]).toEqual({ time: at(8, 50) / 1_000 })
    expect(axis.at(-1)).toEqual({ time: at(15, 10) / 1_000 })
    expect(indexSessionAxis([], at(12))).toHaveLength(6 * 60 + 1)
  })

  it('turns per-minute volume into colored bars', () => {
    expect(toIndexVolumeBars([{ time: at(9, 15), value: 1, volume: 420 }], 'blue')).toEqual([{ time: at(9, 15) / 1_000, value: 420, color: 'blue' }])
  })

  it('labels axis ticks by hour', () => {
    expect(formatHourTick(at(9), 'vi')).toBe('09h')
    expect(formatHourTick(at(9, 30), 'vi')).toBe('09:30')
  })
})

describe('index formatting and storage', () => {
  it('formats volume in millions and whole shares', () => {
    expect(formatMillions(583_351_514, EN_CONTEXT)).toBe('583.352')
    expect(formatShares(583_351_514, EN_CONTEXT)).toBe('583,351,514')
    expect(formatMillions(null, EN_CONTEXT)).toBe('')
    expect(formatShares(undefined, EN_CONTEXT)).toBe('')
  })

  it('accepts only four known index codes for the cards', () => {
    expect(parseIndexCards(['VNINDEX', 'VN30', 'HNX30', 'HNXINDEX'])).toEqual(['VNINDEX', 'VN30', 'HNX30', 'HNXINDEX'])
    expect(parseIndexCards(['VNINDEX', 'VN30'])).toBeNull()
    expect(parseIndexCards(['VNINDEX', 'VN30', 'HNX30', 'SPX'])).toBeNull()
  })
})

describe('IndexTable', () => {
  it('lists every index and toggles +/- to %', async () => {
    const indices = new Map<IndexCode, IndexQuote>([['VNINDEX', makeIndex({ value: 1_738.04, change: -30.58, changePercent: -1.73, totalVolume: 583_351_514 })]])
    const rows = (['VNINDEX', 'VN30'] as const).map((code) => ({ code, index: indices.get(code) }))
    const wrapper = mountWithPlugins(IndexTable, { props: { rows } })
    const firstRow = () => wrapper.findAll('tbody tr')[0]?.text() ?? ''
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    // Components without App fall back to the default (Vietnamese) number format.
    expect(firstRow()).toContain('-30,58')
    expect(firstRow()).toContain('583,352')
    expect(wrapper.find('tbody td').classes()).toContain('text-market-down')

    await wrapper.find('thead button').trigger('click')
    expect(firstRow()).toContain('-1,73%')
  })
})
