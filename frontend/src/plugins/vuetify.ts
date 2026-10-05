import 'vuetify/styles'
import { useI18n } from 'vue-i18n'
import { createVuetify } from 'vuetify'
import { md3 } from 'vuetify/blueprints'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { THEME_NAMES } from '@/constants/settings'
import { DARK_SCHEME, LIGHT_SCHEME } from '@/constants/themeColors'
import type { ThemeMode } from '@/interfaces/settings'
import type { createAppI18n } from './i18n'

type VueI18nAdapterOptions = Parameters<typeof createVueI18nAdapter>[0]

/** docs/design-system.md §6 — md3 blueprint, both schemes from themeColors.ts (rule C1). */
export function createAppVuetify(i18n: ReturnType<typeof createAppI18n>, theme: ThemeMode = 'dark') {
  return createVuetify({
    blueprint: md3,
    // The adapter is typed for an untyped I18n; ours carries the message schema, which it doesn't need.
    locale: { adapter: createVueI18nAdapter({ i18n: i18n as unknown as VueI18nAdapterOptions['i18n'], useI18n }) },
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    theme: {
      defaultTheme: THEME_NAMES[theme],
      // Shades come from M3 tones in themeColors.ts, not Vuetify's lighten/darken.
      variations: false,
      themes: {
        [THEME_NAMES.dark]: { dark: true, colors: DARK_SCHEME },
        [THEME_NAMES.light]: { dark: false, colors: LIGHT_SCHEME },
      },
    },
    defaults: {
      global: { density: 'comfortable' },
      VBtn: { rounded: 'xl' },
      VCard: { rounded: 'lg', elevation: 0, color: 'surface-container' },
      VChip: { rounded: 'sm' },
      VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
      VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
      VSwitch: { color: 'primary', density: 'compact', hideDetails: true, inset: true },
      VNavigationDrawer: { color: 'surface-container-high' },
      VList: { bgColor: 'surface-container-high', density: 'compact' },
      VTooltip: { location: 'bottom' },
      VSnackbar: { color: 'inverse-surface' },
    },
  })
}
