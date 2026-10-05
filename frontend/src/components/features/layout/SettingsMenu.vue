<template>
  <BaseMenu :is-closed-on-content-click="false" location="bottom">
    <template #activator="{ props: activatorProps }">
      <BaseIconButton v-bind="activatorProps" icon="settings" :label="t('settings.title')" />
    </template>
    <div class="settings-menu">
      <p class="settings-menu__title">{{ t('settings.title') }}</p>
      <v-btn-toggle
        :model-value="settings.theme"
        mandatory
        divided
        density="compact"
        :aria-label="t('settings.theme.label')"
        class="settings-menu__theme"
        @update:model-value="emit('change', { theme: $event })"
      >
        <BaseButton v-for="option in THEME_OPTIONS" :key="option.value" :value="option.value" variant="text" size="small" :prepend-icon="option.icon">
          {{ t(option.labelKey) }}
        </BaseButton>
      </v-btn-toggle>
      <BaseSelect :model-value="settings.locale" :items="localeOptions" :label="t('settings.language')" @update:model-value="emit('change', { locale: $event })" />
      <BaseSelect :model-value="settings.density" :items="options(DENSITY_OPTIONS)" :label="t('settings.density.label')" @update:model-value="emit('change', { density: $event })" />
      <BaseSelect :model-value="settings.fontScale" :items="options(FONT_SCALE_OPTIONS)" :label="t('settings.fontScale.label')" @update:model-value="emit('change', { fontScale: $event })" />
      <BaseSelect :model-value="settings.priceUnit" :items="options(PRICE_UNIT_OPTIONS)" :label="t('settings.priceUnit.label')" @update:model-value="emit('change', { priceUnit: $event })" />
      <BaseSelect :model-value="settings.volumeUnit" :items="options(VOLUME_UNIT_OPTIONS)" :label="t('settings.volumeUnit.label')" @update:model-value="emit('change', { volumeUnit: $event })" />
      <BaseSwitch :model-value="settings.isFlashEnabled" :label="t('settings.flash')" @update:model-value="emit('change', { isFlashEnabled: $event })" />
      <BaseSwitch :model-value="settings.isSoundEnabled" :label="t('settings.sound')" @update:model-value="emit('change', { isSoundEnabled: $event })" />
      <BaseSwitch :model-value="settings.isBrowserNotificationEnabled" :label="t('settings.notifications')" @update:model-value="toggleNotifications" />
      <BaseButton variant="text" size="small" prepend-icon="retry" @click="emit('reset')">{{ t('settings.reset') }}</BaseButton>
    </div>
  </BaseMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseMenu from '@/components/base/BaseMenu.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import {
  DENSITY_OPTIONS,
  FONT_SCALE_OPTIONS,
  LOCALE_OPTIONS,
  PRICE_UNIT_OPTIONS,
  THEME_OPTIONS,
  VOLUME_UNIT_OPTIONS,
} from '@/constants/settings'
import type { Locale, Settings } from '@/interfaces/settings'
import type { SelectOption } from '@/interfaces/ui'

/**
 * Theme, language, density, units, flash, sound and notifications (FR-04, FR-06, FR-07,
 * FR-42, FR-43). Turning notifications on is a request: the container asks the browser first.
 */
const { settings } = defineProps<{
  settings: Settings
}>()

const emit = defineEmits<{
  change: [patch: Partial<Settings>]
  requestNotifications: []
  reset: []
}>()

const { t } = useI18n()

const localeOptions = computed<SelectOption<Locale>[]>(() =>
  LOCALE_OPTIONS.map((option) => ({ value: option.value, title: option.label })),
)

function options<T extends string>(list: ReadonlyArray<{ value: T; labelKey: string }>): SelectOption<T>[] {
  return list.map((option) => ({ value: option.value, title: t(option.labelKey) }))
}

function toggleNotifications(isEnabled: boolean): void {
  if (isEnabled) emit('requestNotifications')
  else emit('change', { isBrowserNotificationEnabled: false })
}
</script>

<style scoped>
.settings-menu {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-2);
  padding: var(--mtg-space-3) var(--mtg-space-4);
}

.settings-menu__title {
  margin: 0;
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
}

.settings-menu__theme {
  align-self: flex-start;
}
</style>
