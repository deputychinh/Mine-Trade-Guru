import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { DEFAULT_SETTINGS } from '@/constants/settings'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { FormatContext, Settings } from '@/interfaces/settings'
import { parseSettings } from '@/utils/storageParsers'

/** User preferences (FR-06, FR-07, FR-42, FR-43), persisted per browser. */
export const useSettingsStore = defineStore('settings', () => {
  const settings = useLocalStorage<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS, parseSettings)

  const formatContext = computed<FormatContext>(() => ({
    locale: settings.value.locale,
    priceUnit: settings.value.priceUnit,
    volumeUnit: settings.value.volumeUnit,
  }))

  function update<K extends keyof Settings>(key: K, value: Settings[K]): void {
    settings.value = { ...settings.value, [key]: value }
  }

  function patch(partial: Partial<Settings>): void {
    settings.value = { ...settings.value, ...partial }
  }

  function reset(): void {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return { settings, formatContext, update, patch, reset }
})
