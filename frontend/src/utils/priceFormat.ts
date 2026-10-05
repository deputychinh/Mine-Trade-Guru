import type { InstrumentType } from '@/interfaces/market'
import type { FormatContext } from '@/interfaces/settings'
import { isShareVolume, isVndPriced } from './instrument'
import { numberFormatter } from './numberFormat'

// The only place prices, volumes and values are turned into text (plan §9).
// Empty string for "no value" — iBoard leaves those cells blank.

const THOUSAND = 1_000
const MILLION = 1_000_000
const BILLION = 1_000_000_000
const VOLUME_LOT = 10

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || !Number.isFinite(value)
}

export function formatPrice(value: number | null | undefined, type: InstrumentType, context: FormatContext): string {
  if (isMissing(value)) return ''
  if (!isVndPriced(type)) return numberFormatter(context.locale, 'dec1').format(value)
  if (context.priceUnit === 'thousand') return numberFormatter(context.locale, 'dec2').format(value / THOUSAND)
  return numberFormatter(context.locale, 'int').format(value)
}

/** Signed price difference, same unit as formatPrice. */
export function formatChange(value: number | null | undefined, type: InstrumentType, context: FormatContext): string {
  if (isMissing(value)) return ''
  if (!isVndPriced(type)) return numberFormatter(context.locale, 'signedDec1').format(value)
  if (context.priceUnit === 'thousand') return numberFormatter(context.locale, 'signedDec2').format(value / THOUSAND)
  return numberFormatter(context.locale, 'signedInt').format(value)
}

export function formatPercent(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return `${numberFormatter(context.locale, 'signedPercent').format(value)}%`
}

/** Zero volume renders blank, like empty order-book levels on iBoard. */
export function formatVolume(value: number | null | undefined, type: InstrumentType, context: FormatContext): string {
  if (isMissing(value) || value === 0) return ''
  const shown = isShareVolume(type) && context.volumeUnit === 'ten' ? Math.round(value / VOLUME_LOT) : value
  return numberFormatter(context.locale, 'int').format(shown)
}

/** VND → billions ("tỷ"), the unit iBoard uses for traded value. */
export function formatValue(valueVnd: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(valueVnd) || valueVnd === 0) return ''
  return numberFormatter(context.locale, 'dec2').format(valueVnd / BILLION)
}

export function formatIndex(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return numberFormatter(context.locale, 'dec2').format(value)
}

export function formatIndexChange(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return numberFormatter(context.locale, 'signedDec2').format(value)
}

/** Short form for panels: 1.2M / 1,2 Tr. */
export function formatCompact(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return numberFormatter(context.locale, 'compact').format(value)
}

/** Index volume in millions of shares with 3 decimals, like iBoard's "KLGD (Triệu)". */
export function formatMillions(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return numberFormatter(context.locale, 'dec3').format(value / MILLION)
}

/** Whole shares with grouping: "583,351,514". */
export function formatShares(value: number | null | undefined, context: Pick<FormatContext, 'locale'>): string {
  if (isMissing(value)) return ''
  return numberFormatter(context.locale, 'int').format(value)
}
