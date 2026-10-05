import { watch } from 'vue'
import { useTheme } from 'vuetify'
import { THEME_NAMES } from '@/constants/settings'
import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * Keeps Vuetify's active theme and the root density/font-scale attributes in sync with the
 * user's settings (FR-42). tokens.css reads the attributes. Call once, from App.vue.
 */
export function useThemeMode(): void {
  const settingsStore = useSettingsStore()
  const theme = useTheme()

  watch(
    () => settingsStore.settings.theme,
    (mode) => void theme.change(THEME_NAMES[mode]),
    { immediate: true },
  )

  watch(
    () => [settingsStore.settings.density, settingsStore.settings.fontScale] as const,
    ([density, fontScale]) => {
      const root = document.documentElement
      root.dataset.density = density
      root.dataset.fontScale = fontScale
    },
    { immediate: true },
  )
}
