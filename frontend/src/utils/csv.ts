const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/
const HEADER = 'symbol'

/**
 * Watchlist CSV import (FR-31): one symbol per line or comma/semicolon separated, optional
 * "symbol" header. Anything that isn't a plain ticker is dropped — which also rules out
 * spreadsheet formula injection on a later export.
 */
export function parseSymbolsCsv(text: string): { symbols: string[]; invalid: string[] } {
  const symbols: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/[\r\n,;\t]+/)) {
    const token = raw.trim().replace(/^"|"$/g, '').toUpperCase()
    if (token === '' || token === HEADER.toUpperCase()) continue
    if (!SYMBOL_PATTERN.test(token)) {
      invalid.push(raw.trim())
      continue
    }
    if (seen.has(token)) continue
    seen.add(token)
    symbols.push(token)
  }
  return { symbols, invalid }
}

export function symbolsToCsv(symbols: readonly string[]): string {
  const safe = symbols.filter((symbol) => SYMBOL_PATTERN.test(symbol))
  return [HEADER, ...safe].join('\n') + '\n'
}
