export type AlertCondition =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'CHANGE_PERCENT_ABOVE'
  | 'CHANGE_PERCENT_BELOW'
  | 'HITS_CEILING'
  | 'HITS_FLOOR'
  /** A single matched trade of at least `threshold` shares (block trade / volume spike). */
  | 'LARGE_TRADE'

export type ThresholdUnit = 'price' | 'percent' | 'shares'

export interface AlertConditionDefinition {
  condition: AlertCondition
  labelKey: string
  /** null = condition has no threshold (ceiling/floor). */
  thresholdUnit: ThresholdUnit | null
}

export interface AlertRule {
  id: string
  symbol: string
  condition: AlertCondition
  /** Price in VND, percent, or shares depending on the condition; null when not needed. */
  threshold: number | null
  isEnabled: boolean
  createdAt: number
  lastTriggeredAt: number | null
}

export interface AlertEvent {
  id: string
  ruleId: string
  symbol: string
  condition: AlertCondition
  threshold: number | null
  /** The observed value that triggered the rule. */
  value: number
  triggeredAt: number
  isRead: boolean
}

export type AlertRuleDraft = Pick<AlertRule, 'symbol' | 'condition' | 'threshold'>

/** A triggered alert ready to render (text already localized and formatted). */
export interface AlertEventView {
  id: string
  symbol: string
  message: string
  time: string
  isRead: boolean
}
