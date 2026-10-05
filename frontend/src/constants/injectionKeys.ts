import type { ComputedRef, InjectionKey } from 'vue'
import type { FormatContext } from '@/interfaces/settings'

/**
 * Locale and display units, provided once by App.vue. Presentational components inject it
 * instead of reading the settings store, so they stay props-in / events-out (rule 9.2).
 */
export const FORMAT_CONTEXT_KEY: InjectionKey<ComputedRef<FormatContext>> = Symbol('formatContext')
