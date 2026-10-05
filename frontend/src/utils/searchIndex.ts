import type { Instrument } from '@/interfaces/market'

export interface SearchEntry {
  symbol: string
  symbolKey: string
  nameKey: string
  /** Lower-cased, accent-free words of the name, for word-prefix matches. */
  nameWords: string[]
}

/** Lower case, no Vietnamese diacritics ("Đức Giang" → "duc giang"). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

/** Built once when instruments load, so each keystroke is a linear scan over plain strings (NFR-P6). */
export function buildSearchIndex(instruments: readonly Instrument[]): SearchEntry[] {
  return instruments.map((instrument) => {
    const nameKey = normalizeText(instrument.name)
    return {
      symbol: instrument.symbol,
      symbolKey: instrument.symbol.toLowerCase(),
      nameKey,
      nameWords: nameKey.split(/[^a-z0-9]+/).filter(Boolean),
    }
  })
}

/** Rank: exact symbol < symbol prefix < name word prefix < name contains; ties by symbol. */
function rank(entry: SearchEntry, query: string): number | null {
  if (entry.symbolKey === query) return 0
  if (entry.symbolKey.startsWith(query)) return 1
  if (entry.nameWords.some((word) => word.startsWith(query))) return 2
  if (entry.nameKey.includes(query)) return 3
  return null
}

export function searchInstruments(index: readonly SearchEntry[], rawQuery: string, limit: number): string[] {
  const query = normalizeText(rawQuery)
  if (query === '') return []
  const matches: Array<{ symbol: string; score: number }> = []
  for (const entry of index) {
    const score = rank(entry, query)
    if (score !== null) matches.push({ symbol: entry.symbol, score })
  }
  return matches
    .sort((a, b) => a.score - b.score || a.symbol.localeCompare(b.symbol))
    .slice(0, limit)
    .map((match) => match.symbol)
}
