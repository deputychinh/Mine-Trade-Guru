import type { SessionMarket } from './market'

export type SessionPhase = 'PRE_OPEN' | 'ATO' | 'CONTINUOUS' | 'LUNCH' | 'ATC' | 'PUT_THROUGH' | 'CLOSED'

export interface SessionState {
  market: SessionMarket
  phase: SessionPhase
  nextPhase: SessionPhase | null
  /** Market time (epoch ms) when the next phase starts. */
  nextPhaseAt: number | null
  /** Market time (epoch ms) when this state was produced. */
  marketTime: number
  /** Market ms that pass per real ms (> 1 in the simulator's fast demo mode). */
  clockSpeed: number
}

/** One market chip in the header: phase plus real-time countdown to the next phase (FR-15). */
export interface SessionIndicatorItem {
  market: SessionMarket
  phase: SessionPhase
  countdownMs: number | null
}
