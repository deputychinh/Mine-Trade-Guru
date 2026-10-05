import { INTL_LOCALES, MARKET_TIME_ZONE } from '@/constants/settings'
import type { Locale } from '@/interfaces/settings'

type TimePrecision = 'minutes' | 'seconds'

const cache = new Map<string, Intl.DateTimeFormat>()

function timeFormatter(locale: Locale, precision: TimePrecision): Intl.DateTimeFormat {
  const key = `${locale}:${precision}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      hour: '2-digit',
      minute: '2-digit',
      ...(precision === 'seconds' ? { second: '2-digit' } : {}),
      hour12: false,
      timeZone: MARKET_TIME_ZONE,
    })
    cache.set(key, formatter)
  }
  return formatter
}

/** Market times are always shown in Vietnam time, whatever the viewer's timezone. */
export function formatMarketTime(epochMs: number | null | undefined, locale: Locale, precision: TimePrecision = 'seconds'): string {
  if (epochMs === null || epochMs === undefined || !Number.isFinite(epochMs)) return ''
  return timeFormatter(locale, precision).format(epochMs)
}

/** 125_000 → "02:05"; 3_725_000 → "1:02:05". Negative values clamp to zero. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}

/** Axis tick for intraday charts: "09h" on the hour, "09:30" otherwise. */
export function formatHourTick(epochMs: number, locale: Locale): string {
  const text = formatMarketTime(epochMs, locale, 'minutes')
  return text.endsWith(':00') ? `${text.slice(0, -3)}h` : text
}
