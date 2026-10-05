import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { ALERT_CONDITIONS, ALERT_TOAST_LIMIT } from '@/constants/alerts'
import { ALERT_EVENT_LIMIT } from '@/constants/limits'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { AlertEvent, AlertRule, AlertRuleDraft } from '@/interfaces/alert'
import { createId } from '@/utils/id'
import { prependCapped } from '@/utils/ringBuffer'
import { parseAlertEvents, parseAlertRules } from '@/utils/storageParsers'

const NEEDS_THRESHOLD = new Set(
  ALERT_CONDITIONS.filter((definition) => definition.thresholdUnit !== null).map((definition) => definition.condition),
)

/** Alert rules and the triggered-alert history (FR-32, FR-33). */
export const useAlertStore = defineStore('alerts', () => {
  const rules = useLocalStorage<AlertRule[]>(STORAGE_KEYS.alertRules, [], parseAlertRules)
  const events = useLocalStorage<AlertEvent[]>(STORAGE_KEYS.alertEvents, [], parseAlertEvents)

  /** Events waiting to be shown as toasts; session-only, never persisted. */
  const toasts = shallowRef<AlertEvent[]>([])

  const unreadCount = computed(() => events.value.filter((event) => !event.isRead).length)

  /** Enabled rules grouped by symbol, so evaluation only looks at symbols that have rules. */
  const activeRulesBySymbol = computed(() => {
    const map = new Map<string, AlertRule[]>()
    for (const rule of rules.value) {
      if (!rule.isEnabled) continue
      const list = map.get(rule.symbol) ?? []
      list.push(rule)
      map.set(rule.symbol, list)
    }
    return map
  })

  /** Returns the new rule, or null when a required threshold is missing. */
  function addRule(draft: AlertRuleDraft): AlertRule | null {
    const needsThreshold = NEEDS_THRESHOLD.has(draft.condition)
    if (needsThreshold && (draft.threshold === null || !Number.isFinite(draft.threshold))) return null
    const rule: AlertRule = {
      id: createId(),
      symbol: draft.symbol,
      condition: draft.condition,
      threshold: needsThreshold ? draft.threshold : null,
      isEnabled: true,
      createdAt: Date.now(),
      lastTriggeredAt: null,
    }
    rules.value = [...rules.value, rule]
    return rule
  }

  function removeRule(id: string): void {
    rules.value = rules.value.filter((rule) => rule.id !== id)
  }

  function setRuleEnabled(id: string, isEnabled: boolean): void {
    rules.value = rules.value.map((rule) => (rule.id === id ? { ...rule, isEnabled } : rule))
  }

  function recordEvent(rule: AlertRule, value: number, triggeredAt: number): AlertEvent {
    const event: AlertEvent = {
      id: createId(),
      ruleId: rule.id,
      symbol: rule.symbol,
      condition: rule.condition,
      threshold: rule.threshold,
      value,
      triggeredAt,
      isRead: false,
    }
    events.value = prependCapped(events.value, [event], ALERT_EVENT_LIMIT)
    rules.value = rules.value.map((item) => (item.id === rule.id ? { ...item, lastTriggeredAt: triggeredAt } : item))
    return event
  }

  function pushToast(event: AlertEvent): void {
    toasts.value = prependCapped(toasts.value, [event], ALERT_TOAST_LIMIT)
  }

  function dismissToast(id: string): void {
    toasts.value = toasts.value.filter((event) => event.id !== id)
  }

  function markRead(id: string): void {
    events.value = events.value.map((event) => (event.id === id ? { ...event, isRead: true } : event))
  }

  function markAllRead(): void {
    events.value = events.value.map((event) => (event.isRead ? event : { ...event, isRead: true }))
  }

  function clearEvents(): void {
    events.value = []
  }

  return {
    rules,
    events,
    toasts,
    unreadCount,
    activeRulesBySymbol,
    addRule,
    removeRule,
    setRuleEnabled,
    recordEvent,
    pushToast,
    dismissToast,
    markRead,
    markAllRead,
    clearEvents,
  }
})
