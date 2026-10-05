import type { IconName } from '@/constants/icons'

// Shapes shared by components/base/* and their callers.

export type ButtonVariant = 'flat' | 'tonal' | 'outlined' | 'text' | 'elevated' | 'plain'
export type ComponentSize = 'x-small' | 'small' | 'default' | 'large'
export type PopupLocation = 'top' | 'bottom' | 'start' | 'end'

export interface SelectOption<T> {
  value: T
  title: string
}

export interface TabItem<T extends string = string> {
  value: T
  label: string
  icon?: IconName
  /** Small count shown after the label (e.g. watchlist size). */
  count?: number
}

/** Why the feed banner is shown above the board (NFR-R3). */
export type FeedBannerKind = 'stale' | 'reconnecting' | 'offline'
