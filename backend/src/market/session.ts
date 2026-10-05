import type { SessionMarket, SessionPhase, SessionState } from './types.js'

export type SessionMode = 'simulated' | 'live' | 'always-open'

export const SESSION_MARKETS: readonly SessionMarket[] = ['HOSE', 'HNX', 'UPCOM', 'DERIVATIVES']

/** Phases in which the order book changes. Trades happen in CONTINUOUS and at the end of ATO/ATC. */
export const TRADING_PHASES: ReadonlySet<SessionPhase> = new Set(['ATO', 'CONTINUOUS', 'ATC'])

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
/** Vietnam is UTC+7 all year (no DST). */
const VN_OFFSET_MS = 7 * 60 * MINUTE_MS

function hm(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) throw new Error(`Invalid HH:MM time "${time}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

type Schedule = ReadonlyArray<readonly [minuteOfDay: number, phase: SessionPhase]>

/** Published timetables (Vietnam time). */
const SCHEDULES: Record<SessionMarket, Schedule> = {
  HOSE: [
    [hm('00:00'), 'PRE_OPEN'],
    [hm('09:00'), 'ATO'],
    [hm('09:15'), 'CONTINUOUS'],
    [hm('11:30'), 'LUNCH'],
    [hm('13:00'), 'CONTINUOUS'],
    [hm('14:30'), 'ATC'],
    [hm('14:45'), 'PUT_THROUGH'],
    [hm('15:00'), 'CLOSED'],
  ],
  HNX: [
    [hm('00:00'), 'PRE_OPEN'],
    [hm('09:00'), 'CONTINUOUS'],
    [hm('11:30'), 'LUNCH'],
    [hm('13:00'), 'CONTINUOUS'],
    [hm('14:30'), 'ATC'],
    [hm('14:45'), 'PUT_THROUGH'],
    [hm('15:00'), 'CLOSED'],
  ],
  UPCOM: [
    [hm('00:00'), 'PRE_OPEN'],
    [hm('09:00'), 'CONTINUOUS'],
    [hm('11:30'), 'LUNCH'],
    [hm('13:00'), 'CONTINUOUS'],
    [hm('15:00'), 'CLOSED'],
  ],
  DERIVATIVES: [
    [hm('00:00'), 'PRE_OPEN'],
    [hm('08:45'), 'ATO'],
    [hm('09:00'), 'CONTINUOUS'],
    [hm('11:30'), 'LUNCH'],
    [hm('13:00'), 'CONTINUOUS'],
    [hm('14:30'), 'ATC'],
    [hm('14:45'), 'CLOSED'],
  ],
}

/** Minute after which a simulated day rolls over to the next (all markets closed). */
export const DAY_ROLL_MINUTE = hm('15:05')

export function vnDayStart(epochMs: number): number {
  const vnMs = epochMs + VN_OFFSET_MS
  return vnMs - (((vnMs % DAY_MS) + DAY_MS) % DAY_MS) - VN_OFFSET_MS
}

export function vnMinuteOfDay(epochMs: number): number {
  return Math.floor((epochMs - vnDayStart(epochMs)) / MINUTE_MS)
}

export function isVnWeekend(epochMs: number): boolean {
  const day = new Date(epochMs + VN_OFFSET_MS).getUTCDay()
  return day === 0 || day === 6
}

/**
 * Market time. In simulated mode the clock starts at `startTime` (Vietnam time) and
 * runs `speed` times faster than real time, so the full session can be demoed at any hour.
 */
export class MarketClock {
  private anchorReal: number
  private anchorMarket: number
  readonly speed: number

  constructor(
    readonly mode: SessionMode,
    speed: number,
    private readonly startTime: string,
    private readonly realNow: () => number = Date.now,
  ) {
    this.speed = mode === 'simulated' ? speed : 1
    this.anchorReal = realNow()
    this.anchorMarket =
      mode === 'simulated' ? vnDayStart(this.anchorReal) + hm(startTime) * MINUTE_MS : this.anchorReal
  }

  now(): number {
    return this.anchorMarket + (this.realNow() - this.anchorReal) * this.speed
  }

  /** Simulated mode only: jump to `startTime` on the next day. */
  restartDay(): void {
    if (this.mode !== 'simulated') return
    const nextDay = vnDayStart(this.now()) + DAY_MS
    this.anchorReal = this.realNow()
    this.anchorMarket = nextDay + hm(this.startTime) * MINUTE_MS
  }
}

export function sessionStateAt(
  market: SessionMarket,
  mode: SessionMode,
  marketTime: number,
  clockSpeed: number,
): SessionState {
  const base = { market, marketTime, clockSpeed }
  if (mode === 'always-open') {
    return { ...base, phase: 'CONTINUOUS', nextPhase: null, nextPhaseAt: null }
  }
  if (mode === 'live' && isVnWeekend(marketTime)) {
    return { ...base, phase: 'CLOSED', nextPhase: null, nextPhaseAt: null }
  }

  const minute = vnMinuteOfDay(marketTime)
  const schedule = SCHEDULES[market]
  let index = 0
  for (let i = 0; i < schedule.length; i++) {
    const entry = schedule[i]
    if (entry && entry[0] <= minute) index = i
  }
  const current = schedule[index]
  const next = schedule[index + 1]
  if (!current) throw new Error(`Empty schedule for ${market}`)

  return {
    ...base,
    phase: current[1],
    nextPhase: next ? next[1] : null,
    nextPhaseAt: next ? vnDayStart(marketTime) + next[0] * MINUTE_MS : null,
  }
}
