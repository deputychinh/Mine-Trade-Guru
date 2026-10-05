import { loadConfig } from './config.js'
import { startServer } from './startServer.js'

const config = loadConfig()
const running = await startServer(config)

console.info(
  `mine-trade-guru backend on http://localhost:${running.port} ` +
    `(ws: /ws, mode: ${config.sessionMode}, symbols: ${running.simulator.instruments.length}, ` +
    `ticks/s per symbol: ${config.ticksPerSecond})`,
)

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`${signal} received, shutting down`)
  await running.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
