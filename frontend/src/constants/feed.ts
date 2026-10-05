import type { Channel } from '@/interfaces/websocket'

/** The board needs every quote (breadth, movers, heatmap), so all channels for all symbols. */
export const FEED_CHANNELS: readonly Channel[] = ['X', 'R', 'MI', 'F']

/** Worker → main patch cadence. Worst case adds this much to tick-to-paint (NFR-P1). */
export const FLUSH_INTERVAL_MS = 50

export const METRICS_INTERVAL_MS = 1_000

/** Exponential backoff with jitter, 1 s → 30 s (NFR-R1). */
export const RECONNECT_BASE_MS = 1_000
export const RECONNECT_MAX_MS = 30_000
/** After this many failed attempts the indicator says "offline" (it keeps retrying). */
export const OFFLINE_AFTER_ATTEMPTS = 3

/** No batch or heartbeat for this long = dead connection; force a reconnect. Server heartbeats every 5 s. */
export const SOCKET_IDLE_TIMEOUT_MS = 15_000

/** No quote tick for this long while a session is open = show the stale-data warning (NFR-R3). */
export const STALE_DATA_MS = 10_000

export const SNAPSHOT_RETRY_MS = 2_000

/** Frames kept while waiting for a snapshot; beyond this the buffer is dropped and a fresh snapshot is used. */
export const MAX_BUFFERED_FRAMES = 50_000

export const WS_PATH = '/ws'
