import { RingBuffer } from '../lib/ringBuffer.js'
import { pickWeighted, randomExp, randomInt, type RandomFn } from '../lib/random.js'
import { INDEX_REFERENCE, type Catalogue } from './instruments.js'
import {
  clamp,
  contractMultiplier,
  cwPriceLimits,
  lotSize,
  priceLimits,
  roundToStep,
  sessionMarketOf,
  stepPrice,
  type PriceLimits,
} from './rules.js'
import {
  DAY_ROLL_MINUTE,
  SESSION_MARKETS,
  TRADING_PHASES,
  sessionStateAt,
  vnDayStart,
  vnMinuteOfDay,
  type MarketClock,
} from './session.js'
import type { MarketDataSource, StepResult } from './source.js'
import type {
  Bar,
  IndexCode,
  IndexPoint,
  IndexQuote,
  Instrument,
  PriceLevel,
  Quote,
  QuoteDelta,
  SessionMarket,
  SessionPhase,
  SessionState,
  Snapshot,
  Trade,
  TradeSide,
  VolumeAtPrice,
  WireFrame,
} from './types.js'

export interface SimulatorOptions {
  catalogue: Catalogue
  clock: MarketClock
  random: RandomFn
  /** Average updates per symbol per second while its market is trading. */
  ticksPerSecond: number
  tradeHistoryLimit: number
  barHistoryLimit?: number
  indexIntervalMs?: number
  /** Simulated mode: roll to the next trading day after the close. */
  loopDay: boolean
}

interface SymbolState {
  instrument: Instrument
  market: SessionMarket
  quote: Quote
  trades: RingBuffer<Trade>
  bars: RingBuffer<Bar>
  /** Bounded by the number of ticks inside the daily band. */
  volumeByPrice: Map<number, VolumeAtPrice>
  avgLots: number
  auctionLots: number
  /** Daily bias in [-1, 1]; a few symbols drift towards ceiling or floor. */
  trend: number
}

interface IndexState {
  quote: IndexQuote
  constituents: SymbolState[]
  referenceCap: number
  history: RingBuffer<IndexPoint>
}

const BOOK_DEPTH = 3
const TRADE_PROBABILITY = 0.7
const FOREIGN_PROBABILITY = 0.25
const MOVE_STEPS: ReadonlyArray<readonly [number, number]> = [
  [0, 30],
  [1, 45],
  [2, 20],
  [3, 5],
]
const FUTURES_STEP_SCALE = 5
const MINUTE_MS = 60_000
const DEFAULT_BAR_LIMIT = 400
const INDEX_HISTORY_LIMIT = 400
const DEFAULT_INDEX_INTERVAL_MS = 1_000
/** Minutes of the Vietnam day used to backfill index history (09:00, lunch 11:30–13:00, 15:00). */
const BACKFILL_MINUTES = { open: 9 * 60, lunchStart: 11 * 60 + 30, lunchEnd: 13 * 60, close: 15 * 60 } as const
/** Per-minute index move, as a fraction of the reference, for the backfilled path. */
const BACKFILL_STEP = 0.0012
/** Average shares per constituent per backfilled minute. */
const BACKFILL_SHARES_PER_SYMBOL = 1_500
const INDEX_CODES = Object.keys(INDEX_REFERENCE) as IndexCode[]

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function priceDecimals(instrument: Instrument): number {
  return instrument.type === 'FUTURES' ? 1 : 0
}

function levelsEqual(a: readonly PriceLevel[], b: readonly PriceLevel[]): boolean {
  if (a.length !== b.length) return false
  return a.every((level, i) => level.price === b[i]?.price && level.volume === b[i]?.volume)
}

/** Only the fields that changed, plus symbol and version. */
export function diffQuote(previous: Quote, next: Quote): QuoteDelta {
  const delta: QuoteDelta = { symbol: next.symbol, v: next.v }
  for (const key of Object.keys(next) as Array<keyof Quote>) {
    if (key === 'symbol' || key === 'v') continue
    const before = previous[key]
    const after = next[key]
    const changed =
      Array.isArray(before) && Array.isArray(after) ? !levelsEqual(before, after) : before !== after
    if (changed) Object.assign(delta, { [key]: after })
  }
  return delta
}

export function isIndexCode(value: string): value is IndexCode {
  return (INDEX_CODES as string[]).includes(value)
}

function blankQuote(symbol: string, reference: number, now: number): Quote {
  return {
    symbol,
    v: 0,
    reference,
    ceiling: reference,
    floor: reference,
    open: null,
    high: null,
    low: null,
    average: null,
    lastPrice: null,
    lastVolume: null,
    lastTradeId: null,
    lastTradeTime: null,
    lastSide: null,
    change: null,
    changePercent: null,
    totalVolume: 0,
    totalValue: 0,
    bids: [],
    asks: [],
    foreignBuyVolume: 0,
    foreignSellVolume: 0,
    foreignRoom: 0,
    updatedAt: now,
  }
}

export class MarketSimulator implements MarketDataSource {
  readonly instruments: Instrument[]
  private readonly symbols = new Map<string, SymbolState>()
  private readonly indices = new Map<IndexCode, IndexState>()
  private readonly sessions = new Map<SessionMarket, SessionState>()
  private readonly random: RandomFn
  private readonly clock: MarketClock
  private readonly indexIntervalMs: number
  private tradeSeq = 0
  private sinceIndexMs = 0
  private tradingDay: number

  constructor(private readonly options: SimulatorOptions) {
    this.random = options.random
    this.clock = options.clock
    this.indexIntervalMs = options.indexIntervalMs ?? DEFAULT_INDEX_INTERVAL_MS
    this.instruments = options.catalogue.instruments

    const now = this.clock.now()
    for (const instrument of this.instruments) {
      const reference = options.catalogue.basePrices.get(instrument.symbol)
      if (reference === undefined) throw new Error(`Missing base price for ${instrument.symbol}`)
      this.symbols.set(instrument.symbol, {
        instrument,
        market: sessionMarketOf(instrument),
        quote: blankQuote(instrument.symbol, reference, now),
        trades: new RingBuffer<Trade>(options.tradeHistoryLimit),
        bars: new RingBuffer<Bar>(options.barHistoryLimit ?? DEFAULT_BAR_LIMIT),
        volumeByPrice: new Map(),
        avgLots: this.averageLots(instrument),
        auctionLots: 0,
        trend: 0,
      })
    }

    this.openDay(options.catalogue.basePrices, now)
    this.buildIndices(now)
    this.tradingDay = vnDayStart(now)
    this.resetSessions(now)
  }

  // ---- public API --------------------------------------------------------

  step(elapsedMs: number): StepResult {
    const now = this.clock.now()
    if (this.shouldRollDay(now)) {
      this.rollDay()
      return { frames: [], dayRolled: true }
    }

    const frames: WireFrame[] = []
    for (const { market, previous } of this.updateSessions(now, frames)) {
      if (previous === 'ATO' || previous === 'ATC') this.runAuction(market, now, frames)
    }

    const probability = Math.min(1, (this.options.ticksPerSecond * elapsedMs) / 1_000)
    for (const state of this.symbols.values()) {
      const phase = this.sessions.get(state.market)?.phase
      if (phase === undefined || !TRADING_PHASES.has(phase)) continue
      if (this.random() >= probability) continue
      if (phase === 'CONTINUOUS' && this.random() < TRADE_PROBABILITY) {
        this.trade(state, now, frames)
      } else {
        this.updateBook(state, now, frames, phase !== 'CONTINUOUS')
      }
    }

    this.sinceIndexMs += elapsedMs
    if (this.sinceIndexMs >= this.indexIntervalMs) {
      this.sinceIndexMs = 0
      for (const index of this.indices.values()) {
        if (this.computeIndex(index, now)) frames.push({ ch: 'MI', data: index.quote })
      }
    }

    return { frames, dayRolled: false }
  }

  getSnapshot(): Snapshot {
    const now = this.clock.now()
    return {
      serverTime: Date.now(),
      quotes: [...this.symbols.values()].map((state) => state.quote),
      indices: [...this.indices.values()].map((index) => index.quote),
      sessions: SESSION_MARKETS.map((market) => ({
        ...(this.sessions.get(market) ?? sessionStateAt(market, this.clock.mode, now, this.clock.speed)),
        marketTime: now,
      })),
    }
  }

  hasSymbol(symbol: string): boolean {
    return this.symbols.has(symbol)
  }

  /** Newest first. */
  getTrades(symbol: string, limit: number): Trade[] {
    const state = this.symbols.get(symbol)
    if (!state) return []
    return state.trades.toArray().slice(-limit).reverse()
  }

  getBars(symbol: string): Bar[] {
    return this.symbols.get(symbol)?.bars.toArray() ?? []
  }

  /** Highest price first. */
  getVolumeByPrice(symbol: string): VolumeAtPrice[] {
    const state = this.symbols.get(symbol)
    if (!state) return []
    return [...state.volumeByPrice.values()].sort((a, b) => b.price - a.price)
  }

  getIndexHistory(code: IndexCode): IndexPoint[] {
    return this.indices.get(code)?.history.toArray() ?? []
  }

  // ---- trading day -------------------------------------------------------

  private openDay(references: ReadonlyMap<string, number>, now: number): void {
    const limits = new Map<string, PriceLimits>()
    // Covered warrants last: their band depends on the underlying's band.
    const ordered = [...this.symbols.values()].sort(
      (a, b) => Number(a.instrument.type === 'CW') - Number(b.instrument.type === 'CW'),
    )
    for (const state of ordered) {
      const { instrument } = state
      const reference = references.get(instrument.symbol) ?? state.quote.reference
      const bounds = this.limitsFor(instrument, reference, references, limits)
      limits.set(instrument.symbol, bounds)
      state.trend = (this.random() * 2 - 1) ** 3
      state.auctionLots = 0
      state.trades.clear()
      state.bars.clear()
      state.volumeByPrice.clear()
      state.quote = this.openingQuote(state, reference, bounds, now)
    }
  }

  private limitsFor(
    instrument: Instrument,
    reference: number,
    references: ReadonlyMap<string, number>,
    known: ReadonlyMap<string, PriceLimits>,
  ): PriceLimits {
    if (instrument.type !== 'CW') return priceLimits(instrument, reference)
    const underlying = instrument.underlying ?? ''
    const underlyingLimits = known.get(underlying)
    const underlyingReference = references.get(underlying) ?? this.symbols.get(underlying)?.quote.reference
    if (!underlyingLimits || underlyingReference === undefined || !instrument.conversionRatio) {
      throw new Error(`Covered warrant ${instrument.symbol} has no valid underlying ${underlying}`)
    }
    return cwPriceLimits(reference, underlyingReference, underlyingLimits, instrument.conversionRatio)
  }

  private openingQuote(state: SymbolState, reference: number, bounds: PriceLimits, now: number): Quote {
    const previous = state.quote
    const { instrument } = state
    return {
      ...blankQuote(instrument.symbol, reference, now),
      v: previous.v + 1,
      ceiling: bounds.ceiling,
      floor: bounds.floor,
      bids: this.buildLevels(state, stepPrice(instrument, reference, -1), -1, bounds),
      asks: this.buildLevels(state, stepPrice(instrument, reference, 1), 1, bounds),
      foreignRoom: previous.v > 0 ? previous.foreignRoom : this.initialForeignRoom(instrument),
    }
  }

  private shouldRollDay(now: number): boolean {
    if (this.clock.mode === 'simulated') {
      return this.options.loopDay && vnMinuteOfDay(now) >= DAY_ROLL_MINUTE
    }
    if (this.clock.mode === 'live') return vnDayStart(now) !== this.tradingDay
    return false
  }

  private rollDay(): void {
    const references = new Map(
      [...this.symbols].map(([symbol, state]) => [symbol, state.quote.lastPrice ?? state.quote.reference]),
    )
    this.clock.restartDay()
    const now = this.clock.now()
    this.openDay(references, now)
    for (const index of this.indices.values()) {
      const reference = index.quote.value
      index.referenceCap = this.capitalisation(index.constituents, 'reference')
      index.quote = { ...index.quote, v: index.quote.v + 1, reference, value: reference, change: 0, changePercent: 0 }
      index.history.clear()
      this.computeIndex(index, now)
    }
    this.tradingDay = vnDayStart(now)
    this.sinceIndexMs = 0
    this.resetSessions(now)
  }

  private resetSessions(now: number): void {
    this.sessions.clear()
    for (const market of SESSION_MARKETS) {
      this.sessions.set(market, sessionStateAt(market, this.clock.mode, now, this.clock.speed))
    }
  }

  private updateSessions(
    now: number,
    frames: WireFrame[],
  ): Array<{ market: SessionMarket; previous: SessionPhase | null }> {
    const changes: Array<{ market: SessionMarket; previous: SessionPhase | null }> = []
    for (const market of SESSION_MARKETS) {
      const next = sessionStateAt(market, this.clock.mode, now, this.clock.speed)
      const previous = this.sessions.get(market)
      if (previous?.phase === next.phase) continue
      this.sessions.set(market, next)
      frames.push({ ch: 'F', data: next })
      changes.push({ market, previous: previous?.phase ?? null })
    }
    return changes
  }

  // ---- order flow --------------------------------------------------------

  private trade(state: SymbolState, now: number, frames: WireFrame[]): void {
    const price = this.nextTradePrice(state)
    const volume = this.randomVolume(state, 1)
    this.recordTrade(state, price, volume, this.tradeSide(state.quote, price), now, frames)
  }

  /** ATO/ATC end: one matched price for the accumulated auction volume. */
  private runAuction(market: SessionMarket, now: number, frames: WireFrame[]): void {
    for (const state of this.symbols.values()) {
      if (state.market !== market) continue
      const lots = Math.max(state.auctionLots, randomExp(this.random, state.avgLots * 4))
      state.auctionLots = 0
      this.recordTrade(state, this.nextTradePrice(state), lots * lotSize(state.instrument.type), 'U', now, frames)
    }
  }

  private recordTrade(
    state: SymbolState,
    price: number,
    volume: number,
    side: TradeSide,
    now: number,
    frames: WireFrame[],
  ): void {
    const { instrument } = state
    const previous = state.quote
    const multiplier = contractMultiplier(instrument.type)
    const decimals = priceDecimals(instrument)
    const totalVolume = previous.totalVolume + volume
    const totalValue = previous.totalValue + price * volume * multiplier
    const id = ++this.tradeSeq

    this.commit(
      state,
      {
        ...previous,
        v: previous.v + 1,
        open: previous.open ?? price,
        high: previous.high === null ? price : Math.max(previous.high, price),
        low: previous.low === null ? price : Math.min(previous.low, price),
        average: roundToStep(totalValue / multiplier / totalVolume, decimals === 1 ? 0.1 : 1),
        lastPrice: price,
        lastVolume: volume,
        lastTradeId: id,
        lastTradeTime: now,
        lastSide: side,
        change: Number((price - previous.reference).toFixed(decimals)),
        changePercent: round2(((price - previous.reference) / previous.reference) * 100),
        totalVolume,
        totalValue,
        ...this.bookAround(state, price, side),
        updatedAt: now,
      },
      frames,
    )

    state.trades.push({ id, symbol: instrument.symbol, time: now, price, volume, side })
    this.updateBar(state, price, volume, now)
    this.addVolumeAtPrice(state, price, volume, side)

    const foreignEligible = instrument.type === 'STOCK' || instrument.type === 'ETF'
    if (foreignEligible && this.random() < FOREIGN_PROBABILITY) {
      this.foreignTrade(state, volume, now, frames)
    }
  }

  private updateBook(state: SymbolState, now: number, frames: WireFrame[], isAuction: boolean): void {
    const previous = state.quote
    const isBid = this.random() < 0.5
    const levels = (isBid ? previous.bids : previous.asks).map((level) => ({ ...level }))
    const level = levels[randomInt(this.random, 0, BOOK_DEPTH - 1)]
    if (!level || level.price === null) return
    level.volume = this.randomVolume(state, 1.5)
    if (isAuction) state.auctionLots += randomExp(this.random, state.avgLots)
    const next: Quote = isBid
      ? { ...previous, v: previous.v + 1, bids: levels, updatedAt: now }
      : { ...previous, v: previous.v + 1, asks: levels, updatedAt: now }
    this.commit(state, next, frames)
  }

  private foreignTrade(state: SymbolState, volume: number, now: number, frames: WireFrame[]): void {
    const previous = state.quote
    const lot = lotSize(state.instrument.type)
    const amount = Math.max(lot, roundToStep(volume * (0.2 + this.random() * 0.6), lot))
    const isBuy = this.random() < 0.5
    const bought = isBuy ? Math.min(amount, previous.foreignRoom) : 0
    if (isBuy && bought === 0) return

    const next: Quote = {
      ...previous,
      v: previous.v + 1,
      foreignBuyVolume: previous.foreignBuyVolume + bought,
      foreignSellVolume: previous.foreignSellVolume + (isBuy ? 0 : amount),
      foreignRoom: isBuy ? previous.foreignRoom - bought : previous.foreignRoom + amount,
      updatedAt: now,
    }
    state.quote = next
    frames.push({
      ch: 'R',
      data: {
        symbol: next.symbol,
        v: next.v,
        foreignBuyVolume: next.foreignBuyVolume,
        foreignSellVolume: next.foreignSellVolume,
        foreignRoom: next.foreignRoom,
        updatedAt: now,
      },
    })
  }

  private commit(state: SymbolState, next: Quote, frames: WireFrame[]): void {
    const delta = diffQuote(state.quote, next)
    state.quote = next
    frames.push({ ch: 'X', data: delta })
  }

  private updateBar(state: SymbolState, price: number, volume: number, now: number): void {
    const time = Math.floor(now / MINUTE_MS) * MINUTE_MS
    const last = state.bars.last()
    if (last && last.time === time) {
      state.bars.replaceLast({
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume + volume,
      })
      return
    }
    state.bars.push({ time, open: price, high: price, low: price, close: price, volume })
  }

  private addVolumeAtPrice(state: SymbolState, price: number, volume: number, side: TradeSide): void {
    const entry = state.volumeByPrice.get(price) ?? { price, volume: 0, buyVolume: 0, sellVolume: 0 }
    state.volumeByPrice.set(price, {
      price,
      volume: entry.volume + volume,
      buyVolume: entry.buyVolume + (side === 'B' ? volume : 0),
      sellVolume: entry.sellVolume + (side === 'S' ? volume : 0),
    })
  }

  // ---- pricing -----------------------------------------------------------

  /** Where a symbol's price is pulled towards: its trend target, the VN30 index, or the CW underlying. */
  private anchorPrice(state: SymbolState): number {
    const { instrument, quote } = state
    if (instrument.type === 'FUTURES') {
      const vn30 = this.indices.get('VN30')?.quote
      if (vn30) return (quote.reference * vn30.value) / vn30.reference
    }
    if (instrument.type === 'CW' && instrument.underlying && instrument.conversionRatio) {
      const underlying = this.symbols.get(instrument.underlying)?.quote
      if (underlying) {
        const underlyingMove = (underlying.lastPrice ?? underlying.reference) - underlying.reference
        return quote.reference + underlyingMove / instrument.conversionRatio
      }
    }
    const room = state.trend >= 0 ? quote.ceiling - quote.reference : quote.reference - quote.floor
    return quote.reference + state.trend * room * 0.95
  }

  private nextTradePrice(state: SymbolState): number {
    const { instrument, quote } = state
    const current = quote.lastPrice ?? quote.reference
    const anchor = this.anchorPrice(state)
    const range = Math.max(quote.ceiling - quote.floor, Number.EPSILON)
    const drift = (current - anchor) / range
    const upProbability = clamp(0.5 - drift * 2.5, 0.15, 0.85)
    const direction = this.random() < upProbability ? 1 : -1
    const scale = instrument.type === 'FUTURES' ? FUTURES_STEP_SCALE : 1
    const steps = pickWeighted(this.random, MOVE_STEPS) * scale
    return clamp(stepPrice(instrument, current, direction * steps), quote.floor, quote.ceiling)
  }

  private tradeSide(quote: Quote, price: number): TradeSide {
    const bestAsk = quote.asks[0]?.price ?? null
    const bestBid = quote.bids[0]?.price ?? null
    if (bestAsk !== null && price >= bestAsk) return 'B'
    if (bestBid !== null && price <= bestBid) return 'S'
    return this.random() < 0.5 ? 'B' : 'S'
  }

  /** After a trade the matched price sits on the side that was not the aggressor. */
  private bookAround(state: SymbolState, price: number, side: TradeSide): Pick<Quote, 'bids' | 'asks'> {
    const { instrument, quote } = state
    const bounds = { ceiling: quote.ceiling, floor: quote.floor }
    const bestBid = side === 'S' ? price : stepPrice(instrument, price, -1)
    const bestAsk = side === 'B' ? price : stepPrice(instrument, price, 1)
    return {
      bids: this.buildLevels(state, bestBid, -1, bounds),
      asks: this.buildLevels(state, bestAsk, 1, bounds),
    }
  }

  private buildLevels(state: SymbolState, start: number, direction: 1 | -1, bounds: PriceLimits): PriceLevel[] {
    const levels: PriceLevel[] = []
    let price: number | null = start
    for (let i = 0; i < BOOK_DEPTH; i++) {
      if (price === null || price > bounds.ceiling || price < bounds.floor) {
        levels.push({ price: null, volume: 0 })
        price = null
        continue
      }
      levels.push({ price, volume: this.randomVolume(state, 1.5) })
      price = stepPrice(state.instrument, price, direction)
    }
    return levels
  }

  private randomVolume(state: SymbolState, factor: number): number {
    return randomExp(this.random, state.avgLots * factor) * lotSize(state.instrument.type)
  }

  private averageLots(instrument: Instrument): number {
    switch (instrument.type) {
      case 'FUTURES':
        return 12
      case 'CW':
        return 40
      case 'ETF':
        return 25
      case 'STOCK':
        return Math.max(5, Math.round(instrument.sharesOutstanding / 50_000_000))
    }
  }

  private initialForeignRoom(instrument: Instrument): number {
    if (instrument.type === 'CW' || instrument.type === 'FUTURES') return 0
    const ownershipCap = instrument.sector === 'BANKING' ? 0.3 : 0.49
    const used = 0.3 + this.random() * 0.65
    return roundToStep(instrument.sharesOutstanding * ownershipCap * (1 - used), 100)
  }

  // ---- indices -----------------------------------------------------------

  /**
   * The simulator starts with an empty day, so the intraday index charts would only show the
   * minutes since boot. Fill the session so far (09:00 → now) with a random path that ends at
   * the current value, flat with no volume over lunch, and more volume near open and close.
   * Synthetic like the rest of the feed; live minutes continue from it.
   */
  private backfillIndexHistory(index: IndexState, now: number): void {
    const dayStart = vnDayStart(now)
    const end = Math.min(vnMinuteOfDay(now), BACKFILL_MINUTES.close) // the current minute is live
    const isLunch = (minute: number) => minute >= BACKFILL_MINUTES.lunchStart && minute < BACKFILL_MINUTES.lunchEnd
    const tradingMinutes: number[] = []
    for (let minute = BACKFILL_MINUTES.open; minute < end; minute++) if (!isLunch(minute)) tradingMinutes.push(minute)
    if (tradingMinutes.length === 0) return

    const { reference, value: target } = index.quote
    const walk: number[] = []
    let level = 0
    for (let i = 0; i < tradingMinutes.length; i++) {
      level += (this.random() * 2 - 1) * reference * BACKFILL_STEP
      walk.push(level)
    }
    // Tilt the walk so its last point lands exactly on the current value.
    const drift = (walk[walk.length - 1] ?? 0) - (target - reference)
    const meanVolume = Math.max(1, index.constituents.length) * BACKFILL_SHARES_PER_SYMBOL
    const span = BACKFILL_MINUTES.close - BACKFILL_MINUTES.open

    let tradingIndex = 0
    let lastValue = reference
    for (let minute = BACKFILL_MINUTES.open; minute < end; minute++) {
      const time = dayStart + minute * MINUTE_MS
      if (isLunch(minute)) {
        index.history.push({ time, value: lastValue, volume: 0 })
        continue
      }
      const i = tradingIndex++
      lastValue = round2(reference + (walk[i] ?? 0) - drift * ((i + 1) / tradingMinutes.length))
      const distanceFromMidday = Math.abs((minute - BACKFILL_MINUTES.open) / span - 0.5) * 2
      const volume = Math.round(randomExp(this.random, meanVolume * (1 + 2 * distanceFromMidday ** 3)))
      index.history.push({ time, value: lastValue, volume })
    }
  }

  private buildIndices(now: number): void {
    const all = [...this.symbols.values()]
    for (const code of INDEX_CODES) {
      const constituents = all.filter((state) => state.instrument.indices.includes(code))
      const reference = INDEX_REFERENCE[code]
      const index: IndexState = {
        constituents,
        referenceCap: this.capitalisation(constituents, 'reference'),
        history: new RingBuffer<IndexPoint>(INDEX_HISTORY_LIMIT),
        quote: {
          code,
          v: 0,
          value: reference,
          reference,
          change: 0,
          changePercent: 0,
          totalVolume: 0,
          totalValue: 0,
          advancers: 0,
          decliners: 0,
          unchanged: 0,
          ceilingCount: 0,
          floorCount: 0,
          updatedAt: now,
        },
      }
      this.indices.set(code, index)
      // Backfill first: history must stay in time order, and computeIndex adds the live minute.
      this.backfillIndexHistory(index, now)
      this.computeIndex(index, now)
    }
  }

  private capitalisation(constituents: readonly SymbolState[], basis: 'reference' | 'last'): number {
    return constituents.reduce((sum, { quote, instrument }) => {
      const price = basis === 'reference' ? quote.reference : (quote.lastPrice ?? quote.reference)
      return sum + price * instrument.sharesOutstanding
    }, 0)
  }

  /** Cap-weighted value against the day's reference capitalisation. Returns true when anything changed. */
  private computeIndex(index: IndexState, now: number): boolean {
    let advancers = 0
    let decliners = 0
    let unchanged = 0
    let ceilingCount = 0
    let floorCount = 0
    let totalVolume = 0
    let totalValue = 0
    for (const { quote } of index.constituents) {
      const last = quote.lastPrice
      if (last === null || last === quote.reference) unchanged++
      else if (last > quote.reference) advancers++
      else decliners++
      if (last !== null && last === quote.ceiling) ceilingCount++
      if (last !== null && last === quote.floor) floorCount++
      totalVolume += quote.totalVolume
      totalValue += quote.totalValue
    }

    const previous = index.quote
    const cap = this.capitalisation(index.constituents, 'last')
    const value = index.referenceCap > 0 ? round2((previous.reference * cap) / index.referenceCap) : previous.reference
    const changed =
      previous.v === 0 ||
      value !== previous.value ||
      advancers !== previous.advancers ||
      decliners !== previous.decliners ||
      ceilingCount !== previous.ceilingCount ||
      floorCount !== previous.floorCount ||
      totalVolume !== previous.totalVolume

    if (changed) {
      index.quote = {
        ...previous,
        v: previous.v + 1,
        value,
        change: round2(value - previous.reference),
        changePercent: round2(((value - previous.reference) / previous.reference) * 100),
        totalVolume,
        totalValue,
        advancers,
        decliners,
        unchanged,
        ceilingCount,
        floorCount,
        updatedAt: now,
      }
    }

    const minute = Math.floor(now / MINUTE_MS) * MINUTE_MS
    // Never negative: after a day roll the previous total belongs to yesterday.
    const traded = Math.max(0, totalVolume - previous.totalVolume)
    const lastPoint = index.history.last()
    if (lastPoint && lastPoint.time === minute) {
      index.history.replaceLast({ time: minute, value, volume: lastPoint.volume + traded })
    } else {
      index.history.push({ time: minute, value, volume: traded })
    }

    return changed
  }
}
