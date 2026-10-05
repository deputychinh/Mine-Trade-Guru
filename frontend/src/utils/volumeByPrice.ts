import type { Trade, VolumeAtPrice } from '@/interfaces/market'

/** Adds live trades to the session profile; result stays sorted highest price first (FR-24). */
export function applyTradesToProfile(profile: readonly VolumeAtPrice[], trades: readonly Trade[]): VolumeAtPrice[] {
  if (trades.length === 0) return [...profile]
  const byPrice = new Map(profile.map((level) => [level.price, level]))
  for (const trade of trades) {
    const level = byPrice.get(trade.price) ?? { price: trade.price, volume: 0, buyVolume: 0, sellVolume: 0 }
    byPrice.set(trade.price, {
      price: trade.price,
      volume: level.volume + trade.volume,
      buyVolume: level.buyVolume + (trade.side === 'B' ? trade.volume : 0),
      sellVolume: level.sellVolume + (trade.side === 'S' ? trade.volume : 0),
    })
  }
  return [...byPrice.values()].sort((a, b) => b.price - a.price)
}

export function maxProfileVolume(profile: readonly VolumeAtPrice[]): number {
  return profile.reduce((max, level) => Math.max(max, level.volume), 0)
}
