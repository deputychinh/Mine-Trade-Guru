import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * A ref persisted to localStorage (FR-30, FR-42 …). Values read back go through `parse`
 * because storage is user-editable (rule 9.5); anything invalid falls back to the default.
 * Syncs across tabs via the storage event (writing an unchanged value back fires no event,
 * so tabs can't ping-pong). Works in components and Pinia setup stores.
 */
export function useLocalStorage<T>(key: string, defaultValue: T, parse: (raw: unknown) => T | null): Ref<T> {
  function read(): T {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return structuredClone(defaultValue)
      return parse(JSON.parse(raw)) ?? structuredClone(defaultValue)
    } catch {
      return structuredClone(defaultValue)
    }
  }

  const state = ref(read()) as Ref<T>

  watch(
    state,
    (value) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Quota exceeded or storage disabled (private mode): keep working in memory.
      }
    },
    { deep: true },
  )

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) state.value = read()
  }
  window.addEventListener('storage', onStorage)
  if (getCurrentScope()) onScopeDispose(() => window.removeEventListener('storage', onStorage))

  return state
}
