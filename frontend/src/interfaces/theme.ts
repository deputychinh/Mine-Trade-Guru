export type MarketColorToken =
  | 'market-ceiling'
  | 'market-floor'
  | 'market-reference'
  | 'market-up'
  | 'market-down'

export type M3RoleColor =
  | 'primary'
  | 'on-primary'
  | 'primary-container'
  | 'on-primary-container'
  | 'secondary'
  | 'on-secondary'
  | 'secondary-container'
  | 'on-secondary-container'
  | 'tertiary'
  | 'on-tertiary'
  | 'tertiary-container'
  | 'on-tertiary-container'
  | 'error'
  | 'on-error'
  | 'error-container'
  | 'on-error-container'
  | 'background'
  | 'on-background'
  | 'surface'
  | 'on-surface'
  | 'surface-variant'
  | 'on-surface-variant'
  | 'surface-container-lowest'
  | 'surface-container-low'
  | 'surface-container'
  | 'surface-container-high'
  | 'surface-container-highest'
  | 'outline'
  | 'outline-variant'
  | 'inverse-surface'
  | 'inverse-on-surface'
  | 'inverse-primary'
  | 'scrim'

/** Vuetify requires these semantic colors in every theme. */
export type StatusColor = 'success' | 'on-success' | 'warning' | 'on-warning' | 'info' | 'on-info'

export type ThemeColorName = M3RoleColor | StatusColor | MarketColorToken

/** One complete palette. `Record` makes a missing or misspelled color a compile error (rule C6). */
export type ThemeScheme = Record<ThemeColorName, string>
