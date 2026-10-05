/* eslint-disable vue/one-component-per-file -- tiny inline harness components host the composables under test */
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { usePriceAlerts } from '@/composables/usePriceAlerts'
import { usePriceFlash } from '@/composables/usePriceFlash'
import { useKeyboardShortcuts, type ShortcutHandlers } from '@/composables/useKeyboardShortcuts'
import { useAlertStore } from '@/stores/useAlertStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { makeQuote, makeSnapshot } from '../../helpers/fixtures'
import { mountWithPlugins } from '../../helpers/mountWithPlugins'

describe('usePriceFlash', () => {
  function setup(isEnabled = true) {
    const value = ref<number | null>(100)
    const holder: { flash: Readonly<Ref<string>> | null } = { flash: null }
    mount(
      defineComponent({
        setup() {
          holder.flash = usePriceFlash(value, isEnabled)
          return () => h('div')
        },
      }),
    )
    return { value, flash: () => holder.flash?.value }
  }

  it('flashes by direction and alternates classes to restart the animation', async () => {
    const { value, flash } = setup()
    expect(flash()).toBe('')
    value.value = 101
    await nextTick()
    expect(flash()).toBe('mtg-flash-up-alt')
    value.value = 102
    await nextTick()
    expect(flash()).toBe('mtg-flash-up')
    value.value = 99
    await nextTick()
    expect(flash()).toBe('mtg-flash-down-alt')
  })

  it('stays quiet when flashing is off or the value appears for the first time', async () => {
    const off = setup(false)
    off.value.value = 101
    await nextTick()
    expect(off.flash()).toBe('')

    const fresh = setup()
    fresh.value.value = null
    await nextTick()
    fresh.value.value = 105
    await nextTick()
    expect(fresh.flash()).toBe('')
  })
})

describe('useKeyboardShortcuts', () => {
  function setup(handlers: ShortcutHandlers) {
    return mount(
      defineComponent({
        setup() {
          useKeyboardShortcuts(handlers)
          return () => h('div', [h('input', { id: 'field' }), h('button', { id: 'button' })])
        },
      }),
      { attachTo: document.body },
    )
  }

  function press(key: string, target: EventTarget = window, init: KeyboardEventInit = {}) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
  }

  it('runs the mapped action and ignores modifiers and typing', () => {
    const focusSearch = vi.fn()
    const openDetail = vi.fn()
    const wrapper = setup({ focusSearch, openDetail })

    press('/')
    expect(focusSearch).toHaveBeenCalledTimes(1)
    press('/', window, { ctrlKey: true })
    press('/', wrapper.find('#field').element)
    expect(focusSearch).toHaveBeenCalledTimes(1)

    // Enter on a button belongs to the button, not to "open detail".
    press('Enter', wrapper.find('#button').element)
    expect(openDetail).not.toHaveBeenCalled()
    press('Enter')
    expect(openDetail).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('usePriceAlerts', () => {
  it('records an event and queues a toast when a rule becomes true', async () => {
    mountWithPlugins(
      defineComponent({
        setup() {
          usePriceAlerts()
          return () => h('div')
        },
      }),
    )
    const market = useMarketStore()
    const alerts = useAlertStore()
    alerts.addRule({ symbol: 'FPT', condition: 'PRICE_ABOVE', threshold: 101_000 })
    market.applySnapshot(makeSnapshot([makeQuote({ lastPrice: 100_000 })]))
    await flushPromises()

    market.applyPatch({
      quotes: [makeQuote({ v: 2, lastPrice: 101_500 })],
      indices: [],
      sessions: [],
      trades: [],
      serverTs: null,
      lastTickAt: null,
    })
    await flushPromises()

    expect(alerts.events).toHaveLength(1)
    expect(alerts.events[0]).toMatchObject({ symbol: 'FPT', value: 101_500 })
    expect(alerts.toasts).toHaveLength(1)
  })
})
