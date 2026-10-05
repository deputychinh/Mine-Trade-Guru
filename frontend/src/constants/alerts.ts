import type { AlertCondition, AlertConditionDefinition, ThresholdUnit } from '@/interfaces/alert'

export const ALERT_CONDITIONS: readonly AlertConditionDefinition[] = [
  { condition: 'PRICE_ABOVE', labelKey: 'alert.condition.priceAbove', thresholdUnit: 'price' },
  { condition: 'PRICE_BELOW', labelKey: 'alert.condition.priceBelow', thresholdUnit: 'price' },
  { condition: 'CHANGE_PERCENT_ABOVE', labelKey: 'alert.condition.changeAbove', thresholdUnit: 'percent' },
  { condition: 'CHANGE_PERCENT_BELOW', labelKey: 'alert.condition.changeBelow', thresholdUnit: 'percent' },
  { condition: 'HITS_CEILING', labelKey: 'alert.condition.hitsCeiling', thresholdUnit: null },
  { condition: 'HITS_FLOOR', labelKey: 'alert.condition.hitsFloor', thresholdUnit: null },
  { condition: 'LARGE_TRADE', labelKey: 'alert.condition.largeTrade', thresholdUnit: 'shares' },
]

export const ALERT_CONDITION_LABEL_KEYS = Object.fromEntries(
  ALERT_CONDITIONS.map((definition) => [definition.condition, definition.labelKey]),
) as Record<AlertCondition, string>

/** Unit of the observed value an event records (ceiling/floor events record the price). */
export const ALERT_VALUE_UNITS: Record<AlertCondition, ThresholdUnit> = {
  PRICE_ABOVE: 'price',
  PRICE_BELOW: 'price',
  CHANGE_PERCENT_ABOVE: 'percent',
  CHANGE_PERCENT_BELOW: 'percent',
  HITS_CEILING: 'price',
  HITS_FLOOR: 'price',
  LARGE_TRADE: 'shares',
}

/** At most this many alert toasts on screen; older ones are dropped. */
export const ALERT_TOAST_LIMIT = 3

/** How long a toast stays on screen. */
export const ALERT_TOAST_TIMEOUT_MS = 6_000

/** Short chime generated with WebAudio — no audio asset to download. */
export const ALERT_SOUND = { frequencyHz: 880, durationMs: 160, gain: 0.08 } as const
