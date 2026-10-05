import type { ThemeColorName } from '@/interfaces/theme'
import type { ConnectionStatus } from '@/interfaces/websocket'
import type { IconName } from './icons'

/** How each feed state looks in the header (FR-45). Kept out of feed.ts so the worker never imports icons. */
export const CONNECTION_STATUS_VIEW: Record<ConnectionStatus, { icon: IconName; color: ThemeColorName; labelKey: string }> = {
  idle: { icon: 'offline', color: 'outline', labelKey: 'connection.idle' },
  connecting: { icon: 'reconnecting', color: 'warning', labelKey: 'connection.connecting' },
  open: { icon: 'connected', color: 'success', labelKey: 'connection.open' },
  reconnecting: { icon: 'reconnecting', color: 'warning', labelKey: 'connection.reconnecting' },
  offline: { icon: 'offline', color: 'error', labelKey: 'connection.offline' },
}
