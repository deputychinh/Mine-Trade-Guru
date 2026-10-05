import type { SessionMarket } from '@/interfaces/market'
import type { SessionPhase } from '@/interfaces/session'
import type { ThemeColorName } from '@/interfaces/theme'

export const SESSION_PHASE_LABEL_KEYS: Record<SessionPhase, string> = {
  PRE_OPEN: 'session.preOpen',
  ATO: 'session.ato',
  CONTINUOUS: 'session.continuous',
  LUNCH: 'session.lunch',
  ATC: 'session.atc',
  PUT_THROUGH: 'session.putThrough',
  CLOSED: 'session.closed',
}

/** design-system.md §2.4 */
export const SESSION_PHASE_COLORS: Record<SessionPhase, ThemeColorName> = {
  PRE_OPEN: 'outline',
  ATO: 'tertiary',
  CONTINUOUS: 'primary',
  LUNCH: 'outline',
  ATC: 'tertiary',
  PUT_THROUGH: 'secondary',
  CLOSED: 'outline',
}

/** Phases in which prices are expected to change (stale-data warning applies). */
export const OPEN_PHASES: ReadonlySet<SessionPhase> = new Set<SessionPhase>(['ATO', 'CONTINUOUS', 'ATC'])

export const SESSION_MARKET_LABEL_KEYS: Record<SessionMarket, string> = {
  HOSE: 'market.hose',
  HNX: 'market.hnx',
  UPCOM: 'market.upcom',
  DERIVATIVES: 'market.derivatives',
}

/** Vietnam has no DST: market time is always UTC+7. */
export const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1_000

/** Index charts always show the whole trading day on the time axis (09h–15h, Vietnam time). */
export const INDEX_CHART_HOURS = { open: 9, close: 15 } as const
