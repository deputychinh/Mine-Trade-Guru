import { INTL_LOCALES } from '@/constants/settings'
import type { Locale } from '@/interfaces/settings'

export type FormatterKind =
  | 'int'
  | 'dec1'
  | 'dec2'
  | 'dec3'
  | 'signedInt'
  | 'signedDec1'
  | 'signedDec2'
  | 'signedPercent'
  | 'compact'

const OPTIONS: Record<FormatterKind, Intl.NumberFormatOptions> = {
  int: { maximumFractionDigits: 0 },
  dec1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  dec2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  dec3: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
  signedInt: { maximumFractionDigits: 0, signDisplay: 'exceptZero' },
  signedDec1: { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' },
  signedDec2: { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' },
  signedPercent: { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' },
  compact: { notation: 'compact', maximumFractionDigits: 1 },
}

const cache = new Map<string, Intl.NumberFormat>()

/** One formatter per (locale, kind) for the app's lifetime — never created in a render path (rule 9.10). */
export function numberFormatter(locale: Locale, kind: FormatterKind): Intl.NumberFormat {
  const key = `${locale}:${kind}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALES[locale], OPTIONS[kind])
    cache.set(key, formatter)
  }
  return formatter
}
