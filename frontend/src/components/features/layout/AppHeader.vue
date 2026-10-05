<template>
  <div class="app-header">
    <RouterLink :to="{ name: ROUTE_NAMES.board }" class="app-header__brand" :aria-label="t('app.name')">
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <span v-if="smAndUp" class="app-header__title">{{ t('app.name') }}</span>
    </RouterLink>
    <GlobalSearch ref="search" class="app-header__search" />
    <SessionIndicator v-if="lgAndUp" :items="visibleSessionItems" class="app-header__sessions" />
    <div class="app-header__actions">
      <ConnectionIndicator
        :status="connectionStore.status"
        :is-paused="connectionStore.isPaused"
        :seconds-since-tick="secondsSinceTick"
        :is-compact="xs"
        @toggle-pause="connectionStore.togglePause()"
      />
      <BaseBadge :content="alertStore.unreadCount" :is-visible="alertStore.unreadCount > 0">
        <BaseIconButton :icon="alertStore.unreadCount > 0 ? 'alertsActive' : 'alerts'" :label="t('alert.center')" @click="emit('openAlerts')" />
      </BaseBadge>
      <BaseIconButton icon="list" :label="t('watchlist.manage')" @click="emit('openWatchlists')" />
      <SettingsMenu
        :settings="settingsStore.settings"
        @change="settingsStore.patch"
        @request-notifications="enableNotifications"
        @reset="settingsStore.reset()"
      />
      <!-- Keyboard shortcuts and fullscreen are desktop features; phones keep the header to one line. -->
      <BaseIconButton v-if="smAndUp" icon="shortcuts" :label="t('shortcut.title')" @click="emit('openShortcuts')" />
      <BaseIconButton
        v-if="isSupported && smAndUp"
        :icon="isFullscreen ? 'fullscreenExit' : 'fullscreen'"
        :label="t(isFullscreen ? 'app.exitFullscreen' : 'app.fullscreen')"
        :is-pressed="isFullscreen"
        @click="toggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { useFullscreen } from '@/composables/useFullscreen'
import { requestNotificationPermission } from '@/composables/useNotifications'
import { useNow } from '@/composables/useNow'
import { SESSION_MARKETS } from '@/constants/market'
import { ROUTE_NAMES } from '@/constants/routes'
import type { SessionIndicatorItem } from '@/interfaces/session'
import { useAlertStore } from '@/stores/useAlertStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import ConnectionIndicator from './ConnectionIndicator.vue'
import GlobalSearch from './GlobalSearch.vue'
import SessionIndicator from './SessionIndicator.vue'
import SettingsMenu from './SettingsMenu.vue'

/** Container: brand, search, session and feed status, and the global actions (FR-15, FR-40 … FR-45). */
const emit = defineEmits<{
  openAlerts: []
  openWatchlists: []
  openShortcuts: []
}>()

const alertStore = useAlertStore()
const connectionStore = useConnectionStore()
const sessionStore = useSessionStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const { xs, smAndUp, lgAndUp, xlAndUp } = useDisplay()
const { isFullscreen, isSupported, toggle } = useFullscreen()
const now = useNow()
const search = useTemplateRef<{ focus: () => void }>('search')

const sessionItems = computed<SessionIndicatorItem[]>(() =>
  SESSION_MARKETS.flatMap((market) => {
    const state = sessionStore.stateOf(market)
    return state ? [{ market, phase: state.phase, countdownMs: sessionStore.msUntilNextPhase(market, now.value) }] : []
  }),
)

/** Medium-wide screens show only HOSE, the main market, so the header never wraps. */
const visibleSessionItems = computed(() => (xlAndUp.value ? sessionItems.value : sessionItems.value.slice(0, 1)))

const secondsSinceTick = computed(() =>
  connectionStore.lastTickAt === null ? null : Math.max(0, Math.floor((now.value - connectionStore.lastTickAt) / 1_000)),
)

async function enableNotifications(): Promise<void> {
  const isGranted = await requestNotificationPermission()
  settingsStore.patch({ isBrowserNotificationEnabled: isGranted })
}

defineExpose({
  focusSearch: () => search.value?.focus(),
  toggleFullscreen: () => void toggle(),
})
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-3);
  width: 100%;
  min-width: 0;
  padding-inline: var(--mtg-space-4);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-2);
  color: inherit;
  text-decoration: none;
}

.app-header__title {
  font-size: var(--mtg-font-title-md);
  font-weight: var(--mtg-weight-bold);
  white-space: nowrap;
}

.app-header__search {
  flex: 0 1 var(--mtg-search-width);
  min-width: 0;
}

.app-header__sessions {
  flex: 1;
  justify-content: center;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
  margin-inline-start: auto;
}
</style>
