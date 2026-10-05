import type { Instrument, InstrumentType, SessionMarket } from '@/interfaces/market'

/** Futures trade on the derivatives session; everything else follows its exchange. */
export function sessionMarketOf(instrument: Pick<Instrument, 'exchange' | 'type'>): SessionMarket {
  return instrument.type === 'FUTURES' ? 'DERIVATIVES' : instrument.exchange
}

/** Stocks, ETFs and CWs are quoted in VND and may be shown ÷1,000; futures are index points. */
export function isVndPriced(type: InstrumentType): boolean {
  return type !== 'FUTURES'
}

/** Volumes are shares (lots of 10 on a ×10 board) except futures, which are contracts. */
export function isShareVolume(type: InstrumentType): boolean {
  return type !== 'FUTURES'
}
