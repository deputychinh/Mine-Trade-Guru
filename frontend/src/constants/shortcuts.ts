/** FR-41. Values are KeyboardEvent.key. */
export const SHORTCUTS = {
  focusSearch: '/',
  rowUp: 'ArrowUp',
  rowDown: 'ArrowDown',
  openDetail: 'Enter',
  toggleWatch: 'w',
  closeDrawer: 'Escape',
  togglePause: 'p',
  toggleFullscreen: 'f',
  help: '?',
} as const

export type ShortcutAction = keyof typeof SHORTCUTS

export const SHORTCUT_HELP: ReadonlyArray<{ action: ShortcutAction; display: string; labelKey: string }> = [
  { action: 'focusSearch', display: '/', labelKey: 'shortcut.focusSearch' },
  { action: 'rowUp', display: '↑', labelKey: 'shortcut.rowUp' },
  { action: 'rowDown', display: '↓', labelKey: 'shortcut.rowDown' },
  { action: 'openDetail', display: 'Enter', labelKey: 'shortcut.openDetail' },
  { action: 'toggleWatch', display: 'W', labelKey: 'shortcut.toggleWatch' },
  { action: 'closeDrawer', display: 'Esc', labelKey: 'shortcut.closeDrawer' },
  { action: 'togglePause', display: 'P', labelKey: 'shortcut.togglePause' },
  { action: 'toggleFullscreen', display: 'F', labelKey: 'shortcut.toggleFullscreen' },
  { action: 'help', display: '?', labelKey: 'shortcut.help' },
]
