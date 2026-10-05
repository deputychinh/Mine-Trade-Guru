import { watch, watchEffect } from 'vue'
import { useAlertStore } from '@/stores/useAlertStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { INITIAL_RULE_STATE, nextRuleState, type RuleState } from '@/utils/alertEvaluate'
import { useNotifications } from './useNotifications'

/**
 * Evaluates enabled alert rules against live quotes (FR-32, FR-33). Only symbols that have
 * rules are looked at, so the cost per frame is the number of rules, not the board size.
 * Call once, from App.vue.
 */
export function usePriceAlerts(): void {
  const marketStore = useMarketStore()
  const alertStore = useAlertStore()
  const { notify } = useNotifications()

  /** Edge-trigger memory per rule id; never persisted, so a reload re-primes quietly. */
  const states = new Map<string, RuleState>()

  // watchEffect, not watch: quotes is a shallowRef whose Map is mutated in place, so the
  // value never changes identity and a getter-based watch would not fire.
  watchEffect(() => {
    const quotes = marketStore.quotes
    for (const [symbol, rules] of alertStore.activeRulesBySymbol) {
      const quote = quotes.get(symbol)
      if (!quote) continue
      for (const rule of rules) {
        const step = nextRuleState(rule, quote, states.get(rule.id) ?? INITIAL_RULE_STATE)
        states.set(rule.id, step.state)
        if (step.firedValue !== null) notify(alertStore.recordEvent(rule, step.firedValue, Date.now()))
      }
    }
  })

  // Forget state of deleted or disabled rules; re-enabling one starts it un-primed.
  watch(
    () => alertStore.activeRulesBySymbol,
    (active) => {
      const live = new Set([...active.values()].flatMap((rules) => rules.map((rule) => rule.id)))
      for (const id of states.keys()) if (!live.has(id)) states.delete(id)
    },
  )
}
