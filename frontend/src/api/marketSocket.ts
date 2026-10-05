import { WS_PATH } from '@/constants/feed'
import type { ClientMessage } from '@/interfaces/websocket'

// Raw WebSocket transport: connect / send / receive text / close. No reconnect policy,
// no parsing, no Vue — the worker's FeedController owns all of that (plan §6).

export interface SocketHandlers {
  onOpen(): void
  onMessage(data: string, byteLength: number): void
  onClose(event: { code: number; wasClean: boolean }): void
  onError(): void
}

export interface MarketSocketLike {
  send(message: ClientMessage): void
  close(code?: number, reason?: string): void
}

export type SocketFactory = (url: string, handlers: SocketHandlers) => MarketSocketLike

export const createMarketSocket: SocketFactory = (url, handlers) => {
  const socket = new WebSocket(url)
  socket.addEventListener('open', () => handlers.onOpen())
  socket.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (typeof event.data === 'string') handlers.onMessage(event.data, event.data.length)
  })
  socket.addEventListener('close', (event) => handlers.onClose({ code: event.code, wasClean: event.wasClean }))
  socket.addEventListener('error', () => handlers.onError())

  return {
    send(message) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    },
    close(code = 1000, reason) {
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        socket.close(code, reason)
      }
    },
  }
}

/** Explicit override (env) or same origin: ws(s)://<host>/ws behind the dev proxy / nginx. */
export function resolveWsUrl(override: string, location: Pick<Location, 'protocol' | 'host'>): string {
  if (override !== '') return override
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}${WS_PATH}`
}
