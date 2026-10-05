import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { fetchInstruments } from '@/api/marketApi'
import type { Instrument } from '@/interfaces/market'
import { buildSearchIndex } from '@/utils/searchIndex'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Static catalogue (symbol metadata). Loaded once; the search index is built once from it (NFR-P6). */
export const useInstrumentStore = defineStore('instruments', () => {
  const instruments = shallowRef<readonly Instrument[]>([])
  const status = ref<LoadStatus>('idle')
  const error = ref<string | null>(null)

  const bySymbol = computed<ReadonlyMap<string, Instrument>>(
    () => new Map(instruments.value.map((instrument) => [instrument.symbol, instrument])),
  )
  const searchIndex = computed(() => buildSearchIndex(instruments.value))

  async function load(): Promise<void> {
    if (status.value === 'loading' || status.value === 'ready') return
    status.value = 'loading'
    error.value = null
    try {
      instruments.value = await fetchInstruments()
      status.value = 'ready'
    } catch (cause) {
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : String(cause)
    }
  }

  function get(symbol: string): Instrument | undefined {
    return bySymbol.value.get(symbol)
  }

  return { instruments, status, error, bySymbol, searchIndex, load, get }
})
