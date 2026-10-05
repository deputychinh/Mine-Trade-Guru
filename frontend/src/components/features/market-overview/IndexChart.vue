<template>
  <div class="index-chart" role="img" :aria-label="label">
    <div ref="container" class="index-chart__canvas"></div>
    <span
      v-if="reference !== null && referenceTop !== null"
      class="index-chart__reference mtg-num"
      :style="{ '--mtg-offset': `${referenceTop}px` }"
      aria-hidden="true"
    >
      {{ formatIndex(reference, formatContext) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  BaselineSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type AutoscaleInfo,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import { ref, useTemplateRef, watch } from 'vue'
import { useFormatContext } from '@/composables/useFormatContext'
import { useLightweightChart } from '@/composables/useLightweightChart'
import type { ChartPalette } from '@/interfaces/chart'
import type { IndexPoint } from '@/interfaces/market'
import { indexSessionAxis, toChartTime, toIndexVolumeBars, toLinePoints } from '@/utils/chartData'
import { withAlpha } from '@/utils/contrast'
import { formatIndex } from '@/utils/priceFormat'
import { formatHourTick, formatMarketTime } from '@/utils/time'

/**
 * Intraday index chart, iBoard style (FR-10): the whole 09h–15h session on the axis, the line
 * green above the reference and red below, the reference as a labelled dashed line, and
 * per-minute volume bars underneath.
 */
const { points, reference, label } = defineProps<{
  points: readonly IndexPoint[]
  reference: number | null
  /** Accessible description; the numbers next to the chart are the readable content. */
  label: string
}>()

const VOLUME_SCALE_ID = 'volume'
const FILL_ALPHA = 0.28
const FADE_ALPHA = 0.02
const VOLUME_ALPHA = 0.7
const MS_PER_SECOND = 1_000

const formatContext = useFormatContext()
const container = useTemplateRef<HTMLElement>('container')
/** Pixel offset of the reference line, for the centered label. */
const referenceTop = ref<number | null>(null)

function formatTime(time: Time, isTick: boolean): string {
  if (typeof time !== 'number') return ''
  const epochMs = time * MS_PER_SECOND
  return isTick ? formatHourTick(epochMs, formatContext.value.locale) : formatMarketTime(epochMs, formatContext.value.locale, 'minutes')
}

const { chart, palette, refresh } = useLightweightChart(container, (current) => ({
  layout: { background: { type: ColorType.Solid, color: 'transparent' }, fontSize: 10 },
  handleScroll: false,
  handleScale: false,
  rightPriceScale: { visible: false },
  leftPriceScale: { visible: false },
  timeScale: {
    borderColor: current.grid,
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: true,
    fixRightEdge: true,
    tickMarkFormatter: (time: Time) => formatTime(time, true),
  },
  localization: {
    timeFormatter: (time: Time) => formatTime(time, false),
    priceFormatter: (price: number) => formatIndex(price, formatContext.value),
  },
  grid: { vertLines: { visible: false }, horzLines: { visible: false } },
  crosshair: { horzLine: { visible: false, labelVisible: false } },
}))

let axisSeries: ISeriesApi<'Line'> | null = null
let valueSeries: ISeriesApi<'Baseline'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let referenceLine: IPriceLine | null = null
let shown = { count: 0, firstTime: 0, axisKey: '' }

function valueColors(current: ChartPalette) {
  return {
    topLineColor: current.up,
    topFillColor1: withAlpha(current.up, FILL_ALPHA),
    topFillColor2: withAlpha(current.up, FADE_ALPHA),
    bottomLineColor: current.down,
    bottomFillColor1: withAlpha(current.down, FADE_ALPHA),
    bottomFillColor2: withAlpha(current.down, FILL_ALPHA),
  }
}

function placeReferenceLabel(): void {
  // Coordinates are only known after the chart has laid out this frame.
  requestAnimationFrame(() => {
    const coordinate = reference === null || !valueSeries ? null : valueSeries.priceToCoordinate(reference)
    referenceTop.value = coordinate === null ? null : Math.round(coordinate)
  })
}

function drawReference(): void {
  if (!valueSeries) return
  if (referenceLine) valueSeries.removePriceLine(referenceLine)
  referenceLine = null
  if (reference !== null) {
    valueSeries.applyOptions({ baseValue: { type: 'price', price: reference } })
    referenceLine = valueSeries.createPriceLine({
      price: reference,
      color: palette.value.reference,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: false,
    })
  }
  placeReferenceLabel()
}

/** Live ticks only touch the last minute (or add one): update it instead of resetting. */
function render(): void {
  if (!chart.value || !axisSeries || !valueSeries || !volumeSeries) return
  const volumeColor = withAlpha(palette.value.line, VOLUME_ALPHA)
  const axis = indexSessionAxis(points, Date.now())
  const axisKey = `${axis[0]?.time}-${axis[axis.length - 1]?.time}`
  const firstTime = points[0] ? toChartTime(points[0].time) : 0
  const added = points.length - shown.count
  const isIncremental = shown.count > 0 && axisKey === shown.axisKey && firstTime === shown.firstTime && added >= 0 && added <= 1

  if (isIncremental) {
    const last = points.slice(-1)
    toLinePoints(last).forEach((point) => valueSeries?.update(point))
    toIndexVolumeBars(last, volumeColor).forEach((bar) => volumeSeries?.update(bar))
  } else {
    axisSeries.setData(axis)
    valueSeries.setData(toLinePoints(points))
    volumeSeries.setData(toIndexVolumeBars(points, volumeColor))
    chart.value.timeScale().fitContent()
  }
  shown = { count: points.length, firstTime, axisKey }
  placeReferenceLabel()
}

watch(chart, (instance) => {
  if (!instance) return
  // Invisible series holding one empty point per session minute: sets the 09h–15h axis.
  axisSeries = instance.addSeries(LineSeries, { visible: false, lastValueVisible: false, priceLineVisible: false })
  valueSeries = instance.addSeries(BaselineSeries, {
    ...valueColors(palette.value),
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerRadius: 3,
    // Keep the reference in view, as iBoard does, even when the index never crossed it.
    autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
      const info = original()
      if (!info?.priceRange || reference === null) return info
      return {
        ...info,
        priceRange: {
          minValue: Math.min(info.priceRange.minValue, reference),
          maxValue: Math.max(info.priceRange.maxValue, reference),
        },
      }
    },
  })
  volumeSeries = instance.addSeries(HistogramSeries, {
    priceScaleId: VOLUME_SCALE_ID,
    priceFormat: { type: 'volume' },
    lastValueVisible: false,
    priceLineVisible: false,
  })
  instance.priceScale(VOLUME_SCALE_ID).applyOptions({ scaleMargins: { top: 0.72, bottom: 0 } })
  valueSeries.priceScale().applyOptions({ scaleMargins: { top: 0.12, bottom: 0.3 } })
  instance.timeScale().subscribeSizeChange(placeReferenceLabel)
  shown = { count: 0, firstTime: 0, axisKey: '' }
  render()
  drawReference()
})

watch(() => points, render)
watch(() => reference, drawReference)
watch(palette, (current) => {
  valueSeries?.applyOptions(valueColors(current))
  shown = { count: 0, firstTime: 0, axisKey: '' }
  render()
  drawReference()
})
watch(formatContext, refresh)
</script>

<style scoped>
.index-chart {
  position: relative;
  height: var(--mtg-index-chart-height);
}

.index-chart__canvas {
  height: 100%;
}

.index-chart__reference {
  position: absolute;
  top: var(--mtg-offset);
  left: 50%;
  padding-inline: var(--mtg-space-1);
  transform: translate(-50%, -100%);
  font-size: var(--mtg-font-label-sm);
  color: rgb(var(--v-theme-on-surface));
  pointer-events: none;
}
</style>
