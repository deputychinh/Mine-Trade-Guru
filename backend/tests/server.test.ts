import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { loadConfig } from '../src/config.js'
import { RingBuffer } from '../src/lib/ringBuffer.js'
import type { ServerMessage, Snapshot } from '../src/market/types.js'
import { startServer, type RunningServer } from '../src/startServer.js'
import { parseClientMessage } from '../src/ws/gateway.js'

const ORIGIN = 'http://localhost:5173'
let running: RunningServer
let baseUrl: string

beforeAll(async () => {
  running = await startServer(
    loadConfig({ PORT: '0', SESSION_MODE: 'always-open', TICKS_PER_SECOND: '5', ALLOWED_ORIGINS: ORIGIN }),
  )
  baseUrl = `http://localhost:${running.port}`
})

afterAll(async () => {
  await running.close()
})

function collectBatches(channels: string[], durationMs: number): Promise<ServerMessage[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${running.port}/ws`, { origin: ORIGIN })
    const messages: ServerMessage[] = []
    socket.on('open', () => {
      if (channels.length > 0) socket.send(JSON.stringify({ op: 'subscribe', channels }))
    })
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as ServerMessage))
    socket.on('error', reject)
    setTimeout(() => {
      socket.close()
      resolve(messages)
    }, durationMs)
  })
}

describe('REST API', () => {
  it('serves health, instruments and a consistent snapshot', async () => {
    expect(await (await fetch(`${baseUrl}/health`)).json()).toEqual({ status: 'ok' })

    const instruments = (await (await fetch(`${baseUrl}/api/instruments`)).json()) as unknown[]
    expect(instruments.length).toBeGreaterThan(100)

    const snapshot = (await (await fetch(`${baseUrl}/api/snapshot`)).json()) as Snapshot
    expect(snapshot.quotes).toHaveLength(instruments.length)
    expect(snapshot.indices.map((index) => index.code).sort()).toEqual(
      ['HNX30', 'HNXINDEX', 'UPCOMINDEX', 'VN30', 'VNINDEX'].sort(),
    )
    expect(snapshot.sessions).toHaveLength(4)
  })

  it('returns 404 JSON for unknown symbols, indices and routes', async () => {
    for (const path of ['/api/quotes/NOPE/trades', '/api/indices/XYZ/history', '/api/unknown']) {
      const response = await fetch(`${baseUrl}${path}`)
      expect(response.status).toBe(404)
      expect(await response.json()).toHaveProperty('error')
    }
  })

  it('caps the trade limit', async () => {
    const response = await fetch(`${baseUrl}/api/quotes/FPT/trades?limit=999999`)
    expect(response.status).toBe(200)
    expect(((await response.json()) as unknown[]).length).toBeLessThanOrEqual(1_000)
  })
})

describe('WebSocket gateway', () => {
  it('streams batches only for subscribed channels', async () => {
    const messages = await collectBatches(['MI'], 2_500)
    const batches = messages.filter((message) => message.type === 'batch')
    expect(batches.length).toBeGreaterThan(0)
    for (const batch of batches) {
      if (batch.type !== 'batch') continue
      expect(batch.frames.every((frame) => frame.ch === 'MI')).toBe(true)
    }
  })

  it('sends nothing but heartbeats before a subscribe', async () => {
    const messages = await collectBatches([], 1_000)
    expect(messages.every((message) => message.type === 'hb')).toBe(true)
  })

  it('rejects upgrades from origins that are not allowed', async () => {
    const error = await new Promise<Error>((resolve) => {
      const socket = new WebSocket(`ws://localhost:${running.port}/ws`, { origin: 'http://evil.example' })
      socket.on('error', resolve)
    })
    expect(error.message).toContain('401')
  })
})

describe('parseClientMessage', () => {
  it('accepts valid subscribe/unsubscribe messages', () => {
    expect(parseClientMessage('{"op":"subscribe","channels":["X","MI"]}')).toEqual({
      op: 'subscribe',
      channels: ['X', 'MI'],
    })
  })

  it.each([
    'not json',
    '{"op":"drop-tables","channels":["X"]}',
    '{"op":"subscribe","channels":["Z"]}',
    '{"op":"subscribe","channels":"X"}',
    `{"op":"subscribe","channels":["X"],"pad":"${'x'.repeat(2_000)}"}`,
  ])('rejects %s', (raw) => {
    expect(parseClientMessage(raw)).toBeNull()
  })
})

describe('loadConfig', () => {
  it('uses safe defaults', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({ port: 8080, sessionMode: 'simulated', sessionStart: '09:13', symbolCount: 0 })
  })

  it('fails fast on invalid values', () => {
    expect(() => loadConfig({ SESSION_MODE: 'turbo' })).toThrow(/SESSION_MODE/)
    expect(() => loadConfig({ TICKS_PER_SECOND: '-1' })).toThrow(/TICKS_PER_SECOND/)
    expect(() => loadConfig({ SESSION_START: '9am' })).toThrow(/SESSION_START/)
  })
})

describe('RingBuffer', () => {
  it('keeps only the newest items up to capacity', () => {
    const buffer = new RingBuffer<number>(3)
    for (let i = 1; i <= 5; i++) buffer.push(i)
    expect(buffer.toArray()).toEqual([3, 4, 5])
    expect(buffer.last()).toBe(5)
    buffer.replaceLast(50)
    expect(buffer.toArray()).toEqual([3, 4, 50])
    buffer.clear()
    expect(buffer.size).toBe(0)
  })
})
