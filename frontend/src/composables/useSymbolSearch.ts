import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { SEARCH_RESULT_LIMIT } from '@/constants/limits'
import type { Instrument } from '@/interfaces/market'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { searchInstruments } from '@/utils/searchIndex'

/**
 * Symbol/name search (FR-40). The index is prebuilt by the instrument store, so each
 * keystroke is one scan over ~1,500 short strings — no debounce needed (NFR-P6).
 */
export function useSymbolSearch(
  query: MaybeRefOrGetter<string>,
  limit: number = SEARCH_RESULT_LIMIT,
): ComputedRef<Instrument[]> {
  const instrumentStore = useInstrumentStore()

  return computed(() =>
    searchInstruments(instrumentStore.searchIndex, toValue(query), limit)
      .map((symbol) => instrumentStore.get(symbol))
      .filter((instrument): instrument is Instrument => instrument !== undefined),
  )
}
