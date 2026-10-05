<template>
  <DefaultLayout>
    <template #header>
      <AppHeader
        ref="header"
        @open-alerts="openAlerts(boardStore.focusedSymbol ?? '')"
        @open-watchlists="openWatchlists"
        @open-shortcuts="isShortcutHelpOpen = true"
      />
    </template>
    <StaleDataBanner v-if="banner" :kind="banner.kind" :count="banner.count" />
    <ErrorBoundary :title="t('overview.indices')">
      <IndexTickerBar />
    </ErrorBoundary>
    <ErrorBoundary :title="t('board.title')">
      <PriceBoard />
    </ErrorBoundary>
    <MarketOverview @select="openSymbol" />
    <SymbolDetailDrawer v-if="hasOpenedDetail" @add-alert="openAlerts" />
    <AlertCenter v-if="hasOpenedAlerts" v-model="isAlertCenterOpen" :initial-symbol="alertSymbol" @select="openSymbol" />
    <WatchlistManager v-if="hasOpenedWatchlists" v-model="isWatchlistOpen" />
    <ShortcutHelpDialog v-model="isShortcutHelpOpen" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import AppHeader from '@/components/features/layout/AppHeader.vue'
import ShortcutHelpDialog from '@/components/features/layout/ShortcutHelpDialog.vue'
import StaleDataBanner from '@/components/features/layout/StaleDataBanner.vue'
import IndexTickerBar from '@/components/features/market-overview/IndexTickerBar.vue'
import MarketOverview from '@/components/features/market-overview/MarketOverview.vue'
import PriceBoard from '@/components/features/price-board/PriceBoard.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useMarketFeed } from '@/composables/useMarketFeed'
import { useNow } from '@/composables/useNow'
import { BOARDS } from '@/constants/boards'
import { STALE_DATA_MS } from '@/constants/feed'
import { ROUTE_NAMES } from '@/constants/routes'
import type { BoardId } from '@/interfaces/board'
import type { FeedBannerKind } from '@/interfaces/ui'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useBoardStore } from '@/stores/useBoardStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useMarketStore } from '@/stores/useMarketStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'

/** Route container: starts the feed once, syncs the board with the URL, owns page-level dialogs. */
const { boardId = undefined } = defineProps<{
  /** Lower-case board id from /board/:boardId. */
  boardId?: string
}>()
// Heavy panels load on first use (rule 9.10).
const SymbolDetailDrawer = defineAsyncComponent(() => import('@/components/features/symbol-detail/SymbolDetailDrawer.vue'))
const AlertCenter = defineAsyncComponent(() => import('@/components/features/alerts/AlertCenter.vue'))
const WatchlistManager = defineAsyncComponent(() => import('@/components/features/watchlist/WatchlistManager.vue'))

const router = useRouter()
const boardStore = useBoardStore()
const connectionStore = useConnectionStore()
const detailStore = useSymbolDetailStore()
const instrumentStore = useInstrumentStore()
const marketStore = useMarketStore()
const sessionStore = useSessionStore()
const { t } = useI18n()
const now = useNow()
const header = useTemplateRef<{ focusSearch: () => void; toggleFullscreen: () => void }>('header')

useMarketFeed()

const isAlertCenterOpen = ref(false)
const isWatchlistOpen = ref(false)
const isShortcutHelpOpen = ref(false)
const hasOpenedAlerts = ref(false)
const hasOpenedWatchlists = ref(false)
const hasOpenedDetail = ref(false)
const alertSymbol = ref('')

/** Old prices must never look live (NFR-R3). Paused is the user's choice, so no banner then. */
const banner = computed<{ kind: FeedBannerKind; count: number } | null>(() => {
  if (connectionStore.isPaused) return null
  if (connectionStore.status === 'offline') return { kind: 'offline', count: 0 }
  if (connectionStore.status === 'reconnecting') return { kind: 'reconnecting', count: connectionStore.attempt }
  const lastTickAt = connectionStore.lastTickAt
  if (lastTickAt === null || !sessionStore.isAnyOpen) return null
  const age = now.value - lastTickAt
  return age > STALE_DATA_MS ? { kind: 'stale', count: Math.floor(age / 1_000) } : null
})

function parseBoardId(param: string | undefined): BoardId | null {
  const wanted = param?.toLowerCase()
  return BOARDS.find((board) => board.id.toLowerCase() === wanted)?.id ?? null
}

function showBoardInUrl(id: BoardId): void {
  void router.replace({ name: ROUTE_NAMES.board, params: { boardId: id.toLowerCase() } })
}

function openSymbol(symbol: string): void {
  boardStore.focus(symbol)
  void detailStore.open(symbol)
}

function openAlerts(symbol: string): void {
  alertSymbol.value = symbol
  hasOpenedAlerts.value = true
  isAlertCenterOpen.value = true
}

function openWatchlists(): void {
  hasOpenedWatchlists.value = true
  isWatchlistOpen.value = true
}

useKeyboardShortcuts({
  focusSearch: () => header.value?.focusSearch(),
  closeDrawer: () => detailStore.close(),
  togglePause: () => connectionStore.togglePause(),
  toggleFullscreen: () => header.value?.toggleFullscreen(),
  help: () => {
    isShortcutHelpOpen.value = true
  },
})

// URL → store: a valid /board/:id selects that board; anything else shows the saved board.
watch(
  () => boardId,
  (param) => {
    const id = parseBoardId(param)
    if (id) boardStore.setBoard(id)
    else showBoardInUrl(boardStore.activeBoardId)
  },
  { immediate: true },
)
// Store → URL: tab clicks keep the address bar shareable.
watch(
  () => boardStore.activeBoardId,
  (id) => {
    if (parseBoardId(boardId) !== id) showBoardInUrl(id)
  },
)
watch(
  () => detailStore.isOpen,
  (isOpen) => {
    if (isOpen) hasOpenedDetail.value = true
  },
  { immediate: true },
)

onMounted(() => {
  void instrumentStore.load()
  void marketStore.loadIndexHistory()
})
</script>
