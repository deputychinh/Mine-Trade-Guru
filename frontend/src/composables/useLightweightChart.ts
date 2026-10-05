import { ColorType, createChart, type ChartOptions, type DeepPartial, type IChartApi } from 'lightweight-charts'
import { onBeforeUnmount, onMounted, shallowRef, watch, type ShallowRef } from 'vue'
import type { ChartPalette } from '@/interfaces/chart'
import { useChartPalette } from './useChartPalette'

type ChartOptionsBuilder = (palette: ChartPalette) => DeepPartial<ChartOptions>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function baseOptions(palette: ChartPalette): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: palette.background },
      textColor: palette.text,
      attributionLogo: false,
    },
    grid: { vertLines: { color: palette.grid }, horzLines: { color: palette.grid } },
    rightPriceScale: { borderColor: palette.grid },
    timeScale: { borderColor: palette.grid },
  }
}

/**
 * Lifecycle for one lightweight-charts instance: created on mount with autoSize (it tracks
 * its container with a ResizeObserver), recolored on theme switch, removed on unmount so no
 * canvas or observer leaks (NFR-P5). Series are the caller's job.
 */
export function useLightweightChart(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  extraOptions: ChartOptionsBuilder = () => ({}),
) {
  const palette = useChartPalette()
  const chart = shallowRef<IChartApi | null>(null)

  /** Caller options win, merged one level deep so e.g. `timeScale` keeps the base border color. */
  function optionsFor(current: ChartPalette): DeepPartial<ChartOptions> {
    const merged: Record<string, unknown> = { ...baseOptions(current) }
    for (const [key, value] of Object.entries(extraOptions(current))) {
      const previous = merged[key]
      merged[key] = isPlainObject(previous) && isPlainObject(value) ? { ...previous, ...value } : value
    }
    return merged as DeepPartial<ChartOptions>
  }

  /** Re-applies options, e.g. after a locale or unit change that the formatters depend on. */
  function refresh(): void {
    chart.value?.applyOptions(optionsFor(palette.value))
  }

  onMounted(() => {
    if (!container.value) return
    chart.value = createChart(container.value, { autoSize: true, ...optionsFor(palette.value) })
  })

  watch(palette, refresh)

  onBeforeUnmount(() => {
    chart.value?.remove()
    chart.value = null
  })

  return { chart, palette, refresh }
}
