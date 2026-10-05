import { describe, expect, it } from 'vitest'
import {
  cwPriceLimits,
  priceLimits,
  roundToStep,
  sessionMarketOf,
  stepPrice,
  tickSize,
} from '../src/market/rules.js'

const hoseStock = { exchange: 'HOSE', type: 'STOCK' } as const
const hnxStock = { exchange: 'HNX', type: 'STOCK' } as const
const upcomStock = { exchange: 'UPCOM', type: 'STOCK' } as const
const futures = { exchange: 'HNX', type: 'FUTURES' } as const
const hoseEtf = { exchange: 'HOSE', type: 'ETF' } as const

describe('tickSize', () => {
  it('uses the HOSE price tiers for stocks', () => {
    expect(tickSize(hoseStock, 9_990)).toBe(10)
    expect(tickSize(hoseStock, 10_000)).toBe(50)
    expect(tickSize(hoseStock, 49_950)).toBe(50)
    expect(tickSize(hoseStock, 50_000)).toBe(100)
  })

  it('uses 10 VND for HOSE ETFs, 100 VND on HNX/UPCOM and 0.1 point for futures', () => {
    expect(tickSize(hoseEtf, 60_000)).toBe(10)
    expect(tickSize(hnxStock, 60_000)).toBe(100)
    expect(tickSize(upcomStock, 5_000)).toBe(100)
    expect(tickSize(futures, 1_300)).toBe(0.1)
  })
})

describe('priceLimits', () => {
  it('rounds the ceiling down and the floor up to a valid tick (HOSE ±7%)', () => {
    expect(priceLimits(hoseStock, 132_400)).toEqual({ ceiling: 141_600, floor: 123_200 })
    expect(priceLimits(hoseStock, 24_850)).toEqual({ ceiling: 26_550, floor: 23_150 })
  })

  it('applies HNX ±10% and UPCOM ±15%', () => {
    expect(priceLimits(hnxStock, 33_800)).toEqual({ ceiling: 37_100, floor: 30_500 })
    expect(priceLimits(upcomStock, 21_300)).toEqual({ ceiling: 24_400, floor: 18_200 })
  })

  it('keeps one decimal for futures and rounds the ceiling down', () => {
    // 1318.5 × 1.07 = 1410.795 → 1410.7 ; 1318.5 × 0.93 = 1226.205 → 1226.3
    expect(priceLimits(futures, 1_318.5)).toEqual({ ceiling: 1_410.7, floor: 1_226.3 })
  })
})

describe('cwPriceLimits', () => {
  it('follows the underlying band divided by the conversion ratio', () => {
    const underlying = priceLimits(hoseStock, 132_400) // ±9,200
    expect(cwPriceLimits(1_540, 132_400, underlying, 10)).toEqual({ ceiling: 2_460, floor: 620 })
  })

  it('never goes below 10 VND', () => {
    const underlying = priceLimits(hoseStock, 132_400)
    expect(cwPriceLimits(300, 132_400, underlying, 10).floor).toBe(10)
  })
})

describe('stepPrice', () => {
  it('crosses HOSE tick tiers in both directions', () => {
    expect(stepPrice(hoseStock, 9_990, 1)).toBe(10_000)
    expect(stepPrice(hoseStock, 10_000, 1)).toBe(10_050)
    expect(stepPrice(hoseStock, 10_000, -1)).toBe(9_990)
    expect(stepPrice(hoseStock, 50_000, -1)).toBe(49_950)
  })

  it('moves futures by 0.1 without floating-point drift', () => {
    expect(stepPrice(futures, 1_318.5, 3)).toBe(1_318.8)
    expect(stepPrice(futures, 1_318.5, -5)).toBe(1_318)
  })
})

describe('roundToStep / sessionMarketOf', () => {
  it('rounds to a step in the requested direction', () => {
    expect(roundToStep(26_588, 50, 'down')).toBe(26_550)
    expect(roundToStep(23_110.5, 50, 'up')).toBe(23_150)
    expect(roundToStep(1_410.795, 0.1)).toBe(1_410.8)
  })

  it('routes futures to the derivatives session', () => {
    expect(sessionMarketOf(futures)).toBe('DERIVATIVES')
    expect(sessionMarketOf(hnxStock)).toBe('HNX')
  })
})
