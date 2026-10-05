import { pickWeighted, randomInt, type RandomFn } from '../lib/random.js'
import { snapToTick } from './rules.js'
import type { Exchange, IndexCode, Instrument, InstrumentType, Sector } from './types.js'

// Company names are real listed companies; prices, share counts and index membership
// are illustrative seed values for the simulator, not live market data.

interface InstrumentSeed {
  symbol: string
  name: string
  exchange: Exchange
  type: InstrumentType
  sector: Sector | null
  /** Millions of shares. */
  shares: number
  /** Reference price: VND for stocks/ETF/CW, index points for futures. */
  basePrice: number
  indices?: IndexCode[]
  underlying?: string
  conversionRatio?: number
}

export interface Catalogue {
  instruments: Instrument[]
  basePrices: Map<string, number>
}

/** Index reference values at simulator start. */
export const INDEX_REFERENCE: Record<IndexCode, number> = {
  VNINDEX: 1280.54,
  VN30: 1320.4,
  HNXINDEX: 232.81,
  HNX30: 478.16,
  UPCOMINDEX: 96.42,
}

const EXCHANGE_INDEX: Record<Exchange, IndexCode> = {
  HOSE: 'VNINDEX',
  HNX: 'HNXINDEX',
  UPCOM: 'UPCOMINDEX',
}

const SECTORS: Sector[] = [
  'BANKING',
  'REAL_ESTATE',
  'SECURITIES',
  'STEEL',
  'OIL_GAS',
  'RETAIL',
  'TECHNOLOGY',
  'FOOD_BEVERAGE',
  'UTILITIES',
  'TRANSPORT',
  'CONSTRUCTION',
  'CHEMICALS',
  'INSURANCE',
  'INDUSTRIAL',
  'SEAFOOD',
]

function stock(
  symbol: string,
  name: string,
  exchange: Exchange,
  sector: Sector,
  shares: number,
  basePrice: number,
  indices: IndexCode[] = [],
): InstrumentSeed {
  return { symbol, name, exchange, type: 'STOCK', sector, shares, basePrice, indices }
}

function etf(symbol: string, name: string, shares: number, basePrice: number): InstrumentSeed {
  return { symbol, name, exchange: 'HOSE', type: 'ETF', sector: null, shares, basePrice }
}

function cw(
  symbol: string,
  underlying: string,
  issuer: string,
  conversionRatio: number,
  basePrice: number,
): InstrumentSeed {
  return {
    symbol,
    name: `CW ${underlying}/${issuer}`,
    exchange: 'HOSE',
    type: 'CW',
    sector: null,
    shares: 10,
    basePrice,
    underlying,
    conversionRatio,
  }
}

function futures(symbol: string, name: string, basePrice: number): InstrumentSeed {
  return {
    symbol,
    name,
    exchange: 'HNX',
    type: 'FUTURES',
    sector: null,
    shares: 0,
    basePrice,
    underlying: 'VN30',
  }
}

const SEEDS: InstrumentSeed[] = [
  // HOSE — VN30 basket
  stock('ACB', 'Asia Commercial Bank', 'HOSE', 'BANKING', 4467, 24_850, ['VN30']),
  stock('BCM', 'Becamex IDC', 'HOSE', 'INDUSTRIAL', 1035, 61_200, ['VN30']),
  stock('BID', 'BIDV', 'HOSE', 'BANKING', 6590, 47_300, ['VN30']),
  stock('CTG', 'VietinBank', 'HOSE', 'BANKING', 5370, 36_750, ['VN30']),
  stock('FPT', 'FPT Corporation', 'HOSE', 'TECHNOLOGY', 1471, 132_400, ['VN30']),
  stock('GAS', 'PV Gas', 'HOSE', 'OIL_GAS', 2342, 68_900, ['VN30']),
  stock('GVR', 'Vietnam Rubber Group', 'HOSE', 'INDUSTRIAL', 4000, 32_150, ['VN30']),
  stock('HDB', 'HDBank', 'HOSE', 'BANKING', 3496, 27_600, ['VN30']),
  stock('HPG', 'Hoa Phat Group', 'HOSE', 'STEEL', 6396, 28_450, ['VN30']),
  stock('LPB', 'LPBank', 'HOSE', 'BANKING', 2987, 33_400, ['VN30']),
  stock('MBB', 'Military Commercial Bank', 'HOSE', 'BANKING', 6103, 23_900, ['VN30']),
  stock('MSN', 'Masan Group', 'HOSE', 'FOOD_BEVERAGE', 1438, 74_200, ['VN30']),
  stock('MWG', 'Mobile World', 'HOSE', 'RETAIL', 1462, 55_800, ['VN30']),
  stock('PLX', 'Petrolimex', 'HOSE', 'OIL_GAS', 1271, 41_300, ['VN30']),
  stock('POW', 'PV Power', 'HOSE', 'UTILITIES', 2342, 12_750, ['VN30']),
  stock('SAB', 'Sabeco', 'HOSE', 'FOOD_BEVERAGE', 1282, 58_500, ['VN30']),
  stock('SHB', 'Saigon-Hanoi Bank', 'HOSE', 'BANKING', 3658, 11_900, ['VN30']),
  stock('SSB', 'SeABank', 'HOSE', 'BANKING', 2821, 18_400, ['VN30']),
  stock('SSI', 'SSI Securities', 'HOSE', 'SECURITIES', 1960, 33_200, ['VN30']),
  stock('STB', 'Sacombank', 'HOSE', 'BANKING', 1885, 29_850, ['VN30']),
  stock('TCB', 'Techcombank', 'HOSE', 'BANKING', 7065, 22_100, ['VN30']),
  stock('TPB', 'TPBank', 'HOSE', 'BANKING', 2642, 16_550, ['VN30']),
  stock('VCB', 'Vietcombank', 'HOSE', 'BANKING', 8356, 91_500, ['VN30']),
  stock('VHM', 'Vinhomes', 'HOSE', 'REAL_ESTATE', 4108, 45_800, ['VN30']),
  stock('VIB', 'Vietnam International Bank', 'HOSE', 'BANKING', 2979, 19_250, ['VN30']),
  stock('VIC', 'Vingroup', 'HOSE', 'REAL_ESTATE', 3824, 43_600, ['VN30']),
  stock('VJC', 'Vietjet Aviation', 'HOSE', 'TRANSPORT', 542, 102_300, ['VN30']),
  stock('VNM', 'Vinamilk', 'HOSE', 'FOOD_BEVERAGE', 2090, 66_400, ['VN30']),
  stock('VPB', 'VPBank', 'HOSE', 'BANKING', 7934, 18_900, ['VN30']),
  stock('VRE', 'Vincom Retail', 'HOSE', 'REAL_ESTATE', 2272, 20_150, ['VN30']),

  // HOSE — other stocks
  stock('BVH', 'Bao Viet Holdings', 'HOSE', 'INSURANCE', 742, 44_100),
  stock('DGC', 'Duc Giang Chemicals', 'HOSE', 'CHEMICALS', 380, 98_700),
  stock('DIG', 'DIC Corp', 'HOSE', 'REAL_ESTATE', 610, 17_850),
  stock('DXG', 'Dat Xanh Group', 'HOSE', 'REAL_ESTATE', 870, 15_400),
  stock('GEX', 'Gelex Group', 'HOSE', 'INDUSTRIAL', 860, 21_300),
  stock('KBC', 'Kinh Bac City', 'HOSE', 'INDUSTRIAL', 768, 27_900),
  stock('KDH', 'Khang Dien House', 'HOSE', 'REAL_ESTATE', 1010, 33_550),
  stock('NLG', 'Nam Long Group', 'HOSE', 'REAL_ESTATE', 385, 37_200),
  stock('NVL', 'Novaland', 'HOSE', 'REAL_ESTATE', 1950, 10_350),
  stock('PDR', 'Phat Dat Real Estate', 'HOSE', 'REAL_ESTATE', 873, 19_600),
  stock('PNJ', 'Phu Nhuan Jewelry', 'HOSE', 'RETAIL', 338, 96_100),
  stock('REE', 'REE Corporation', 'HOSE', 'UTILITIES', 471, 66_800),
  stock('VCI', 'Vietcap Securities', 'HOSE', 'SECURITIES', 718, 35_900),
  stock('VND', 'VNDirect Securities', 'HOSE', 'SECURITIES', 1521, 14_850),
  stock('HCM', 'HSC Securities', 'HOSE', 'SECURITIES', 720, 28_300),
  stock('EIB', 'Eximbank', 'HOSE', 'BANKING', 1860, 18_750),
  stock('OCB', 'Orient Commercial Bank', 'HOSE', 'BANKING', 2465, 11_650),
  stock('MSB', 'Maritime Bank', 'HOSE', 'BANKING', 2600, 11_800),
  stock('VHC', 'Vinh Hoan', 'HOSE', 'SEAFOOD', 224, 68_500),
  stock('DPM', 'PetroVietnam Fertilizer', 'HOSE', 'CHEMICALS', 391, 34_900),
  stock('DCM', 'PetroVietnam Ca Mau Fertilizer', 'HOSE', 'CHEMICALS', 529, 36_400),
  stock('GMD', 'Gemadept', 'HOSE', 'TRANSPORT', 413, 61_700),
  stock('HSG', 'Hoa Sen Group', 'HOSE', 'STEEL', 616, 17_900),
  stock('NKG', 'Nam Kim Steel', 'HOSE', 'STEEL', 447, 16_850),
  stock('FRT', 'FPT Digital Retail', 'HOSE', 'RETAIL', 136, 176_500),
  stock('DGW', 'Digiworld', 'HOSE', 'RETAIL', 219, 41_250),
  stock('CTD', 'Coteccons', 'HOSE', 'CONSTRUCTION', 100, 76_400),
  stock('VCG', 'Vinaconex', 'HOSE', 'CONSTRUCTION', 598, 22_450),
  stock('PVD', 'PV Drilling', 'HOSE', 'OIL_GAS', 556, 24_300),
  stock('PVT', 'PV Trans', 'HOSE', 'TRANSPORT', 356, 26_750),
  stock('HAG', 'Hoang Anh Gia Lai', 'HOSE', 'FOOD_BEVERAGE', 1057, 12_450),
  stock('ITA', 'Tan Tao Investment', 'HOSE', 'INDUSTRIAL', 938, 4_850),
  stock('HQC', 'Hoang Quan Real Estate', 'HOSE', 'REAL_ESTATE', 569, 3_920),

  // HOSE — ETFs
  etf('E1VFVN30', 'DCVFM VN30 ETF', 400, 25_650),
  etf('FUEVFVND', 'DCVFM VNDiamond ETF', 700, 33_480),
  etf('FUESSVFL', 'SSIAM VNFIN LEAD ETF', 160, 22_110),
  etf('FUEVN100', 'VinaCapital VN100 ETF', 45, 19_820),

  // HOSE — covered warrants
  cw('CFPT2512', 'FPT', 'KIS', 10, 1_540),
  cw('CHPG2511', 'HPG', 'SSI', 4, 1_120),
  cw('CMWG2510', 'MWG', 'VND', 5, 2_280),
  cw('CVNM2509', 'VNM', 'HSC', 8, 890),
  cw('CSTB2514', 'STB', 'ACBS', 2, 1_650),
  cw('CTCB2513', 'TCB', 'KIS', 2, 760),

  // HNX
  stock('PVS', 'PetroVietnam Technical Services', 'HNX', 'OIL_GAS', 478, 33_800, ['HNX30']),
  stock('SHS', 'Saigon-Hanoi Securities', 'HNX', 'SECURITIES', 813, 13_200, ['HNX30']),
  stock('CEO', 'C.E.O Group', 'HNX', 'REAL_ESTATE', 540, 17_600, ['HNX30']),
  stock('VCS', 'Vicostone', 'HNX', 'INDUSTRIAL', 160, 58_400, ['HNX30']),
  stock('IDC', 'IDICO Corporation', 'HNX', 'INDUSTRIAL', 330, 47_900, ['HNX30']),
  stock('MBS', 'MB Securities', 'HNX', 'SECURITIES', 572, 28_700, ['HNX30']),
  stock('NVB', 'National Citizen Bank', 'HNX', 'BANKING', 1320, 10_800, ['HNX30']),
  stock('PVC', 'PetroVietnam Chemicals', 'HNX', 'CHEMICALS', 75, 11_400, ['HNX30']),
  stock('TNG', 'TNG Investment', 'HNX', 'INDUSTRIAL', 122, 21_500, ['HNX30']),
  stock('HUT', 'Tasco', 'HNX', 'CONSTRUCTION', 892, 16_300, ['HNX30']),
  stock('L14', 'Licogi 14', 'HNX', 'CONSTRUCTION', 31, 38_100, ['HNX30']),
  stock('BVS', 'Bao Viet Securities', 'HNX', 'SECURITIES', 72, 32_600, ['HNX30']),
  stock('DTD', 'Thanh Dat Investment', 'HNX', 'REAL_ESTATE', 81, 26_800, ['HNX30']),
  stock('LAS', 'Lam Thao Fertilizers', 'HNX', 'CHEMICALS', 113, 22_400, ['HNX30']),
  stock('NTP', 'Tien Phong Plastic', 'HNX', 'INDUSTRIAL', 141, 60_500, ['HNX30']),
  stock('PLC', 'Petrolimex Petrochemical', 'HNX', 'CHEMICALS', 80, 27_900),
  stock('THD', 'Thaiholdings', 'HNX', 'REAL_ESTATE', 350, 34_200),
  stock('VGS', 'VG Steel Pipe', 'HNX', 'STEEL', 54, 36_700),
  stock('DDG', 'Dong Duong Industrial', 'HNX', 'INDUSTRIAL', 71, 3_900),
  stock('IDJ', 'IDJ Financial', 'HNX', 'REAL_ESTATE', 180, 5_600),

  // UPCOM
  stock('ACV', 'Airports Corporation of Vietnam', 'UPCOM', 'TRANSPORT', 2177, 118_500),
  stock('BSR', 'Binh Son Refining', 'UPCOM', 'OIL_GAS', 3100, 21_300),
  stock('MSR', 'Masan High-Tech Materials', 'UPCOM', 'INDUSTRIAL', 1100, 14_600),
  stock('VEA', 'VEAM Corporation', 'UPCOM', 'INDUSTRIAL', 1329, 40_700),
  stock('QNS', 'Quang Ngai Sugar', 'UPCOM', 'FOOD_BEVERAGE', 367, 48_200),
  stock('OIL', 'PV Oil', 'UPCOM', 'OIL_GAS', 1034, 11_800),
  stock('VGI', 'Viettel Global', 'UPCOM', 'TECHNOLOGY', 3044, 88_900),
  stock('MCH', 'Masan Consumer', 'UPCOM', 'FOOD_BEVERAGE', 727, 162_000),
  stock('VTP', 'Viettel Post', 'UPCOM', 'TRANSPORT', 122, 121_600),
  stock('FOX', 'FPT Telecom', 'UPCOM', 'TECHNOLOGY', 493, 75_300),
  stock('SIP', 'Saigon VRG Investment', 'UPCOM', 'INDUSTRIAL', 211, 82_400),
  stock('ABB', 'An Binh Bank', 'UPCOM', 'BANKING', 1035, 7_600),
  stock('KLB', 'Kienlong Bank', 'UPCOM', 'BANKING', 361, 11_200),
  stock('BVB', 'Viet Capital Bank', 'UPCOM', 'BANKING', 553, 10_400),
  stock('LTG', 'Loc Troi Group', 'UPCOM', 'FOOD_BEVERAGE', 83, 18_500),

  // Derivatives — VN30 index futures
  futures('VN30F1M', 'VN30 Futures, front month', 1318.5),
  futures('VN30F2M', 'VN30 Futures, next month', 1316.0),
  futures('VN30F1Q', 'VN30 Futures, front quarter', 1312.4),
  futures('VN30F2Q', 'VN30 Futures, next quarter', 1309.8),
]

function toInstrument(seed: InstrumentSeed): Instrument {
  const indices = [...(seed.indices ?? [])]
  if (seed.type === 'STOCK') indices.unshift(EXCHANGE_INDEX[seed.exchange])
  return {
    symbol: seed.symbol,
    name: seed.name,
    exchange: seed.exchange,
    type: seed.type,
    sector: seed.sector,
    sharesOutstanding: seed.shares * 1_000_000,
    indices,
    underlying: seed.underlying ?? null,
    conversionRatio: seed.conversionRatio ?? null,
  }
}

function* syntheticSymbols(taken: ReadonlySet<string>): Generator<string> {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const a of letters) {
    for (const b of letters) {
      for (const c of letters) {
        const symbol = `${a}${b}${c}`
        if (!taken.has(symbol)) yield symbol
      }
    }
  }
}

function syntheticSeeds(count: number, taken: ReadonlySet<string>, random: RandomFn): InstrumentSeed[] {
  const seeds: InstrumentSeed[] = []
  const symbols = syntheticSymbols(taken)
  while (seeds.length < count) {
    const next = symbols.next()
    if (next.done) break
    const exchange = pickWeighted<Exchange>(random, [
      ['HOSE', 45],
      ['HNX', 25],
      ['UPCOM', 30],
    ])
    const sector = SECTORS[randomInt(random, 0, SECTORS.length - 1)] ?? 'INDUSTRIAL'
    const rawPrice = randomInt(random, 3_000, 90_000)
    const basePrice = snapToTick({ exchange, type: 'STOCK' }, rawPrice)
    seeds.push(
      stock(next.value, `${next.value} Synthetic JSC`, exchange, sector, randomInt(random, 20, 800), basePrice),
    )
  }
  return seeds
}

/**
 * The real-looking catalogue, padded with deterministic synthetic tickers when
 * `symbolCount` asks for more (stress mode, NFR-P2).
 */
export function buildCatalogue(symbolCount: number, random: RandomFn): Catalogue {
  const taken = new Set(SEEDS.map((seed) => seed.symbol))
  const extra = Math.max(0, symbolCount - SEEDS.length)
  const seeds = [...SEEDS, ...syntheticSeeds(extra, taken, random)]
  return {
    instruments: seeds.map(toInstrument),
    basePrices: new Map(seeds.map((seed) => [seed.symbol, seed.basePrice])),
  }
}
