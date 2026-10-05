import type { AlertRule } from '@/interfaces/alert'
import type { Quote } from '@/interfaces/market'

export interface RuleState {
  /** False until the rule has seen one quote; the first observation never fires. */
  isPrimed: boolean
  wasMet: boolean
  lastTradeId: number | null
}

export interface RuleStep {
  state: RuleState
  /** The observed value when the rule fires on this update; null when it doesn't fire. */
  firedValue: number | null
}

export const INITIAL_RULE_STATE: RuleState = { isPrimed: false, wasMet: false, lastTradeId: null }

function observe(rule: AlertRule, quote: Quote): { isMet: boolean; value: number | null } {
  const { threshold } = rule
  const last = quote.lastPrice
  switch (rule.condition) {
    case 'PRICE_ABOVE':
      return { isMet: last !== null && threshold !== null && last >= threshold, value: last }
    case 'PRICE_BELOW':
      return { isMet: last !== null && threshold !== null && last <= threshold, value: last }
    case 'CHANGE_PERCENT_ABOVE':
      return {
        isMet: quote.changePercent !== null && threshold !== null && quote.changePercent >= threshold,
        value: quote.changePercent,
      }
    case 'CHANGE_PERCENT_BELOW':
      return {
        isMet: quote.changePercent !== null && threshold !== null && quote.changePercent <= threshold,
        value: quote.changePercent,
      }
    case 'HITS_CEILING':
      return { isMet: last !== null && last === quote.ceiling, value: last }
    case 'HITS_FLOOR':
      return { isMet: last !== null && last === quote.floor, value: last }
    case 'LARGE_TRADE':
      return {
        isMet: quote.lastVolume !== null && threshold !== null && quote.lastVolume >= threshold,
        value: quote.lastVolume,
      }
  }
}

/**
 * Edge-triggered: a rule fires when its condition becomes true, not on every tick while it
 * stays true, and not on the very first observation (no burst of alerts on page load).
 * LARGE_TRADE fires once per new qualifying trade instead.
 */
export function nextRuleState(rule: AlertRule, quote: Quote, previous: RuleState): RuleStep {
  const { isMet, value } = observe(rule, quote)
  const state: RuleState = { isPrimed: true, wasMet: isMet, lastTradeId: quote.lastTradeId }
  if (!previous.isPrimed) return { state, firedValue: null }

  if (rule.condition === 'LARGE_TRADE') {
    const isNewTrade = quote.lastTradeId !== null && quote.lastTradeId !== previous.lastTradeId
    return { state, firedValue: isMet && isNewTrade ? value : null }
  }
  return { state, firedValue: isMet && !previous.wasMet ? value : null }
}
