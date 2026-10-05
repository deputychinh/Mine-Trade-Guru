import { describe, expect, it } from 'vitest'
import type { AlertRule } from '@/interfaces/alert'
import type { Quote } from '@/interfaces/market'
import { INITIAL_RULE_STATE, nextRuleState, type RuleState } from '@/utils/alertEvaluate'
import { makeQuote } from '../../helpers/fixtures'

function rule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: 'r1',
    symbol: 'FPT',
    condition: 'PRICE_ABOVE',
    threshold: 101_000,
    isEnabled: true,
    createdAt: 0,
    lastTriggeredAt: null,
    ...overrides,
  }
}

/** Runs a rule over a sequence of quotes and returns the value fired at each step. */
function run(alert: AlertRule, quotes: Quote[]): Array<number | null> {
  let state: RuleState = INITIAL_RULE_STATE
  return quotes.map((quote) => {
    const step = nextRuleState(alert, quote, state)
    state = step.state
    return step.firedValue
  })
}

describe('nextRuleState', () => {
  it('never fires on the first observation, even when already met', () => {
    expect(run(rule({}), [makeQuote({ lastPrice: 102_000 })])).toEqual([null])
  })

  it('fires once when the condition becomes true, not on every tick while true', () => {
    const prices = [100_000, 101_500, 102_000, 100_500, 101_000]
    expect(run(rule({}), prices.map((lastPrice) => makeQuote({ lastPrice })))).toEqual([null, 101_500, null, null, 101_000])
  })

  it('handles ceiling hits', () => {
    const alert = rule({ condition: 'HITS_CEILING', threshold: null })
    expect(run(alert, [makeQuote({ lastPrice: 106_000 }), makeQuote({ lastPrice: 107_000 })])).toEqual([null, 107_000])
  })

  it('fires per qualifying trade for LARGE_TRADE', () => {
    const alert = rule({ condition: 'LARGE_TRADE', threshold: 5_000 })
    const quotes = [
      makeQuote({ lastTradeId: 1, lastVolume: 100 }),
      makeQuote({ lastTradeId: 2, lastVolume: 6_000 }),
      makeQuote({ lastTradeId: 2, lastVolume: 6_000 }),
      makeQuote({ lastTradeId: 3, lastVolume: 9_000 }),
    ]
    expect(run(alert, quotes)).toEqual([null, 6_000, null, 9_000])
  })
})
