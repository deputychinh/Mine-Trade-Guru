import { COLUMN_GROUPS } from '@/constants/priceBoardColumns'
import type { BoardCell, CellKind, ColumnDefinition, ColumnGroupSpan } from '@/interfaces/board'
import type { InstrumentType, Quote } from '@/interfaces/market'
import type { FormatContext } from '@/interfaces/settings'
import { columnValue } from './columnValue'
import { priceColor } from './priceColor'
import { formatChange, formatPercent, formatPrice, formatValue, formatVolume } from './priceFormat'
import { priceMarker } from './priceMarker'

const GROUP_LABEL_KEYS = new Map(COLUMN_GROUPS.map((group) => [group.key, group.labelKey]))
/** Cells that carry the ▲ ▼ ■ marker; change and % already show a sign. */
const MARKED_KINDS: ReadonlySet<CellKind> = new Set(['price', 'symbol'])
/** Every cell whose number can change flashes; only the symbol cell doesn't. */
const FLASHING_KINDS: ReadonlySet<CellKind> = new Set(['price', 'volume', 'change', 'percent', 'value'])

function cellText(kind: CellKind, value: number | null, type: InstrumentType, context: FormatContext): string {
  switch (kind) {
    case 'price':
      return formatPrice(value, type, context)
    case 'volume':
      return formatVolume(value, type, context)
    case 'change':
      return formatChange(value, type, context)
    case 'percent':
      return formatPercent(value, context)
    case 'value':
      return formatValue(value, context)
    case 'symbol':
      return ''
  }
}

/** Text, color, marker and flash value of one board cell (FR-01, FR-02, FR-04). */
export function buildBoardCell(
  column: ColumnDefinition,
  quote: Quote,
  type: InstrumentType,
  context: FormatContext,
): BoardCell {
  const isSymbol = column.kind === 'symbol'
  const value = columnValue(quote, column.key)
  const sourceValue = column.colorSource ? columnValue(quote, column.colorSource) : null
  const text = isSymbol ? quote.symbol : cellText(column.kind, value, type, context)
  const hasContent = isSymbol ? sourceValue !== null : text !== ''
  const color = hasContent && column.colorSource ? priceColor(sourceValue, quote) : null
  const marker = MARKED_KINDS.has(column.kind) ? priceMarker(color) : null
  return {
    key: column.key,
    kind: column.kind,
    text,
    color,
    marker: marker?.symbol ?? null,
    ariaKey: marker?.ariaKey ?? null,
    flashValue: FLASHING_KINDS.has(column.kind) ? value : null,
  }
}

/** Adjacent columns of the same group collapse into one spanning group header. */
export function columnGroupSpans(columns: readonly ColumnDefinition[]): ColumnGroupSpan[] {
  const spans: ColumnGroupSpan[] = []
  for (const column of columns) {
    const last = spans[spans.length - 1]
    if (last && last.key === column.group) last.span++
    else spans.push({ key: column.group, labelKey: GROUP_LABEL_KEYS.get(column.group) ?? '', span: 1 })
  }
  return spans
}

/** CSS grid track list built from the width tokens in tokens.css (rule S1). */
export function boardGridTemplate(columns: readonly ColumnDefinition[]): string {
  return columns.map((column) => `var(--mtg-board-col-${column.width})`).join(' ')
}
