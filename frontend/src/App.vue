<template>
  <RouterView />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppLocale } from '@/composables/useAppLocale'
import { provideFormatContext } from '@/composables/useFormatContext'
import { usePriceAlerts } from '@/composables/usePriceAlerts'
import { useThemeMode } from '@/composables/useThemeMode'
import { useSettingsStore } from '@/stores/useSettingsStore'

/** Root: app-wide reactive wiring only (format context, theme, locale, alert evaluation). */
const settingsStore = useSettingsStore()

provideFormatContext(computed(() => settingsStore.formatContext))
useThemeMode()
useAppLocale()
usePriceAlerts()
</script>
