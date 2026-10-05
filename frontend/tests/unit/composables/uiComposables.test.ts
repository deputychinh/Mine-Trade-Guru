import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { useAlertText } from '@/composables/useAlertText'
import { useAppLocale } from '@/composables/useAppLocale'
import { useChartPalette } from '@/composables/useChartPalette'
import { useElementSize } from '@/composables/useElementSize'
import { useFullscreen } from '@/composables/useFullscreen'
import { useLightweightChart } from '@/composables/useLightweightChart'
import { requestNotificationPermission, useNotifications } from '@/composables/useNotifications'
import { useNow } from '@/composables/useNow'
import { useSymbolSearch } from '@/composables/useSymbolSearch'
import { useThemeMode } from '@/composables/useThemeMode'
import { DARK_SCHEME } from '@/constants/themeColors'
import type { AlertEvent } from '@/interfaces/alert'
import { useAlertStore } from '@/stores/useAlertStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { makeInstrument } from '../../helpers/fixtures'
import { mountWithPlugins } from '../../helpers/mountWithPlugins'

const charts = vi.hoisted(() => {
  const chart = { applyOptions: vi.fn(), remove: vi.fn() }
  return { chart, createChart: vi.fn(() => chart) }
})
vi.mock('lightweight-charts', async (importOriginal) => ({ ...(await importOriginal<object>()), createChart: charts.createChart }))

/** Runs a composable inside a mounted component (with app plugins) and returns its result. */
function withSetup<T>(composable: () => T, render: () => ReturnType<typeof h> = () => h('div')) {
  let result!: T
  const wrapper = mountWithPlugins(
    defineComponent({
      setup() {
        result = composable()
        return render
      },
    }),
    { attachTo: document.body },
  )
  return { result, wrapper }
}

describe('useNow', () => {
  it('ticks every interval and stops on unmount', () => {
    vi.useFakeTimers({ now: 1_000 })
    const { result, wrapper } = withSetup(() => useNow(500))
    vi.advanceTimersByTime(500)
    expect(result.value).toBe(1_500)
    wrapper.unmount()
    vi.advanceTimersByTime(5_000)
    expect(result.value).toBe(1_500)
  })
})

describe('useFullscreen', () => {
  it('requests and exits fullscreen and follows the browser state', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    let element: Element | null = null
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element })
    document.documentElement.requestFullscreen = vi.fn(async () => {
      element = document.documentElement
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    document.exitFullscreen = vi.fn(async () => {
      element = null
      document.dispatchEvent(new Event('fullscreenchange'))
    })

    const { result } = withSetup(() => useFullscreen())
    await result.toggle()
    expect(result.isFullscreen.value).toBe(true)
    await result.toggle()
    expect(result.isFullscreen.value).toBe(false)
  })
})

describe('useElementSize', () => {
  it('reports the observed content size', () => {
    let callback: ResizeObserverCallback = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          callback = cb
        }
        observe() {}
        disconnect() {}
      },
    )
    const target = shallowRef<HTMLElement | null>(null)
    const { result } = withSetup(
      () => useElementSize(target),
      () => h('div', { ref: (el) => (target.value = el as HTMLElement) }),
    )
    callback([{ contentRect: { width: 320.4, height: 199.6 } } as ResizeObserverEntry], {} as ResizeObserver)
    expect([result.width.value, result.height.value]).toEqual([320, 200])
    vi.unstubAllGlobals()
  })
})

describe('useSymbolSearch', () => {
  it('returns instruments for the query', () => {
    const query = ref('fp')
    const { result } = withSetup(() => {
      useInstrumentStore().instruments = [makeInstrument(), makeInstrument({ symbol: 'VCB', name: 'Vietcombank' })]
      return useSymbolSearch(query)
    })
    expect(result.value.map((item) => item.symbol)).toEqual(['FPT'])
    query.value = 'vietcom'
    expect(result.value.map((item) => item.symbol)).toEqual(['VCB'])
  })
})

describe('useAppLocale and useThemeMode', () => {
  it('follow the settings store', async () => {
    withSetup(() => {
      useAppLocale()
      useThemeMode()
    })
    const settings = useSettingsStore()
    settings.patch({ locale: 'en', density: 'compact', fontScale: 'large' })
    await nextTick()
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dataset.density).toBe('compact')
    expect(document.documentElement.dataset.fontScale).toBe('large')
  })
})

describe('chart composables', () => {
  it('resolves the palette from the active theme', () => {
    const { result } = withSetup(() => useChartPalette())
    expect(result.value.up).toBe(DARK_SCHEME['market-up'])
    expect(result.value.grid).toBe(DARK_SCHEME['outline-variant'])
  })

  it('creates the chart on mount, merges options and removes it on unmount', () => {
    const container = shallowRef<HTMLElement | null>(null)
    const { result, wrapper } = withSetup(
      () => useLightweightChart(container, () => ({ timeScale: { visible: false } })),
      () => h('div', { ref: (el) => (container.value = el as HTMLElement) }),
    )
    expect(charts.createChart).toHaveBeenCalledTimes(1)
    const options = charts.createChart.mock.calls[0] as unknown as [HTMLElement, { autoSize: boolean; timeScale: { visible: boolean; borderColor: string } }]
    expect(options[1].autoSize).toBe(true)
    expect(options[1].timeScale).toEqual({ borderColor: DARK_SCHEME['outline-variant'], visible: false })
    result.refresh()
    expect(charts.chart.applyOptions).toHaveBeenCalled()
    wrapper.unmount()
    expect(charts.chart.remove).toHaveBeenCalled()
  })
})

describe('alert text and notifications', () => {
  const event: AlertEvent = {
    id: 'e1',
    ruleId: 'r1',
    symbol: 'FPT',
    condition: 'PRICE_ABOVE',
    threshold: 100_000,
    value: 101_500,
    triggeredAt: Date.UTC(2026, 0, 5, 2, 15, 30),
    isRead: false,
  }

  it('describes events and rules in display units', () => {
    const { result } = withSetup(() => useAlertText())
    // Numbers follow the settings locale (default Vietnamese), not the i18n instance.
    useSettingsStore().patch({ locale: 'en' })
    expect(result.describe(event)).toBe('FPT: Price ≥ — 101.50')
    expect(result.toView(event)).toMatchObject({ id: 'e1', time: '09:15:30', isRead: false })
    expect(
      result.describeRule({ id: 'r', symbol: 'FPT', condition: 'HITS_CEILING', threshold: null, isEnabled: true, createdAt: 0, lastTriggeredAt: null }),
    ).toBe('Hits ceiling')
  })

  it('always toasts, and uses a system notification only when hidden and allowed', async () => {
    const shown = vi.fn()
    vi.stubGlobal(
      'Notification',
      Object.assign(
        class {
          onclick: (() => void) | null = null
          constructor(title: string) {
            shown(title)
          }
        },
        { permission: 'granted', requestPermission: vi.fn(async () => 'granted') },
      ),
    )
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    const { result } = withSetup(() => useNotifications())
    useSettingsStore().patch({ isBrowserNotificationEnabled: true })
    result.notify(event)
    expect(useAlertStore().toasts).toHaveLength(1)
    expect(shown).toHaveBeenCalledWith('FPT alert')
    expect(await requestNotificationPermission()).toBe(true)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    vi.unstubAllGlobals()
    await flushPromises()
  })

  it('does not ask again once the browser denied permission', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() })
    expect(await requestNotificationPermission()).toBe(false)
    vi.unstubAllGlobals()
  })
})
