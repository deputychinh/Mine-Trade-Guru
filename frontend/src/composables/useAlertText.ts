import { useI18n } from 'vue-i18n'
import { ALERT_CONDITION_LABEL_KEYS, ALERT_CONDITIONS, ALERT_VALUE_UNITS } from '@/constants/alerts'
import type { AlertEvent, AlertEventView, AlertRule } from '@/interfaces/alert'
import type { InstrumentType } from '@/interfaces/market'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { formatAlertNumber } from '@/utils/alertFormat'
import { formatMarketTime } from '@/utils/time'

/** Localized text for alert rules and triggered events, in the board's display units. */
export function useAlertText() {
  const instrumentStore = useInstrumentStore()
  const settingsStore = useSettingsStore()
  const { t } = useI18n()

  function typeOf(symbol: string): InstrumentType {
    return instrumentStore.get(symbol)?.type ?? 'STOCK'
  }

  function describe(event: AlertEvent): string {
    return t('alert.message', {
      symbol: event.symbol,
      condition: t(ALERT_CONDITION_LABEL_KEYS[event.condition]),
      value: formatAlertNumber(event.value, ALERT_VALUE_UNITS[event.condition], typeOf(event.symbol), settingsStore.formatContext),
    })
  }

  function describeRule(rule: AlertRule): string {
    const label = t(ALERT_CONDITION_LABEL_KEYS[rule.condition])
    const unit = ALERT_CONDITIONS.find((definition) => definition.condition === rule.condition)?.thresholdUnit ?? null
    if (unit === null || rule.threshold === null) return label
    return `${label} ${formatAlertNumber(rule.threshold, unit, typeOf(rule.symbol), settingsStore.formatContext)}`
  }

  function toView(event: AlertEvent): AlertEventView {
    return {
      id: event.id,
      symbol: event.symbol,
      message: describe(event),
      time: formatMarketTime(event.triggeredAt, settingsStore.settings.locale),
      isRead: event.isRead,
    }
  }

  return { describe, describeRule, toView }
}
