import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import { createApp, isOriginAllowed } from './app.js'
import type { AppConfig } from './config.js'
import { createRandom } from './lib/random.js'
import { buildCatalogue } from './market/instruments.js'
import { MarketClock } from './market/session.js'
import { MarketSimulator } from './market/simulator.js'
import { MarketGateway } from './ws/gateway.js'

export interface RunningServer {
  port: number
  simulator: MarketSimulator
  gateway: MarketGateway
  close(): Promise<void>
}

/** Composition root: wires catalogue → clock → simulator → REST + WebSocket on one HTTP server. */
export async function startServer(config: AppConfig): Promise<RunningServer> {
  const random = createRandom(config.seed)
  const catalogue = buildCatalogue(config.symbolCount, random)
  const clock = new MarketClock(config.sessionMode, config.sessionSpeed, config.sessionStart)
  const simulator = new MarketSimulator({
    catalogue,
    clock,
    random,
    ticksPerSecond: config.ticksPerSecond,
    tradeHistoryLimit: config.tradeHistoryLimit,
    loopDay: config.sessionLoop,
  })

  const server = http.createServer(createApp(simulator, config.allowedOrigins))
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 16 * 1024,
    perMessageDeflate: { threshold: 1_024 },
    verifyClient: ({ origin }: { origin: string | undefined }) => isOriginAllowed(origin, config.allowedOrigins),
  })
  const gateway = new MarketGateway(wss, simulator, {
    tickIntervalMs: config.tickIntervalMs,
    heartbeatMs: config.heartbeatMs,
    pingMs: config.pingMs,
    maxBufferedBytes: config.maxBufferedBytes,
  })

  await new Promise<void>((resolve) => server.listen(config.port, resolve))
  gateway.start()

  return {
    port: (server.address() as AddressInfo).port,
    simulator,
    gateway,
    close: () =>
      new Promise<void>((resolve, reject) => {
        gateway.stop()
        wss.close()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
