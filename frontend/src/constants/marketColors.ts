import type { MarketColorToken } from '@/interfaces/theme'

/** The 5 VN price colors as theme token names (design-system.md §2.2). */
export const MARKET_COLOR = {
  ceiling: 'market-ceiling',
  floor: 'market-floor',
  reference: 'market-reference',
  up: 'market-up',
  down: 'market-down',
} as const satisfies Record<string, MarketColorToken>

/** Non-color cue so color is never the only signal (rule C5). */
export const MARKET_MARKERS: Record<MarketColorToken, string> = {
  'market-ceiling': '▲',
  'market-floor': '▼',
  'market-reference': '■',
  'market-up': '▲',
  'market-down': '▼',
}

/** Class names defined in styles/motion.css; each direction alternates between two to restart the animation. */
export const FLASH_CLASSES = {
  up: ['mtg-flash-up', 'mtg-flash-up-alt'],
  down: ['mtg-flash-down', 'mtg-flash-down-alt'],
} as const

export const MARKET_ARIA_LABEL_KEYS: Record<MarketColorToken, string> = {
  'market-ceiling': 'price.aria.ceiling',
  'market-floor': 'price.aria.floor',
  'market-reference': 'price.aria.reference',
  'market-up': 'price.aria.up',
  'market-down': 'price.aria.down',
}
