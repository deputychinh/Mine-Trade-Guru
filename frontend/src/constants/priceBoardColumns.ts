import type { ColumnDefinition, ColumnGroupDefinition, ColumnGroupKey } from '@/interfaces/board'

/** Column groups in iBoard order. Groups are what users hide and drag (FR-05). */
export const COLUMN_GROUPS: readonly ColumnGroupDefinition[] = [
  { key: 'symbol', labelKey: 'column.group.symbol', isFixed: true, isVisibleByDefault: true },
  { key: 'reference', labelKey: 'column.group.reference', isFixed: false, isVisibleByDefault: true },
  { key: 'bids', labelKey: 'column.group.bids', isFixed: false, isVisibleByDefault: true },
  { key: 'match', labelKey: 'column.group.match', isFixed: false, isVisibleByDefault: true },
  { key: 'asks', labelKey: 'column.group.asks', isFixed: false, isVisibleByDefault: true },
  { key: 'volume', labelKey: 'column.group.volume', isFixed: false, isVisibleByDefault: true },
  { key: 'ohlc', labelKey: 'column.group.ohlc', isFixed: false, isVisibleByDefault: false },
  { key: 'foreign', labelKey: 'column.group.foreign', isFixed: false, isVisibleByDefault: true },
]

export const COLUMNS: readonly ColumnDefinition[] = [
  { key: 'symbol', group: 'symbol', labelKey: 'column.symbol', kind: 'symbol', colorSource: 'lastPrice', isSortable: true, width: 'symbol' },

  { key: 'ceiling', group: 'reference', labelKey: 'column.ceiling', kind: 'price', colorSource: 'ceiling', isSortable: false, width: 'price' },
  { key: 'floor', group: 'reference', labelKey: 'column.floor', kind: 'price', colorSource: 'floor', isSortable: false, width: 'price' },
  { key: 'reference', group: 'reference', labelKey: 'column.reference', kind: 'price', colorSource: 'reference', isSortable: false, width: 'price' },

  { key: 'bid3Price', group: 'bids', labelKey: 'column.price3', kind: 'price', colorSource: 'bid3Price', isSortable: false, width: 'price' },
  { key: 'bid3Volume', group: 'bids', labelKey: 'column.volume3', kind: 'volume', colorSource: 'bid3Price', isSortable: false, width: 'volume' },
  { key: 'bid2Price', group: 'bids', labelKey: 'column.price2', kind: 'price', colorSource: 'bid2Price', isSortable: false, width: 'price' },
  { key: 'bid2Volume', group: 'bids', labelKey: 'column.volume2', kind: 'volume', colorSource: 'bid2Price', isSortable: false, width: 'volume' },
  { key: 'bid1Price', group: 'bids', labelKey: 'column.price1', kind: 'price', colorSource: 'bid1Price', isSortable: false, width: 'price' },
  { key: 'bid1Volume', group: 'bids', labelKey: 'column.volume1', kind: 'volume', colorSource: 'bid1Price', isSortable: false, width: 'volume' },

  { key: 'lastPrice', group: 'match', labelKey: 'column.price', kind: 'price', colorSource: 'lastPrice', isSortable: true, width: 'price' },
  { key: 'lastVolume', group: 'match', labelKey: 'column.volume', kind: 'volume', colorSource: 'lastPrice', isSortable: true, width: 'volume' },
  { key: 'change', group: 'match', labelKey: 'column.change', kind: 'change', colorSource: 'lastPrice', isSortable: true, width: 'price' },
  { key: 'changePercent', group: 'match', labelKey: 'column.changePercent', kind: 'percent', colorSource: 'lastPrice', isSortable: true, width: 'price' },

  { key: 'ask1Price', group: 'asks', labelKey: 'column.price1', kind: 'price', colorSource: 'ask1Price', isSortable: false, width: 'price' },
  { key: 'ask1Volume', group: 'asks', labelKey: 'column.volume1', kind: 'volume', colorSource: 'ask1Price', isSortable: false, width: 'volume' },
  { key: 'ask2Price', group: 'asks', labelKey: 'column.price2', kind: 'price', colorSource: 'ask2Price', isSortable: false, width: 'price' },
  { key: 'ask2Volume', group: 'asks', labelKey: 'column.volume2', kind: 'volume', colorSource: 'ask2Price', isSortable: false, width: 'volume' },
  { key: 'ask3Price', group: 'asks', labelKey: 'column.price3', kind: 'price', colorSource: 'ask3Price', isSortable: false, width: 'price' },
  { key: 'ask3Volume', group: 'asks', labelKey: 'column.volume3', kind: 'volume', colorSource: 'ask3Price', isSortable: false, width: 'volume' },

  { key: 'totalVolume', group: 'volume', labelKey: 'column.totalVolume', kind: 'volume', colorSource: null, isSortable: true, width: 'volume' },
  { key: 'totalValue', group: 'volume', labelKey: 'column.totalValue', kind: 'value', colorSource: null, isSortable: true, width: 'value' },

  { key: 'open', group: 'ohlc', labelKey: 'column.open', kind: 'price', colorSource: 'open', isSortable: false, width: 'price' },
  { key: 'high', group: 'ohlc', labelKey: 'column.high', kind: 'price', colorSource: 'high', isSortable: true, width: 'price' },
  { key: 'low', group: 'ohlc', labelKey: 'column.low', kind: 'price', colorSource: 'low', isSortable: true, width: 'price' },
  { key: 'average', group: 'ohlc', labelKey: 'column.average', kind: 'price', colorSource: 'average', isSortable: false, width: 'price' },

  { key: 'foreignBuy', group: 'foreign', labelKey: 'column.foreignBuy', kind: 'volume', colorSource: null, isSortable: true, width: 'volume' },
  { key: 'foreignSell', group: 'foreign', labelKey: 'column.foreignSell', kind: 'volume', colorSource: null, isSortable: true, width: 'volume' },
  { key: 'foreignRoom', group: 'foreign', labelKey: 'column.foreignRoom', kind: 'volume', colorSource: null, isSortable: true, width: 'value' },
]

export const DEFAULT_GROUP_ORDER: readonly ColumnGroupKey[] = COLUMN_GROUPS.map((group) => group.key)

export const DEFAULT_HIDDEN_GROUPS: readonly ColumnGroupKey[] = COLUMN_GROUPS.filter(
  (group) => !group.isVisibleByDefault,
).map((group) => group.key)

/** Groups kept on tablet widths (FR-46); phones switch to the card list. */
export const NARROW_VISIBLE_GROUPS: readonly ColumnGroupKey[] = ['symbol', 'reference', 'match', 'volume']
