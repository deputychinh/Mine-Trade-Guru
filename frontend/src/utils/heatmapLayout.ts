import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { HEAT_THRESHOLDS, HEATMAP_PADDING } from '@/constants/limits'
import type { Sector } from '@/interfaces/market'
import type { HeatmapLayout } from '@/interfaces/overview'

export interface HeatmapInput {
  symbol: string
  sector: Sector
  marketCap: number
  changePercent: number
}

interface TreeNode {
  name: string
  sector?: Sector
  item?: HeatmapInput
  children?: TreeNode[]
}

export type HeatBucket = 'n3' | 'n2' | 'n1' | '0' | 'p1' | 'p2' | 'p3'

/** Which of the 7 derived heat colors a tile uses (design-system.md §2.3). */
export function heatBucket(changePercent: number): HeatBucket {
  if (changePercent >= HEAT_THRESHOLDS.strong) return 'p3'
  if (changePercent >= HEAT_THRESHOLDS.medium) return 'p2'
  if (changePercent > 0) return 'p1'
  if (changePercent <= -HEAT_THRESHOLDS.strong) return 'n3'
  if (changePercent <= -HEAT_THRESHOLDS.medium) return 'n2'
  if (changePercent < 0) return 'n1'
  return '0'
}

/**
 * Squarified treemap: sectors sized by total market cap, tiles by symbol market cap (FR-14).
 * Layout only — rendering stays in the Vue component. Called on a throttle, never per tick.
 */
export function computeHeatmapLayout(items: readonly HeatmapInput[], width: number, height: number): HeatmapLayout {
  if (width <= 0 || height <= 0 || items.length === 0) return { groups: [], tiles: [] }

  const bySector = new Map<Sector, HeatmapInput[]>()
  for (const item of items) {
    if (item.marketCap <= 0) continue
    const list = bySector.get(item.sector) ?? []
    list.push(item)
    bySector.set(item.sector, list)
  }

  const root: TreeNode = {
    name: 'market',
    children: [...bySector].map(([sector, list]) => ({
      name: sector,
      sector,
      children: list.map((item) => ({ name: item.symbol, item })),
    })),
  }

  const layout = treemap<TreeNode>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingOuter(HEATMAP_PADDING.outer)
    .paddingTop((node) => (node.depth === 1 ? HEATMAP_PADDING.sectorHeader : HEATMAP_PADDING.outer))
    .paddingInner(HEATMAP_PADDING.inner)

  const positioned = layout(
    hierarchy(root)
      .sum((node) => node.item?.marketCap ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  )

  const result: HeatmapLayout = { groups: [], tiles: [] }
  for (const node of positioned.descendants()) {
    if (node.depth === 1 && node.data.sector) {
      result.groups.push({ sector: node.data.sector, x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1 })
    } else if (node.depth === 2 && node.data.item) {
      const { item } = node.data
      result.tiles.push({ ...item, x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1 })
    }
  }
  return result
}
