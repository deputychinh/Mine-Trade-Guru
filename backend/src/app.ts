import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { isIndexCode } from './market/simulator.js'
import type { MarketDataSource } from './market/source.js'

const DEFAULT_TRADE_LIMIT = 500
const MAX_TRADE_LIMIT = 1_000
const SYMBOL_PATTERN = /^[A-Z0-9]{2,10}$/

export function isOriginAllowed(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (allowedOrigins.includes('*')) return true
  return origin === undefined || allowedOrigins.includes(origin)
}

function parseLimit(raw: unknown): number {
  if (typeof raw !== 'string' || raw === '') return DEFAULT_TRADE_LIMIT
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) return DEFAULT_TRADE_LIMIT
  return Math.min(value, MAX_TRADE_LIMIT)
}

function readSymbol(req: Request, source: MarketDataSource): string | null {
  const symbol = String(req.params.symbol ?? '').toUpperCase()
  return SYMBOL_PATTERN.test(symbol) && source.hasSymbol(symbol) ? symbol : null
}

export function createApp(source: MarketDataSource, allowedOrigins: readonly string[]): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isOriginAllowed(origin, allowedOrigins)),
    }),
  )

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const api = express.Router()

  api.get('/instruments', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300')
    res.json(source.instruments)
  })

  api.get('/snapshot', (_req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json(source.getSnapshot())
  })

  api.get('/quotes/:symbol/trades', (req, res) => {
    const symbol = readSymbol(req, source)
    if (!symbol) {
      res.status(404).json({ error: 'Unknown symbol' })
      return
    }
    res.json(source.getTrades(symbol, parseLimit(req.query.limit)))
  })

  api.get('/quotes/:symbol/bars', (req, res) => {
    const symbol = readSymbol(req, source)
    if (!symbol) {
      res.status(404).json({ error: 'Unknown symbol' })
      return
    }
    res.json(source.getBars(symbol))
  })

  api.get('/quotes/:symbol/volume-by-price', (req, res) => {
    const symbol = readSymbol(req, source)
    if (!symbol) {
      res.status(404).json({ error: 'Unknown symbol' })
      return
    }
    res.json(source.getVolumeByPrice(symbol))
  })

  api.get('/indices/:code/history', (req, res) => {
    const code = String(req.params.code ?? '').toUpperCase()
    if (!isIndexCode(code)) {
      res.status(404).json({ error: 'Unknown index' })
      return
    }
    res.json(source.getIndexHistory(code))
  })

  app.use('/api', api)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }
    console.error('Unhandled request error', error)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
