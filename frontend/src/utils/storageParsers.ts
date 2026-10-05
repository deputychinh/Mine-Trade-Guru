import { ALERT_CONDITIONS } from '@/constants/alerts'
import { BOARDS } from '@/constants/boards'
import { DEFAULT_INDEX_CARDS, INDEX_CODES } from '@/constants/market'
import { COLUMN_GROUPS } from '@/constants/priceBoardColumns'
import { DEFAULT_SETTINGS } from '@/constants/settings'
import type { AlertCondition, AlertEvent, AlertRule } from '@/interfaces/alert'
import type { BoardId, ColumnGroupKey } from '@/interfaces/board'
import type { IndexCode } from '@/interfaces/market'
import type { Settings } from '@/interfaces/settings'
import type { Watchlist } from '@/interfaces/watchlist'

// localStorage is user-controlled: anything read back is validated and falls back to
// defaults instead of trusting the stored shape (rule 9.5).

const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/
export const WATCHLIST_NAME_MAX = 40

const SETTING_OPTIONS: { [K in keyof Settings]: readonly Settings[K][] } = {
  theme: ['dark', 'light'],
  locale: ['vi', 'en'],
  density: ['compact', 'comfortable'],
  fontScale: ['normal', 'large'],
  priceUnit: ['thousand', 'vnd'],
  volumeUnit: ['ten', 'one'],
  isFlashEnabled: [true, false],
  isSoundEnabled: [true, false],
  isBrowserNotificationEnabled: [true, false],
}

const BOARD_IDS = BOARDS.map((board) => board.id)
const GROUP_KEYS = COLUMN_GROUPS.map((group) => group.key)
const MOVABLE_GROUP_KEYS = COLUMN_GROUPS.filter((group) => !group.isFixed).map((group) => group.key)
const CONDITIONS = ALERT_CONDITIONS.map((definition) => definition.condition)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<T>(options: readonly T[], value: unknown): value is T {
  return options.includes(value as T)
}

function isSymbolList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && SYMBOL_PATTERN.test(item))
}

function isNullableFinite(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

/** Field by field: one bad field falls back to its default, the rest is kept. */
export function parseSettings(raw: unknown): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS }
  if (!isRecord(raw)) return result
  for (const key of Object.keys(SETTING_OPTIONS) as Array<keyof Settings>) {
    const value = raw[key]
    if (isOneOf(SETTING_OPTIONS[key] as readonly unknown[], value)) Object.assign(result, { [key]: value })
  }
  return result
}

export function sanitizeWatchlistName(name: string): string {
  return name.trim().slice(0, WATCHLIST_NAME_MAX)
}

export function parseWatchlists(raw: unknown): Watchlist[] | null {
  if (!Array.isArray(raw)) return null
  const lists: Watchlist[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue
    if (!isSymbolList(item.symbols) || typeof item.createdAt !== 'number') continue
    lists.push({
      id: item.id,
      name: sanitizeWatchlistName(item.name),
      symbols: [...new Set(item.symbols)],
      createdAt: item.createdAt,
    })
  }
  return lists.length > 0 ? lists : null
}

export function parseString(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null
}

export function parseBoardId(raw: unknown): BoardId | null {
  return isOneOf(BOARD_IDS, raw) ? raw : null
}

export function parseSymbols(raw: unknown): string[] | null {
  return isSymbolList(raw) ? [...new Set(raw)] : null
}

export interface BoardLayout {
  groupOrder: ColumnGroupKey[]
  hiddenGroups: ColumnGroupKey[]
}

/** Keeps known groups only and appends any group added in a newer version of the app. */
export function parseBoardLayout(raw: unknown): BoardLayout | null {
  if (!isRecord(raw) || !Array.isArray(raw.groupOrder) || !Array.isArray(raw.hiddenGroups)) return null
  const order = raw.groupOrder.filter((key): key is ColumnGroupKey => isOneOf(GROUP_KEYS, key))
  const missing = GROUP_KEYS.filter((key) => !order.includes(key))
  const hidden = raw.hiddenGroups.filter((key): key is ColumnGroupKey => isOneOf(MOVABLE_GROUP_KEYS, key))
  return { groupOrder: [...new Set([...order, ...missing])], hiddenGroups: [...new Set(hidden)] }
}

export function parseAlertRules(raw: unknown): AlertRule[] | null {
  if (!Array.isArray(raw)) return null
  return raw.filter(
    (item): item is AlertRule =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.symbol === 'string' &&
      SYMBOL_PATTERN.test(item.symbol) &&
      isOneOf<AlertCondition>(CONDITIONS, item.condition) &&
      isNullableFinite(item.threshold) &&
      typeof item.isEnabled === 'boolean' &&
      typeof item.createdAt === 'number' &&
      isNullableFinite(item.lastTriggeredAt),
  )
}

export function parseAlertEvents(raw: unknown): AlertEvent[] | null {
  if (!Array.isArray(raw)) return null
  return raw.filter(
    (item): item is AlertEvent =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.ruleId === 'string' &&
      typeof item.symbol === 'string' &&
      isOneOf<AlertCondition>(CONDITIONS, item.condition) &&
      isNullableFinite(item.threshold) &&
      typeof item.value === 'number' &&
      typeof item.triggeredAt === 'number' &&
      typeof item.isRead === 'boolean',
  )
}

/** Index chart cards: exactly the default number of known index codes. */
export function parseIndexCards(raw: unknown): IndexCode[] | null {
  if (!Array.isArray(raw) || raw.length !== DEFAULT_INDEX_CARDS.length) return null
  return raw.every((code) => isOneOf(INDEX_CODES, code)) ? (raw as IndexCode[]) : null
}

export function parseBoolean(raw: unknown): boolean | null {
  return typeof raw === 'boolean' ? raw : null
}
