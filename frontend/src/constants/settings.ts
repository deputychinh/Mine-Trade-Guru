import type { Density, FontScale, Locale, PriceUnit, Settings, ThemeMode, VolumeUnit } from '@/interfaces/settings'
import type { IconName } from './icons'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  locale: 'vi',
  density: 'comfortable',
  fontScale: 'normal',
  priceUnit: 'thousand',
  volumeUnit: 'ten',
  isFlashEnabled: true,
  isSoundEnabled: false,
  isBrowserNotificationEnabled: false,
}

/** Language names are shown in their own language, so they are not translated. */
export const LOCALE_OPTIONS: ReadonlyArray<{ value: Locale; label: string }> = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

/** BCP 47 tags for Intl.NumberFormat / DateTimeFormat (NFR-U5). */
export const INTL_LOCALES: Record<Locale, string> = {
  vi: 'vi-VN',
  en: 'en-US',
}

/** All market times are shown in Vietnam time regardless of the viewer's timezone. */
export const MARKET_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export const THEME_NAMES = {
  dark: 'mtgDark',
  light: 'mtgLight',
} as const

type LabelledOption<T> = Readonly<{ value: T; labelKey: string }>

export const THEME_OPTIONS: ReadonlyArray<LabelledOption<ThemeMode> & { icon: IconName }> = [
  { value: 'dark', labelKey: 'settings.theme.dark', icon: 'themeDark' },
  { value: 'light', labelKey: 'settings.theme.light', icon: 'themeLight' },
]

export const DENSITY_OPTIONS: ReadonlyArray<LabelledOption<Density>> = [
  { value: 'comfortable', labelKey: 'settings.density.comfortable' },
  { value: 'compact', labelKey: 'settings.density.compact' },
]

export const FONT_SCALE_OPTIONS: ReadonlyArray<LabelledOption<FontScale>> = [
  { value: 'normal', labelKey: 'settings.fontScale.normal' },
  { value: 'large', labelKey: 'settings.fontScale.large' },
]

export const PRICE_UNIT_OPTIONS: ReadonlyArray<LabelledOption<PriceUnit>> = [
  { value: 'thousand', labelKey: 'settings.priceUnit.thousand' },
  { value: 'vnd', labelKey: 'settings.priceUnit.vnd' },
]

export const VOLUME_UNIT_OPTIONS: ReadonlyArray<LabelledOption<VolumeUnit>> = [
  { value: 'ten', labelKey: 'settings.volumeUnit.ten' },
  { value: 'one', labelKey: 'settings.volumeUnit.one' },
]
