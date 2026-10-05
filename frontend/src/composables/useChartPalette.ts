import { computed, type ComputedRef } from 'vue'
import { useTheme } from 'vuetify'
import type { ChartPalette } from '@/interfaces/chart'

/**
 * Canvas charts can't read CSS variables, so they get resolved colors from the active
 * Vuetify theme (rule C8). Recomputes on theme switch; charts re-apply it.
 */
export function useChartPalette(): ComputedRef<ChartPalette> {
  const theme = useTheme()

  return computed(() => {
    const colors = theme.current.value.colors
    const pick = (name: string): string => {
      const value = colors[name]
      return typeof value === 'string' ? value : ''
    }
    return {
      background: pick('surface-container-low'),
      text: pick('on-surface-variant'),
      grid: pick('outline-variant'),
      up: pick('market-up'),
      down: pick('market-down'),
      reference: pick('market-reference'),
      ceiling: pick('market-ceiling'),
      floor: pick('market-floor'),
      line: pick('primary'),
    }
  })
}
