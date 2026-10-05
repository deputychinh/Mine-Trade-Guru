import type { ThresholdUnit } from '@/interfaces/alert'
import type { InstrumentType } from '@/interfaces/market'
import type { FormatContext } from '@/interfaces/settings'
import { isShareVolume, isVndPriced } from './instrument'
import { formatPercent, formatPrice, formatVolume } from './priceFormat'

/** Thresholds and triggered values are shown in the same units as the board. */
export function formatAlertNumber(
  value: number | null,
  unit: ThresholdUnit,
  type: InstrumentType,
  context: FormatContext,
): string {
  switch (unit) {
    case 'price':
      return formatPrice(value, type, context)
    case 'percent':
      return formatPercent(value, context)
    case 'shares':
      return formatVolume(value, type, context)
  }
}

const THOUSAND = 1_000

/**
 * Threshold typed by the user, in the same unit the board shows → raw value stored in the rule
 * (VND, index points, %, shares). Accepts "95,3" and "95.3". Null when it isn't a number.
 */
export function parseAlertThreshold(
  text: string,
  unit: ThresholdUnit,
  type: InstrumentType,
  context: FormatContext,
): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return unit === 'price' && isVndPriced(type) && context.priceUnit === 'thousand' ? Math.round(value * THOUSAND) : value
}

/** i18n key of the unit hint shown next to the threshold field. */
export function thresholdUnitKey(unit: ThresholdUnit, type: InstrumentType, context: FormatContext): string {
  if (unit === 'percent') return 'alert.unit.percent'
  if (unit === 'shares') return isShareVolume(type) ? 'alert.unit.shares' : 'alert.unit.contracts'
  if (!isVndPriced(type)) return 'alert.unit.points'
  return context.priceUnit === 'thousand' ? 'alert.unit.thousandVnd' : 'alert.unit.vnd'
}
