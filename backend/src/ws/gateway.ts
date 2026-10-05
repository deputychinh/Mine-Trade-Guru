import { WebSocket, type RawData, type WebSocketServer } from 'ws'
import type { FrameSource } from '../market/source.js'
import type { Channel, ClientMessage, ServerMessage, WireFrame } from '../market/types.js'

export interface GatewayOptions {
  tickIntervalMs: number
  heartbeatMs: number
  pingMs: number
  /** A client with more than this many unsent bytes is skipped and marked for resync. */
  maxBufferedBytes: number
}

interface ClientState {
  socket: WebSocket
  channels: Set<Channel>
  /** Frames were skipped for this client, or the day rolled: next batch tells it to resync. */
  gap: boolean
  isAlive: boolean
}

const CHANNELS: readonly Channel[] = ['X', 'R', 'MI', 'F']
const MAX_CLIENT_MESSAGE_BYTES = 1_024

function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value)
}

/** Validates an incoming client message; anything unexpected is ignored, never trusted. */
export function parseClientMessage(raw: RawData | string): ClientMessage | null {
  const text = typeof raw === 'string' ? raw : raw.toString()
  if (text.length > MAX_CLIENT_MESSAGE_BYTES) return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const { op, channels } = value as { op?: unknown; channels?: unknown }
  if (op !== 'subscribe' && op !== 'unsubscribe') return null
  if (!Array.isArray(channels) || !channels.every(isChannel)) return null
  return { op, channels }
}

export class MarketGateway {
  private readonly clients = new Set<ClientState>()
  private readonly timers: ReturnType<typeof setInterval>[] = []
  private lastStepAt = 0

  constructor(
    wss: WebSocketServer,
    private readonly source: FrameSource,
    private readonly options: GatewayOptions,
  ) {
    wss.on('connection', (socket) => this.onConnection(socket))
  }

  get clientCount(): number {
    return this.clients.size
  }

  start(): void {
    this.lastStepAt = performance.now()
    this.timers.push(
      setInterval(() => this.tick(), this.options.tickIntervalMs),
      setInterval(() => this.heartbeat(), this.options.heartbeatMs),
      setInterval(() => this.checkAlive(), this.options.pingMs),
    )
  }

  stop(): void {
    for (const timer of this.timers) clearInterval(timer)
    this.timers.length = 0
    for (const client of this.clients) client.socket.close(1001, 'Server shutting down')
    this.clients.clear()
  }

  /** Advances the market and broadcasts one batch. Public for tests. */
  tick(): void {
    const now = performance.now()
    const elapsed = now - this.lastStepAt
    this.lastStepAt = now
    const { frames, dayRolled } = this.source.step(elapsed)
    if (dayRolled) {
      for (const client of this.clients) client.gap = true
    }
    if (frames.length > 0 || dayRolled) this.broadcast(frames)
  }

  private broadcast(frames: WireFrame[]): void {
    const ts = Date.now()
    const framesByKey = new Map<string, WireFrame[]>()
    const payloadByKey = new Map<string, string>()

    for (const client of this.clients) {
      if (client.socket.readyState !== WebSocket.OPEN || client.channels.size === 0) continue

      const channelKey = [...client.channels].sort().join(',')
      let selected = framesByKey.get(channelKey)
      if (!selected) {
        selected = frames.filter((frame) => client.channels.has(frame.ch))
        framesByKey.set(channelKey, selected)
      }
      if (selected.length === 0 && !client.gap) continue

      if (client.socket.bufferedAmount > this.options.maxBufferedBytes) {
        client.gap = true
        continue
      }

      const payloadKey = `${channelKey}|${client.gap ? 'gap' : 'ok'}`
      let payload = payloadByKey.get(payloadKey)
      if (!payload) {
        const message: ServerMessage = { type: 'batch', ts, gap: client.gap, frames: selected }
        payload = JSON.stringify(message)
        payloadByKey.set(payloadKey, payload)
      }
      client.socket.send(payload)
      client.gap = false
    }
  }

  private heartbeat(): void {
    const payload = JSON.stringify({ type: 'hb', ts: Date.now() } satisfies ServerMessage)
    for (const client of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.send(payload)
    }
  }

  private checkAlive(): void {
    for (const client of this.clients) {
      if (!client.isAlive) {
        client.socket.terminate()
        this.clients.delete(client)
        continue
      }
      client.isAlive = false
      client.socket.ping()
    }
  }

  private onConnection(socket: WebSocket): void {
    const client: ClientState = { socket, channels: new Set(), gap: false, isAlive: true }
    this.clients.add(client)
    socket.on('pong', () => {
      client.isAlive = true
    })
    socket.on('message', (raw) => {
      const message = parseClientMessage(raw)
      if (!message) return
      for (const channel of message.channels) {
        if (message.op === 'subscribe') client.channels.add(channel)
        else client.channels.delete(channel)
      }
    })
    socket.on('close', () => this.clients.delete(client))
    socket.on('error', () => this.clients.delete(client))
  }
}
