import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocketHandlers } from '@/api/marketSocket'
import { FLUSH_INTERVAL_MS, METRICS_INTERVAL_MS, OFFLINE_AFTER_ATTEMPTS, SOCKET_IDLE_TIMEOUT_MS } from '@/constants/feed'
import type { WorkerOutbound } from '@/interfaces/worker'
import { FeedController } from '@/workers/feedController'
import { FeedEngine } from '@/workers/feedEngine'
import { makeQuote, makeSnapshot } from '../../helpers/fixtures'

interface FakeSocket {
  handlers: SocketHandlers
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

function setup() {
  const sockets: FakeSocket[] = []
  const posted: WorkerOutbound[] = []
  const controller = new FeedController({
    engine: new FeedEngine(() => 0, 100),
    post: (message) => posted.push(message),
    random: () => 0,
    createSocket: (_url, handlers) => {
      const socket = { handlers, send: vi.fn(), close: vi.fn() }
      sockets.push(socket)
      return socket
    },
  })
  const last = () => sockets[sockets.length - 1] as FakeSocket
  const ofType = <T extends WorkerOutbound['type']>(type: T) =>
    posted.filter((message): message is Extract<WorkerOutbound, { type: T }> => message.type === type)
  return { controller, sockets, posted, last, ofType }
}

function batch(v: number): string {
  return JSON.stringify({ type: 'batch', ts: 0, gap: false, frames: [{ ch: 'X', data: { symbol: 'FPT', v, lastPrice: 100_000 + v } }] })
}

beforeEach(() => {
  vi.useFakeTimers()
})

describe('FeedController', () => {
  it('connects, subscribes and asks for the first snapshot', () => {
    const { controller, last, ofType } = setup()
    controller.handle({ type: 'connect', url: 'ws://test/ws' })
    expect(ofType('status').at(-1)?.status).toBe('connecting')

    last().handlers.onOpen()
    expect(ofType('status').at(-1)?.status).toBe('open')
    expect(last().send).toHaveBeenCalledWith({ op: 'subscribe', channels: ['X', 'R', 'MI', 'F'] })
    expect(ofType('needSnapshot')).toEqual([{ type: 'needSnapshot', reason: 'initial' }])
  })

  it('posts one patch per flush interval once the snapshot is in, and holds it while paused', () => {
    const { controller, last, ofType } = setup()
    controller.handle({ type: 'connect', url: 'ws://test/ws' })
    last().handlers.onOpen()
    controller.handle({ type: 'snapshot', snapshot: makeSnapshot([makeQuote({ v: 1 })]) })

    last().handlers.onMessage(batch(2), 100)
    last().handlers.onMessage(batch(3), 100)
    vi.advanceTimersByTime(FLUSH_INTERVAL_MS)
    expect(ofType('patch')).toHaveLength(1)
    expect(ofType('patch')[0]?.patch.quotes[0]?.v).toBe(3)

    controller.handle({ type: 'pause', isPaused: true })
    last().handlers.onMessage(batch(4), 100)
    vi.advanceTimersByTime(FLUSH_INTERVAL_MS * 3)
    expect(ofType('patch')).toHaveLength(1)

    controller.handle({ type: 'pause', isPaused: false })
    expect(ofType('patch')).toHaveLength(2)
  })

  it('reconnects with backoff, goes offline after repeated failures, and resyncs on return', () => {
    const { controller, sockets, last, ofType } = setup()
    controller.handle({ type: 'connect', url: 'ws://test/ws' })
    last().handlers.onOpen()

    for (let i = 0; i < OFFLINE_AFTER_ATTEMPTS; i++) {
      last().handlers.onClose({ code: 1006, wasClean: false })
      vi.advanceTimersByTime(60_000)
    }
    const statuses = ofType('status').map((message) => message.status)
    expect(statuses).toContain('reconnecting')
    expect(statuses).toContain('offline')
    expect(sockets).toHaveLength(OFFLINE_AFTER_ATTEMPTS + 1)

    last().handlers.onOpen()
    expect(ofType('needSnapshot').at(-1)?.reason).toBe('reconnect')
  })

  it('closes a silent connection after the idle timeout', () => {
    const { controller, last } = setup()
    controller.handle({ type: 'connect', url: 'ws://test/ws' })
    last().handlers.onOpen()
    vi.advanceTimersByTime(SOCKET_IDLE_TIMEOUT_MS)
    expect(last().close).toHaveBeenCalledWith(4_000, 'idle timeout')
  })

  it('reports dropped garbage in metrics and stops cleanly', () => {
    const { controller, last, ofType } = setup()
    controller.handle({ type: 'connect', url: 'ws://test/ws' })
    last().handlers.onOpen()
    last().handlers.onMessage('{not json', 9)
    vi.advanceTimersByTime(METRICS_INTERVAL_MS)
    expect(ofType('metrics').at(-1)?.metrics.droppedFrames).toBe(1)

    const socket = last()
    controller.handle({ type: 'disconnect' })
    expect(socket.close).toHaveBeenCalledWith(1_000, 'client disconnect')
    expect(ofType('status').at(-1)?.status).toBe('idle')
    socket.handlers.onClose({ code: 1000, wasClean: true })
    vi.advanceTimersByTime(60_000)
    expect(ofType('status').at(-1)?.status).toBe('idle')
  })
})
