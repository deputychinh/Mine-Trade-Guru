import { onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALERT_SOUND } from '@/constants/alerts'
import type { AlertEvent } from '@/interfaces/alert'
import { useAlertStore } from '@/stores/useAlertStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAlertText } from './useAlertText'

/** Asks for browser-notification permission; must be called from a user gesture. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

/**
 * Delivers a triggered alert (FR-33): always an in-app toast, plus an optional chime and an
 * optional OS notification — the latter only while the tab is hidden, so a visible page
 * never shows the same alert twice.
 */
export function useNotifications() {
  const alertStore = useAlertStore()
  const settingsStore = useSettingsStore()
  const { t } = useI18n()
  const { describe } = useAlertText()

  let audio: AudioContext | null = null

  function playChime(): void {
    audio ??= new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const endAt = audio.currentTime + ALERT_SOUND.durationMs / 1_000
    oscillator.frequency.value = ALERT_SOUND.frequencyHz
    gain.gain.setValueAtTime(ALERT_SOUND.gain, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start()
    oscillator.stop(endAt)
  }

  function showSystemNotification(event: AlertEvent): void {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return
    // Tag dedupes if the same event is delivered twice; text is plain, never HTML.
    const notification = new Notification(t('alert.notificationTitle', { symbol: event.symbol }), {
      body: describe(event),
      tag: event.id,
    })
    notification.onclick = () => window.focus()
  }

  function notify(event: AlertEvent): void {
    alertStore.pushToast(event)
    const { isSoundEnabled, isBrowserNotificationEnabled } = settingsStore.settings
    if (isSoundEnabled) playChime()
    if (isBrowserNotificationEnabled) showSystemNotification(event)
  }

  onUnmounted(() => {
    void audio?.close()
    audio = null
  })

  return { notify }
}
