import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * One locale switch for app strings, Vuetify strings (via the vue-i18n adapter) and
 * <html lang> so screen readers pronounce Vietnamese correctly (FR-43, NFR-U4).
 * Call once, from App.vue.
 */
export function useAppLocale(): void {
  const settingsStore = useSettingsStore()
  const { locale } = useI18n({ useScope: 'global' })

  watch(
    () => settingsStore.settings.locale,
    (next) => {
      locale.value = next
      document.documentElement.lang = next
    },
    { immediate: true },
  )
}
