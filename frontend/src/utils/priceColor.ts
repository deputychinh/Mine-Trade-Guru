import { MARKET_COLOR } from '@/constants/marketColors'
import type { MarketColorToken } from '@/interfaces/theme'

export interface PriceBounds {
  reference: number
  ceiling: number
  floor: number
}

const EPSILON = 1e-9

function same(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON
}

/**
 * The VN 5-color rule (design-system.md §2.2). The ONLY place a price is compared to
 * its reference/ceiling/floor for coloring (rule C4). Returns a theme token name, never a hex.
 */
export function priceColor(price: number | null | undefined, bounds: PriceBounds): MarketColorToken | null {
  if (price === null || price === undefined || !Number.isFinite(price)) return null
  if (same(price, bounds.ceiling)) return MARKET_COLOR.ceiling
  if (same(price, bounds.floor)) return MARKET_COLOR.floor
  if (same(price, bounds.reference)) return MARKET_COLOR.reference
  return price > bounds.reference ? MARKET_COLOR.up : MARKET_COLOR.down
}

/** Index colors only have up / down / unchanged. */
export function indexColor(change: number | null | undefined): MarketColorToken | null {
  if (change === null || change === undefined || !Number.isFinite(change)) return null
  if (same(change, 0)) return MARKET_COLOR.reference
  return change > 0 ? MARKET_COLOR.up : MARKET_COLOR.down
}
