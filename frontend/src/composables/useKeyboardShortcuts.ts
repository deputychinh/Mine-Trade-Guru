import { onMounted, onUnmounted } from 'vue'
import { SHORTCUTS, type ShortcutAction } from '@/constants/shortcuts'

export type ShortcutHandlers = Partial<Record<ShortcutAction, (event: KeyboardEvent) => void>>

const ACTION_BY_KEY = new Map<string, ShortcutAction>(
  (Object.entries(SHORTCUTS) as Array<[ShortcutAction, string]>).map(([action, key]) => [key.toLowerCase(), action]),
)

const ACTIVATION_KEYS = new Set(['Enter', ' '])
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const ARROW_OWNERS = '[role="tablist"], [role="listbox"], [role="menu"], [role="radiogroup"], [role="slider"]'

/** True when the focused element needs this key itself (typing, pressing a button, moving in tabs). */
function isOwnedByTarget(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  if (ACTIVATION_KEYS.has(key) && target.closest('button, a[href], [role="button"]')) return true
  return ARROW_KEYS.has(key) && target.closest(ARROW_OWNERS) !== null
}

/**
 * Global keyboard shortcuts (FR-41). Ignored while the focused control needs the key, or
 * while a modifier is held (so browser shortcuts like Ctrl+F keep working). Several
 * containers may register disjoint sets of actions.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
    if (isOwnedByTarget(event.target, event.key)) return
    const action = ACTION_BY_KEY.get(event.key.toLowerCase())
    const handler = action ? handlers[action] : undefined
    if (!handler) return
    event.preventDefault()
    handler(event)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
