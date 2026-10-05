import { MARKET_ARIA_LABEL_KEYS, MARKET_MARKERS } from '@/constants/marketColors'
import type { MarketColorToken } from '@/interfaces/theme'

export interface PriceMarker {
  symbol: string
  /** i18n key for screen readers, e.g. "up", "at ceiling". */
  ariaKey: string
}

/** Non-color cue that always accompanies a market color (rule C5, NFR-U2). */
export function priceMarker(token: MarketColorToken | null): PriceMarker | null {
  if (token === null) return null
  return { symbol: MARKET_MARKERS[token], ariaKey: MARKET_ARIA_LABEL_KEYS[token] }
}
