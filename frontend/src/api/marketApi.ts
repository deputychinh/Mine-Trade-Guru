import { API_ROUTES } from '@/constants/api'
import { TRADE_TAPE_LIMIT } from '@/constants/limits'
import type { Bar, IndexCode, IndexPoint, Instrument, Trade, VolumeAtPrice } from '@/interfaces/market'
import type { Snapshot } from '@/interfaces/websocket'
import {
  parseBars,
  parseIndexPoints,
  parseInstruments,
  parseSnapshot,
  parseTrades,
  parseVolumeProfile,
} from '@/utils/typeGuards'
import { getJson, HttpError } from './httpClient'

// REST calls only: fetch, validate, return typed data. No state, no Vue (rule 9.1).

function ensure<T>(value: T | null, what: string): T {
  if (value === null) throw new HttpError('invalid-response', `The server sent an invalid ${what} response`)
  return value
}

export async function fetchInstruments(signal?: AbortSignal): Promise<Instrument[]> {
  return ensure(parseInstruments(await getJson(API_ROUTES.instruments(), signal)), 'instruments')
}

export async function fetchSnapshot(signal?: AbortSignal): Promise<Snapshot> {
  return ensure(parseSnapshot(await getJson(API_ROUTES.snapshot(), signal)), 'snapshot')
}

/** Newest first. */
export async function fetchTrades(symbol: string, signal?: AbortSignal): Promise<Trade[]> {
  const path = `${API_ROUTES.trades(symbol)}?limit=${TRADE_TAPE_LIMIT}`
  return ensure(parseTrades(await getJson(path, signal)), 'trades')
}

/** 1-minute bars, oldest first. */
export async function fetchBars(symbol: string, signal?: AbortSignal): Promise<Bar[]> {
  return ensure(parseBars(await getJson(API_ROUTES.bars(symbol), signal)), 'bars')
}

/** Highest price first. */
export async function fetchVolumeProfile(symbol: string, signal?: AbortSignal): Promise<VolumeAtPrice[]> {
  return ensure(parseVolumeProfile(await getJson(API_ROUTES.volumeByPrice(symbol), signal)), 'volume-by-price')
}

export async function fetchIndexHistory(code: IndexCode, signal?: AbortSignal): Promise<IndexPoint[]> {
  return ensure(parseIndexPoints(await getJson(API_ROUTES.indexHistory(code), signal)), 'index history')
}
