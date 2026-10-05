import type { SessionMode } from './market/session.js'

export interface AppConfig {
  port: number
  /** Allowed browser origins for REST (CORS) and WebSocket upgrades. `*` allows any. */
  allowedOrigins: string[]
  sessionMode: SessionMode
  sessionStart: string
  sessionSpeed: number
  sessionLoop: boolean
  /** 0 = the real-looking catalogue only; larger values add synthetic tickers. */
  symbolCount: number
  ticksPerSecond: number
  tradeHistoryLimit: number
  seed: number
  tickIntervalMs: number
  heartbeatMs: number
  pingMs: number
  maxBufferedBytes: number
}

type Env = Record<string, string | undefined>

const SESSION_MODES: readonly SessionMode[] = ['simulated', 'live', 'always-open']

function readNumber(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}, got "${raw}"`)
  }
  return value
}

function readInt(env: Env, name: string, fallback: number, min: number, max: number): number {
  const value = readNumber(env, name, fallback, min, max)
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer, got "${env[name]}"`)
  return value
}

function readBool(env: Env, name: string, fallback: boolean): boolean {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false
  throw new Error(`${name} must be true/false, got "${raw}"`)
}

function readSessionMode(env: Env): SessionMode {
  const raw = env.SESSION_MODE ?? 'simulated'
  const mode = SESSION_MODES.find((candidate) => candidate === raw)
  if (!mode) throw new Error(`SESSION_MODE must be one of ${SESSION_MODES.join(', ')}, got "${raw}"`)
  return mode
}

function readTime(env: Env, name: string, fallback: string): string {
  const raw = env[name] ?? fallback
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) throw new Error(`${name} must be HH:MM, got "${raw}"`)
  return raw
}

/** Fails fast on bad configuration instead of running with surprising defaults. */
export function loadConfig(env: Env = process.env): AppConfig {
  return {
    // 0 = let the OS pick a free port (tests, some PaaS setups)
    port: readInt(env, 'PORT', 8080, 0, 65_535),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionMode: readSessionMode(env),
    sessionStart: readTime(env, 'SESSION_START', '09:13'),
    sessionSpeed: readNumber(env, 'SESSION_SPEED', 1, 0.1, 600),
    sessionLoop: readBool(env, 'SESSION_LOOP', true),
    symbolCount: readInt(env, 'SYMBOL_COUNT', 0, 0, 5_000),
    ticksPerSecond: readNumber(env, 'TICKS_PER_SECOND', 0.4, 0.01, 20),
    tradeHistoryLimit: readInt(env, 'TRADE_HISTORY_LIMIT', 300, 10, 5_000),
    seed: readInt(env, 'SEED', 42, 0, 2 ** 31 - 1),
    tickIntervalMs: readInt(env, 'TICK_INTERVAL_MS', 100, 20, 1_000),
    heartbeatMs: readInt(env, 'HEARTBEAT_MS', 5_000, 1_000, 60_000),
    pingMs: readInt(env, 'PING_MS', 15_000, 1_000, 120_000),
    maxBufferedBytes: readInt(env, 'MAX_BUFFERED_BYTES', 1_048_576, 65_536, 67_108_864),
  }
}
