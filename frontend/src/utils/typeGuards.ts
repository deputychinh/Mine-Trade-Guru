import { EXCHANGES, INDEX_CODES, INSTRUMENT_TYPE_LABEL_KEYS, SECTORS, SESSION_MARKETS } from '@/constants/market'
import { SESSION_PHASE_LABEL_KEYS } from '@/constants/sessions'
import type {
  Bar,
  ForeignDelta,
  IndexCode,
  IndexPoint,
  IndexQuote,
  Instrument,
  InstrumentType,
  PriceLevel,
  Quote,
  QuoteDelta,
  Sector,
  SessionMarket,
  Trade,
  TradeSide,
  VolumeAtPrice,
} from '@/interfaces/market'
import type { SessionPhase, SessionState } from '@/interfaces/session'
import type { ServerMessage, Snapshot, WireFrame } from '@/interfaces/websocket'

// Runtime validation for everything that crosses the network (rule 9.5, NFR-R4).
// A TypeScript type protects compile-time code only; these protect against a malformed frame.

type FieldKind = 'number' | 'nullableNumber' | 'nullableSide' | 'levels'
type QuoteField = Exclude<keyof Quote, 'symbol' | 'v'>

const QUOTE_FIELD_KINDS: Record<QuoteField, FieldKind> = {
  reference: 'number',
  ceiling: 'number',
  floor: 'number',
  open: 'nullableNumber',
  high: 'nullableNumber',
  low: 'nullableNumber',
  average: 'nullableNumber',
  lastPrice: 'nullableNumber',
  lastVolume: 'nullableNumber',
  lastTradeId: 'nullableNumber',
  lastTradeTime: 'nullableNumber',
  lastSide: 'nullableSide',
  change: 'nullableNumber',
  changePercent: 'nullableNumber',
  totalVolume: 'number',
  totalValue: 'number',
  bids: 'levels',
  asks: 'levels',
  foreignBuyVolume: 'number',
  foreignSellVolume: 'number',
  foreignRoom: 'number',
  updatedAt: 'number',
}
const QUOTE_FIELDS = Object.keys(QUOTE_FIELD_KINDS) as QuoteField[]

const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/
const MAX_BOOK_LEVELS = 10
const TRADE_SIDES: readonly TradeSide[] = ['B', 'S', 'U']
const INSTRUMENT_TYPES = Object.keys(INSTRUMENT_TYPE_LABEL_KEYS) as InstrumentType[]
const SESSION_PHASES = Object.keys(SESSION_PHASE_LABEL_KEYS) as SessionPhase[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isCount(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

function isSymbol(value: unknown): value is string {
  return typeof value === 'string' && SYMBOL_PATTERN.test(value)
}

function isPriceLevel(value: unknown): value is PriceLevel {
  return isRecord(value) && isNullableNumber(value.price) && isFiniteNumber(value.volume) && value.volume >= 0
}

function isLevels(value: unknown): value is PriceLevel[] {
  return Array.isArray(value) && value.length <= MAX_BOOK_LEVELS && value.every(isPriceLevel)
}

function checkField(kind: FieldKind, value: unknown): boolean {
  switch (kind) {
    case 'number':
      return isFiniteNumber(value)
    case 'nullableNumber':
      return isNullableNumber(value)
    case 'nullableSide':
      return value === null || isOneOf(TRADE_SIDES, value)
    case 'levels':
      return isLevels(value)
  }
}

/** Known fields are type-checked; unknown fields are dropped (forward compatible). */
export function parseQuoteDelta(value: unknown): QuoteDelta | null {
  if (!isRecord(value) || !isSymbol(value.symbol) || !isCount(value.v)) return null
  const delta: QuoteDelta = { symbol: value.symbol, v: value.v }
  for (const field of QUOTE_FIELDS) {
    if (!(field in value)) continue
    if (!checkField(QUOTE_FIELD_KINDS[field], value[field])) return null
    Object.assign(delta, { [field]: value[field] })
  }
  return delta
}

export function parseQuote(value: unknown): Quote | null {
  const delta = parseQuoteDelta(value)
  if (!delta) return null
  return QUOTE_FIELDS.every((field) => field in delta) ? (delta as Quote) : null
}

export function parseForeignDelta(value: unknown): ForeignDelta | null {
  if (!isRecord(value) || !isSymbol(value.symbol) || !isCount(value.v)) return null
  const { foreignBuyVolume, foreignSellVolume, foreignRoom, updatedAt } = value
  if (![foreignBuyVolume, foreignSellVolume, foreignRoom, updatedAt].every(isFiniteNumber)) return null
  return {
    symbol: value.symbol,
    v: value.v,
    foreignBuyVolume: foreignBuyVolume as number,
    foreignSellVolume: foreignSellVolume as number,
    foreignRoom: foreignRoom as number,
    updatedAt: updatedAt as number,
  }
}

const INDEX_NUMBER_FIELDS = [
  'value',
  'reference',
  'change',
  'changePercent',
  'totalVolume',
  'totalValue',
  'advancers',
  'decliners',
  'unchanged',
  'ceilingCount',
  'floorCount',
  'updatedAt',
] as const

export function parseIndexQuote(value: unknown): IndexQuote | null {
  if (!isRecord(value) || !isOneOf<IndexCode>(INDEX_CODES, value.code) || !isCount(value.v)) return null
  if (!INDEX_NUMBER_FIELDS.every((field) => isFiniteNumber(value[field]))) return null
  return value as unknown as IndexQuote
}

export function parseSessionState(value: unknown): SessionState | null {
  if (!isRecord(value)) return null
  if (!isOneOf<SessionMarket>(SESSION_MARKETS, value.market)) return null
  if (!isOneOf<SessionPhase>(SESSION_PHASES, value.phase)) return null
  if (value.nextPhase !== null && !isOneOf<SessionPhase>(SESSION_PHASES, value.nextPhase)) return null
  if (!isNullableNumber(value.nextPhaseAt) || !isFiniteNumber(value.marketTime)) return null
  if (!isFiniteNumber(value.clockSpeed) || value.clockSpeed <= 0) return null
  return value as unknown as SessionState
}

export function parseWireFrame(value: unknown): WireFrame | null {
  if (!isRecord(value)) return null
  switch (value.ch) {
    case 'X': {
      const data = parseQuoteDelta(value.data)
      return data ? { ch: 'X', data } : null
    }
    case 'R': {
      const data = parseForeignDelta(value.data)
      return data ? { ch: 'R', data } : null
    }
    case 'MI': {
      const data = parseIndexQuote(value.data)
      return data ? { ch: 'MI', data } : null
    }
    case 'F': {
      const data = parseSessionState(value.data)
      return data ? { ch: 'F', data } : null
    }
    default:
      return null
  }
}

export interface ParsedServerMessage {
  message: ServerMessage
  /** Frames that failed validation and were dropped. */
  invalidFrames: number
}

/** Invalid frames inside a valid batch are dropped one by one; a malformed envelope rejects the message. */
export function parseServerMessage(value: unknown): ParsedServerMessage | null {
  if (!isRecord(value) || !isFiniteNumber(value.ts)) return null
  if (value.type === 'hb') return { message: { type: 'hb', ts: value.ts }, invalidFrames: 0 }
  if (value.type !== 'batch' || typeof value.gap !== 'boolean' || !Array.isArray(value.frames)) return null
  const frames: WireFrame[] = []
  let invalidFrames = 0
  for (const raw of value.frames) {
    const frame = parseWireFrame(raw)
    if (frame) frames.push(frame)
    else invalidFrames++
  }
  return { message: { type: 'batch', ts: value.ts, gap: value.gap, frames }, invalidFrames }
}

/** All-or-nothing for array responses: a single bad item means the contract changed. */
function parseArray<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const result: T[] = []
  for (const item of value) {
    const parsed = parse(item)
    if (parsed === null) return null
    result.push(parsed)
  }
  return result
}

export function parseSnapshot(value: unknown): Snapshot | null {
  if (!isRecord(value) || !isFiniteNumber(value.serverTime)) return null
  const quotes = parseArray(value.quotes, parseQuote)
  const indices = parseArray(value.indices, parseIndexQuote)
  const sessions = parseArray(value.sessions, parseSessionState)
  if (!quotes || !indices || !sessions) return null
  return { serverTime: value.serverTime, quotes, indices, sessions }
}

function parseInstrument(value: unknown): Instrument | null {
  if (!isRecord(value) || !isSymbol(value.symbol) || typeof value.name !== 'string') return null
  if (!isOneOf(EXCHANGES, value.exchange) || !isOneOf<InstrumentType>(INSTRUMENT_TYPES, value.type)) return null
  if (value.sector !== null && !isOneOf<Sector>(SECTORS, value.sector)) return null
  if (!isFiniteNumber(value.sharesOutstanding)) return null
  if (!Array.isArray(value.indices) || !value.indices.every((code) => isOneOf<IndexCode>(INDEX_CODES, code))) return null
  if (value.underlying !== null && typeof value.underlying !== 'string') return null
  if (!isNullableNumber(value.conversionRatio)) return null
  return value as unknown as Instrument
}

export function parseInstruments(value: unknown): Instrument[] | null {
  return parseArray(value, parseInstrument)
}

function parseTrade(value: unknown): Trade | null {
  if (!isRecord(value) || !isCount(value.id) || !isSymbol(value.symbol)) return null
  if (!isFiniteNumber(value.time) || !isFiniteNumber(value.price) || !isCount(value.volume)) return null
  return isOneOf(TRADE_SIDES, value.side) ? (value as unknown as Trade) : null
}

export function parseTrades(value: unknown): Trade[] | null {
  return parseArray(value, parseTrade)
}

function parseBar(value: unknown): Bar | null {
  if (!isRecord(value)) return null
  const fields = [value.time, value.open, value.high, value.low, value.close, value.volume]
  return fields.every(isFiniteNumber) ? (value as unknown as Bar) : null
}

export function parseBars(value: unknown): Bar[] | null {
  return parseArray(value, parseBar)
}

function parseVolumeAtPrice(value: unknown): VolumeAtPrice | null {
  if (!isRecord(value)) return null
  const fields = [value.price, value.volume, value.buyVolume, value.sellVolume]
  return fields.every(isFiniteNumber) ? (value as unknown as VolumeAtPrice) : null
}

export function parseVolumeProfile(value: unknown): VolumeAtPrice[] | null {
  return parseArray(value, parseVolumeAtPrice)
}

function parseIndexPoint(value: unknown): IndexPoint | null {
  return isRecord(value) && isFiniteNumber(value.time) && isFiniteNumber(value.value) && isCount(value.volume)
    ? (value as unknown as IndexPoint)
    : null
}

export function parseIndexPoints(value: unknown): IndexPoint[] | null {
  return parseArray(value, parseIndexPoint)
}
