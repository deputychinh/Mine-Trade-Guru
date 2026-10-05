import { describe, expect, it } from 'vitest'
import { MarketClock, sessionStateAt, vnDayStart, vnMinuteOfDay } from '../src/market/session.js'

/** Epoch ms for a Vietnam (UTC+7) wall-clock time on 2026-10-01 (a Thursday). */
function vnTime(hour: number, minute: number, day = 1): number {
  return Date.UTC(2026, 9, day, hour - 7, minute)
}

describe('Vietnam time helpers', () => {
  it('computes the minute of day and midnight in UTC+7', () => {
    expect(vnMinuteOfDay(vnTime(9, 13))).toBe(9 * 60 + 13)
    expect(vnDayStart(vnTime(9, 13))).toBe(Date.UTC(2026, 8, 30, 17, 0))
  })
})

describe('sessionStateAt', () => {
  it('HOSE: ATO until 09:15, then continuous', () => {
    const state = sessionStateAt('HOSE', 'simulated', vnTime(9, 13), 1)
    expect(state.phase).toBe('ATO')
    expect(state.nextPhase).toBe('CONTINUOUS')
    expect(state.nextPhaseAt).toBe(vnTime(9, 15))
  })

  it('HNX has no ATO and is continuous at 09:13', () => {
    expect(sessionStateAt('HNX', 'simulated', vnTime(9, 13), 1).phase).toBe('CONTINUOUS')
  })

  it('lunch break, ATC and put-through follow the published timetable', () => {
    expect(sessionStateAt('HOSE', 'simulated', vnTime(11, 45), 1)).toMatchObject({
      phase: 'LUNCH',
      nextPhase: 'CONTINUOUS',
      nextPhaseAt: vnTime(13, 0),
    })
    expect(sessionStateAt('HOSE', 'simulated', vnTime(14, 35), 1).phase).toBe('ATC')
    expect(sessionStateAt('HOSE', 'simulated', vnTime(14, 50), 1).phase).toBe('PUT_THROUGH')
    expect(sessionStateAt('UPCOM', 'simulated', vnTime(14, 50), 1).phase).toBe('CONTINUOUS')
  })

  it('derivatives open at 08:45 and close at 14:45 with no next phase', () => {
    expect(sessionStateAt('DERIVATIVES', 'simulated', vnTime(8, 50), 1).phase).toBe('ATO')
    expect(sessionStateAt('DERIVATIVES', 'simulated', vnTime(14, 50), 1)).toMatchObject({
      phase: 'CLOSED',
      nextPhase: null,
      nextPhaseAt: null,
    })
  })

  it('always-open mode is continuous at any time', () => {
    expect(sessionStateAt('HOSE', 'always-open', vnTime(3, 0), 1).phase).toBe('CONTINUOUS')
  })

  it('live mode is closed on weekends', () => {
    // 2026-10-03 is a Saturday
    expect(sessionStateAt('HOSE', 'live', vnTime(10, 0, 3), 1).phase).toBe('CLOSED')
  })
})

describe('MarketClock', () => {
  it('simulated mode starts at the configured time and runs at the configured speed', () => {
    let real = vnTime(22, 0)
    const clock = new MarketClock('simulated', 60, '09:13', () => real)
    expect(vnMinuteOfDay(clock.now())).toBe(9 * 60 + 13)
    real += 1_000
    expect(vnMinuteOfDay(clock.now())).toBe(9 * 60 + 14)
  })

  it('restartDay jumps to the start time on the next day', () => {
    const real = vnTime(22, 0)
    const clock = new MarketClock('simulated', 1, '09:13', () => real)
    const before = clock.now()
    clock.restartDay()
    expect(clock.now() - before).toBe(24 * 60 * 60 * 1_000)
  })

  it('live mode ignores speed and follows the real clock', () => {
    const real = vnTime(10, 30)
    const clock = new MarketClock('live', 60, '09:13', () => real)
    expect(clock.speed).toBe(1)
    expect(clock.now()).toBe(real)
  })
})
