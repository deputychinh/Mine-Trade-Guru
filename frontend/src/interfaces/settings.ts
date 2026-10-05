export type ThemeMode = 'dark' | 'light'
export type Density = 'compact' | 'comfortable'
export type FontScale = 'normal' | 'large'
/** Stock prices shown in thousands of VND (iBoard default) or full VND. */
export type PriceUnit = 'thousand' | 'vnd'
/** Volumes shown in lots of 10 shares (iBoard default) or single shares. */
export type VolumeUnit = 'ten' | 'one'
export type Locale = 'vi' | 'en'

export interface Settings {
  theme: ThemeMode
  locale: Locale
  density: Density
  fontScale: FontScale
  priceUnit: PriceUnit
  volumeUnit: VolumeUnit
  isFlashEnabled: boolean
  isSoundEnabled: boolean
  isBrowserNotificationEnabled: boolean
}

/** What a formatter needs to know; derived from Settings. */
export interface FormatContext {
  locale: Locale
  priceUnit: PriceUnit
  volumeUnit: VolumeUnit
}
