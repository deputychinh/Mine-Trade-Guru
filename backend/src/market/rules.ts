import type { Instrument, InstrumentType, SessionMarket } from './types.js'

type PricedInstrument = Pick<Instrument, 'exchange' | 'type'>

/** Daily price band as a fraction of the reference price. */
export const PRICE_BAND: Record<SessionMarket, number> = {
  HOSE: 0.07,
  HNX: 0.1,
  UPCOM: 0.15,
  DERIVATIVES: 0.07,
}

const MIN_CW_PRICE = 10
const FUTURES_TICK = 0.1
const FUTURES_MULTIPLIER = 100_000
const EPSILON = 1e-9

export interface PriceLimits {
  ceiling: number
  floor: number
}

export function sessionMarketOf(instrument: PricedInstrument): SessionMarket {
  return instrument.type === 'FUTURES' ? 'DERIVATIVES' : instrument.exchange
}

/** Tick size by exchange, instrument type and (on HOSE stocks) price tier. */
export function tickSize(instrument: PricedInstrument, price: number): number {
  if (instrument.type === 'FUTURES') return FUTURES_TICK
  if (instrument.exchange !== 'HOSE') return 100
  if (instrument.type === 'ETF' || instrument.type === 'CW') return 10
  if (price < 10_000) return 10
  if (price < 50_000) return 50
  return 100
}

export function lotSize(type: InstrumentType): number {
  return type === 'FUTURES' ? 1 : 100
}

/** VND value of one unit of price × volume (futures are quoted in index points). */
export function contractMultiplier(type: InstrumentType): number {
  return type === 'FUTURES' ? FUTURES_MULTIPLIER : 1
}

function decimalsOf(step: number): number {
  const text = step.toString()
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

export function roundToStep(
  value: number,
  step: number,
  mode: 'nearest' | 'down' | 'up' = 'nearest',
): number {
  const ratio = value / step
  const units =
    mode === 'down'
      ? Math.floor(ratio + EPSILON)
      : mode === 'up'
        ? Math.ceil(ratio - EPSILON)
        : Math.round(ratio)
  return Number((units * step).toFixed(decimalsOf(step)))
}

export function snapToTick(instrument: PricedInstrument, price: number): number {
  return roundToStep(price, tickSize(instrument, price))
}

/** Ceiling is rounded down and floor rounded up to a valid tick, as the exchanges do. */
export function priceLimits(instrument: PricedInstrument, reference: number): PriceLimits {
  const band = PRICE_BAND[sessionMarketOf(instrument)]
  const rawCeiling = reference * (1 + band)
  const rawFloor = reference * (1 - band)
  const ceiling = roundToStep(rawCeiling, tickSize(instrument, rawCeiling), 'down')
  const floorTick = tickSize(instrument, rawFloor)
  const floor = Math.max(floorTick, roundToStep(rawFloor, floorTick, 'up'))
  return { ceiling, floor }
}

/** Covered-warrant band follows the underlying's band divided by the conversion ratio. */
export function cwPriceLimits(
  reference: number,
  underlyingReference: number,
  underlyingLimits: PriceLimits,
  conversionRatio: number,
): PriceLimits {
  const up = (underlyingLimits.ceiling - underlyingReference) / conversionRatio
  const down = (underlyingReference - underlyingLimits.floor) / conversionRatio
  return {
    ceiling: roundToStep(reference + up, MIN_CW_PRICE, 'down'),
    floor: Math.max(MIN_CW_PRICE, roundToStep(reference - down, MIN_CW_PRICE, 'up')),
  }
}

/** Move a price by N ticks, respecting tick-size tier changes on the way. */
export function stepPrice(instrument: PricedInstrument, price: number, steps: number): number {
  const direction = Math.sign(steps)
  let current = price
  for (let i = 0; i < Math.abs(steps); i++) {
    const probe = direction > 0 ? current : current - EPSILON * 1_000
    const tick = tickSize(instrument, probe)
    current = roundToStep(current + direction * tick, tick)
  }
  return current
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
