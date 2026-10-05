<template>
  <BaseCard :title="t('overview.heatmap.title')" :has-padding="false" class="sector-heatmap">
    <div ref="container" class="sector-heatmap__canvas">
      <svg
        v-if="layout.tiles.length > 0"
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="t('overview.heatmap.summary', { count: layout.tiles.length })"
      >
        <g v-for="group in layout.groups" :key="group.sector">
          <text :x="group.x0 + LABEL_INSET" :y="group.y0 + HEATMAP_PADDING.sectorHeader - LABEL_INSET" class="sector-heatmap__sector">
            {{ t(SECTOR_LABEL_KEYS[group.sector]) }}
          </text>
        </g>
        <g
          v-for="tile in layout.tiles"
          :key="tile.symbol"
          class="sector-heatmap__tile"
          :class="`sector-heatmap__tile--${heatBucket(tile.changePercent)}`"
          @click="emit('select', tile.symbol)"
        >
          <title>{{ tile.symbol }} {{ formatPercent(tile.changePercent, formatContext) }}</title>
          <rect :x="tile.x0" :y="tile.y0" :width="tile.x1 - tile.x0" :height="tile.y1 - tile.y0" class="sector-heatmap__rect" />
          <text
            v-if="hasLabel(tile)"
            :x="(tile.x0 + tile.x1) / 2"
            :y="(tile.y0 + tile.y1) / 2"
            text-anchor="middle"
            class="sector-heatmap__label"
          >
            <tspan :x="(tile.x0 + tile.x1) / 2" dy="-0.2em">{{ tile.symbol }}</tspan>
            <tspan :x="(tile.x0 + tile.x1) / 2" dy="1.2em" class="sector-heatmap__percent">
              {{ formatPercent(tile.changePercent, formatContext) }}
            </tspan>
          </text>
        </g>
      </svg>
      <BaseEmptyState v-else :title="t('overview.heatmap.empty')" icon="heatmap" />
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import { useElementSize } from '@/composables/useElementSize'
import { useFormatContext } from '@/composables/useFormatContext'
import { HEATMAP_PADDING } from '@/constants/limits'
import { SECTOR_LABEL_KEYS } from '@/constants/market'
import type { HeatmapTile } from '@/interfaces/overview'
import { computeHeatmapLayout, heatBucket, type HeatmapInput } from '@/utils/heatmapLayout'
import { formatPercent } from '@/utils/priceFormat'

/**
 * Treemap by sector, sized by market cap, colored by change % (FR-14). Loaded async; the
 * container hands it a throttled snapshot, so the layout never runs per tick.
 */
const { items } = defineProps<{
  items: readonly HeatmapInput[]
}>()

const emit = defineEmits<{
  select: [symbol: string]
}>()

/** Tiles smaller than this (px) get color only, no text. */
const MIN_LABEL_SIZE = { width: 40, height: 28 } as const
const LABEL_INSET = 4

const { t } = useI18n()
const formatContext = useFormatContext()
const container = useTemplateRef<HTMLElement>('container')
const { width, height } = useElementSize(container)

const layout = computed(() => computeHeatmapLayout(items, width.value, height.value))

function hasLabel(tile: HeatmapTile): boolean {
  return tile.x1 - tile.x0 >= MIN_LABEL_SIZE.width && tile.y1 - tile.y0 >= MIN_LABEL_SIZE.height
}
</script>

<style scoped>
.sector-heatmap__canvas {
  height: var(--mtg-heatmap-height);
}

.sector-heatmap__sector {
  font-size: var(--mtg-font-label-sm);
  font-weight: var(--mtg-weight-medium);
  fill: rgb(var(--v-theme-on-surface-variant));
}

.sector-heatmap__tile {
  cursor: pointer;
}

.sector-heatmap__rect {
  transition: opacity var(--mtg-duration-short2) var(--mtg-easing-standard);
}

.sector-heatmap__label {
  font-size: var(--mtg-font-label-md);
  font-weight: var(--mtg-weight-bold);
  fill: rgb(var(--v-theme-on-surface));
  pointer-events: none;
}

.sector-heatmap__percent {
  font-weight: var(--mtg-weight-regular);
}

.sector-heatmap__tile--n3 .sector-heatmap__rect {
  fill: var(--mtg-heat-n3);
}

.sector-heatmap__tile--n2 .sector-heatmap__rect {
  fill: var(--mtg-heat-n2);
}

.sector-heatmap__tile--n1 .sector-heatmap__rect {
  fill: var(--mtg-heat-n1);
}

.sector-heatmap__tile--0 .sector-heatmap__rect {
  fill: var(--mtg-heat-0);
}

.sector-heatmap__tile--p1 .sector-heatmap__rect {
  fill: var(--mtg-heat-p1);
}

.sector-heatmap__tile--p2 .sector-heatmap__rect {
  fill: var(--mtg-heat-p2);
}

.sector-heatmap__tile--p3 .sector-heatmap__rect {
  fill: var(--mtg-heat-p3);
}

/* Hover after the fills: it only dims, the fill stays. */
.sector-heatmap__tile:hover .sector-heatmap__rect {
  opacity: 0.8;
}

/* Strong tiles are saturated: switch labels to the surface color for contrast. */
.sector-heatmap__tile--n3 .sector-heatmap__label,
.sector-heatmap__tile--p3 .sector-heatmap__label {
  fill: rgb(var(--v-theme-surface));
}

@media (prefers-reduced-motion: reduce) {
  .sector-heatmap__rect {
    transition: none;
  }
}
</style>
