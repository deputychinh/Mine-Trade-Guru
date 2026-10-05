import { onMounted, onUnmounted, readonly, ref } from 'vue'

/** Board-only fullscreen for wall displays (FR-44). */
export function useFullscreen() {
  const isFullscreen = ref(false)
  const isSupported = typeof document !== 'undefined' && document.fullscreenEnabled

  function sync(): void {
    isFullscreen.value = document.fullscreenElement !== null
  }

  async function toggle(): Promise<void> {
    if (!isSupported) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }

  onMounted(() => {
    sync()
    document.addEventListener('fullscreenchange', sync)
  })
  onUnmounted(() => document.removeEventListener('fullscreenchange', sync))

  return { isFullscreen: readonly(isFullscreen), isSupported, toggle }
}
