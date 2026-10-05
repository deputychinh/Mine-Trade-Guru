import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { OPEN_PHASES } from '@/constants/sessions'
import type { SessionMarket } from '@/interfaces/market'
import type { SessionState } from '@/interfaces/session'

interface ReceivedSession {
  state: SessionState
  /** Local Date.now() when the state arrived; used to extrapolate market time for countdowns. */
  receivedAt: number
}

/** Trading session per market (FR-15). */
export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Partial<Record<SessionMarket, ReceivedSession>>>({})

  function applySessions(states: readonly SessionState[], receivedAt: number = Date.now()): void {
    if (states.length === 0) return
    const next = { ...sessions.value }
    for (const state of states) next[state.market] = { state, receivedAt }
    sessions.value = next
  }

  function stateOf(market: SessionMarket): SessionState | null {
    return sessions.value[market]?.state ?? null
  }

  /** Market time now, extrapolated from the last update (the simulator's clock may run faster). */
  function marketTimeAt(market: SessionMarket, now: number): number | null {
    const entry = sessions.value[market]
    if (!entry) return null
    return entry.state.marketTime + (now - entry.receivedAt) * entry.state.clockSpeed
  }

  /** Real milliseconds until the next phase, or null when there is none. */
  function msUntilNextPhase(market: SessionMarket, now: number): number | null {
    const entry = sessions.value[market]
    const marketNow = marketTimeAt(market, now)
    if (!entry || marketNow === null || entry.state.nextPhaseAt === null) return null
    return Math.max(0, (entry.state.nextPhaseAt - marketNow) / entry.state.clockSpeed)
  }

  const isAnyOpen = computed(() =>
    Object.values(sessions.value).some((entry) => entry !== undefined && OPEN_PHASES.has(entry.state.phase)),
  )

  return { sessions, applySessions, stateOf, marketTimeAt, msUntilNextPhase, isAnyOpen }
})
