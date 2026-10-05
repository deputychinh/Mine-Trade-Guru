import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { useMarketFeed } from '@/composables/useMarketFeed'
import type { WorkerInbound, WorkerOutbound } from '@/interfaces/worker'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { makeQuote, makeSnapshot } from '../../helpers/fixtures'

const api = vi.hoisted(() => ({ fetchSnapshot: vi.fn() }))
vi.mock('@/api/marketApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))

class FakeWorker extends EventTarget {
  readonly sent: WorkerInbound[] = []
  isTerminated = false
  postMessage(message: WorkerInbound): void {
    this.sent.push(message)
  }
  terminate(): void {
    this.isTerminated = true
  }
  emit(message: WorkerOutbound): void {
    this.dispatchEvent(new MessageEvent('message', { data: message }))
  }
}

function setup() {
  const worker = new FakeWorker()
  const wrapper = mount(
    defineComponent({
      setup() {
        useMarketFeed({ createWorker: () => worker as unknown as Worker })
        return () => h('div')
      },
    }),
  )
  return { worker, wrapper }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle))
})

describe('useMarketFeed', () => {
  it('starts the worker with pause, track and connect', () => {
    const { worker } = setup()
    expect(worker.sent.map((message) => message.type)).toEqual(['pause', 'track', 'connect'])
  })

  it('loads the snapshot on request and hands it to the worker', async () => {
    api.fetchSnapshot.mockResolvedValue(makeSnapshot())
    const { worker } = setup()
    worker.emit({ type: 'needSnapshot', reason: 'initial' })
    await flushPromises()
    expect(useMarketStore().hasSnapshot).toBe(true)
    expect(worker.sent.at(-1)?.type).toBe('snapshot')
  })

  it('retries a failed snapshot with backoff and shows the error', async () => {
    vi.useFakeTimers()
    api.fetchSnapshot.mockRejectedValueOnce(new Error('down')).mockResolvedValue(makeSnapshot())
    const { worker } = setup()
    worker.emit({ type: 'needSnapshot', reason: 'reconnect' })
    await flushPromises()
    expect(useConnectionStore().snapshotError).toBe('down')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(useConnectionStore().snapshotError).toBeNull()
    expect(useConnectionStore().resyncCount).toBe(2)
  })

  it('applies patches once per frame and mirrors status', async () => {
    api.fetchSnapshot.mockResolvedValue(makeSnapshot())
    const { worker } = setup()
    worker.emit({ type: 'needSnapshot', reason: 'initial' })
    await flushPromises()

    worker.emit({ type: 'status', status: 'open', attempt: 0, retryInMs: null })
    const patch = (v: number) => ({ quotes: [makeQuote({ v, lastPrice: 100_000 + v })], indices: [], sessions: [], trades: [], serverTs: null, lastTickAt: v })
    worker.emit({ type: 'patch', patch: patch(2) })
    worker.emit({ type: 'patch', patch: patch(3) })
    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(useMarketStore().quote('FPT')?.v).toBe(3)
    expect(useConnectionStore().status).toBe('open')
    expect(useConnectionStore().lastTickAt).toBe(3)
  })

  it('forwards pause to the worker and shuts down on unmount', async () => {
    const { worker, wrapper } = setup()
    useConnectionStore().togglePause()
    await nextTick()
    expect(worker.sent.at(-1)).toEqual({ type: 'pause', isPaused: true })

    wrapper.unmount()
    expect(worker.sent.at(-1)?.type).toBe('disconnect')
    expect(worker.isTerminated).toBe(true)
    expect(useConnectionStore().status).toBe('idle')
  })
})
