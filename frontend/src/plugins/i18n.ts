import { createI18n } from 'vue-i18n'
import { en as vuetifyEn, vi as vuetifyVi } from 'vuetify/locale'
import { DEFAULT_SETTINGS } from '@/constants/settings'
import type { Locale } from '@/interfaces/settings'
import en from '@/locales/en.json'
import vi from '@/locales/vi.json'

export type MessageSchema = typeof vi

/** FR-43. Vuetify's own component strings live under $vuetify so one locale switch covers both. */
export function createAppI18n(locale: Locale = DEFAULT_SETTINGS.locale) {
  return createI18n<[MessageSchema], Locale, false>({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: {
      vi: { ...vi, $vuetify: vuetifyVi },
      en: { ...en, $vuetify: vuetifyEn },
    } as unknown as Record<Locale, MessageSchema>,
  })
}

export const i18n = createAppI18n()
