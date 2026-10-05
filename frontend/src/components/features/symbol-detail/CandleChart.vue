<template>
  <div ref="container" class="candle-chart" role="img" :aria-label="t('chart.ariaLabel', { count: bars.length })"></div>
</template>

<script setup lang="ts">
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import { useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatContext } from '@/composables/useFormatContext'
import { useLightweightChart } from '@/composables/useLightweightChart'
import type { ChartKind, ChartPalette, PriceGuides } from '@/interfaces/chart'
import type { Bar, InstrumentType } from '@/interfaces/market'
import { toCandles, toChartTime, toCloseLine, toVolumeBars } from '@/utils/chartData'
import { withAlpha } from '@/utils/contrast'
import { formatPrice } from '@/utils/priceFormat'
import { formatMarketTime } from '@/utils/time'

/** Intraday candles or close line + volume, with reference/ceiling/floor lines (FR-21). */
const { bars, kind, guides, type } = defineProps<{
  /** Already aggregated to the chosen timeframe, oldest first. */
  bars: readonly Bar[]
  kind: ChartKind
  guides: PriceGuides | null
  type: InstrumentType
}>()

const VOLUME_SCALE_ID = 'volume'
const VOLUME_ALPHA = 0.45
const MS_PER_SECOND = 1_000

const { t } = useI18n()
const formatContext = useFormatContext()
const container = useTemplateRef<HTMLElement>('container')

function formatTime(time: Time): string {
  return typeof time === 'number' ? formatMarketTime(time * MS_PER_SECOND, formatContext.value.locale, 'minutes') : ''
}

const { chart, palette, refresh } = useLightweightChart(container, (current) => ({
  localization: {
    priceFormatter: (price: number) => formatPrice(price, type, formatContext.value),
    timeFormatter: formatTime,
  },
  timeScale: { borderColor: current.grid, timeVisible: true, secondsVisible: false, tickMarkFormatter: formatTime },
  rightPriceScale: { borderColor: current.grid, scaleMargins: { top: 0.1, bottom: 0.28 } },
}))

let candleSeries: ISeriesApi<'Candlestick'> | null = null
let lineSeries: ISeriesApi<'Line'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let guideLines: IPriceLine[] = []
let shown = { count: 0, firstTime: 0 }

function candleColors(current: ChartPalette) {
  return {
    upColor: current.up,
    downColor: current.down,
    borderUpColor: current.up,
    borderDownColor: current.down,
    wickUpColor: current.up,
    wickDownColor: current.down,
  }
}

function mainSeries(): ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null {
  return candleSeries ?? lineSeries
}

/** (Re)creates the price series for the current kind; the volume series is created once. */
function buildSeries(instance: IChartApi): void {
  const previous = mainSeries()
  if (previous) instance.removeSeries(previous)
  candleSeries = null
  lineSeries = null
  guideLines = []
  if (kind === 'candle') {
    candleSeries = instance.addSeries(CandlestickSeries, { ...candleColors(palette.value), priceLineVisible: false })
  } else {
    lineSeries = instance.addSeries(LineSeries, { color: palette.value.line, lineWidth: 2, priceLineVisible: false })
  }
  if (!volumeSeries) {
    volumeSeries = instance.addSeries(HistogramSeries, {
      priceScaleId: VOLUME_SCALE_ID,
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    instance.priceScale(VOLUME_SCALE_ID).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
  }
  shown = { count: 0, firstTime: 0 }
}

/** Live trades only touch the last bar (or append one), so update it instead of resetting. */
function render(): void {
  const instance = chart.value
  if (!instance || !volumeSeries) return
  const up = withAlpha(palette.value.up, VOLUME_ALPHA)
  const down = withAlpha(palette.value.down, VOLUME_ALPHA)
  const firstTime = bars[0] ? toChartTime(bars[0].time) : 0
  const isIncremental = shown.count > 0 && firstTime === shown.firstTime && bars.length - shown.count >= 0 && bars.length - shown.count <= 1

  if (isIncremental) {
    const lastBar = bars.slice(-1)
    toCandles(lastBar).forEach((point) => candleSeries?.update(point))
    toCloseLine(lastBar).forEach((point) => lineSeries?.update(point))
    toVolumeBars(lastBar, up, down).forEach((point) => volumeSeries?.update(point))
  } else {
    candleSeries?.setData(toCandles(bars))
    lineSeries?.setData(toCloseLine(bars))
    volumeSeries.setData(toVolumeBars(bars, up, down))
    instance.timeScale().fitContent()
  }
  shown = { count: bars.length, firstTime }
}

function drawGuides(): void {
  const series = mainSeries()
  if (!series) return
  for (const line of guideLines) series.removePriceLine(line)
  guideLines = []
  if (!guides) return
  const current = palette.value
  const specs = [
    { price: guides.ceiling, color: current.ceiling, title: t('chart.guide.ceiling') },
    { price: guides.reference, color: current.reference, title: t('chart.guide.reference') },
    { price: guides.floor, color: current.floor, title: t('chart.guide.floor') },
  ]
  guideLines = specs.map((spec) =>
    series.createPriceLine({ ...spec, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true }),
  )
}

function rebuild(): void {
  if (!chart.value) return
  buildSeries(chart.value)
  render()
  drawGuides()
}

watch(chart, rebuild)
watch(() => kind, rebuild)
watch(() => bars, render)
watch(() => guides, drawGuides)
watch(palette, (current) => {
  candleSeries?.applyOptions(candleColors(current))
  lineSeries?.applyOptions({ color: current.line })
  shown = { count: 0, firstTime: 0 }
  render()
  drawGuides()
})
watch([formatContext, () => type], refresh)
</script>

<style scoped>
.candle-chart {
  height: var(--mtg-chart-height);
}
</style>
