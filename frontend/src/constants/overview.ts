import type { MoverCategory } from '@/interfaces/overview'

/** Top movers tabs (FR-12), in display order. */
export const MOVER_CATEGORIES: ReadonlyArray<{ category: MoverCategory; labelKey: string }> = [
  { category: 'gainers', labelKey: 'overview.movers.gainers' },
  { category: 'losers', labelKey: 'overview.movers.losers' },
  { category: 'volume', labelKey: 'overview.movers.volume' },
  { category: 'value', labelKey: 'overview.movers.value' },
]
