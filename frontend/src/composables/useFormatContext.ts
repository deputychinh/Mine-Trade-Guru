import { computed, inject, provide, type ComputedRef } from 'vue'
import { FORMAT_CONTEXT_KEY } from '@/constants/injectionKeys'
import { DEFAULT_SETTINGS } from '@/constants/settings'
import type { FormatContext } from '@/interfaces/settings'

const FALLBACK: FormatContext = {
  locale: DEFAULT_SETTINGS.locale,
  priceUnit: DEFAULT_SETTINGS.priceUnit,
  volumeUnit: DEFAULT_SETTINGS.volumeUnit,
}

/** Called once by App.vue with the settings store's formatContext. */
export function provideFormatContext(context: ComputedRef<FormatContext>): void {
  provide(FORMAT_CONTEXT_KEY, context)
}

/** Locale + units for presentational components, without touching a store (rule 9.2). */
export function useFormatContext(): ComputedRef<FormatContext> {
  return inject(
    FORMAT_CONTEXT_KEY,
    computed(() => FALLBACK),
    false,
  )
}
