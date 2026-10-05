<template>
  <BaseTabs v-model="boardId" :items="items" :label="t('board.tabsLabel')" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseTabs from '@/components/base/BaseTabs.vue'
import { BOARDS } from '@/constants/boards'
import type { BoardId } from '@/interfaces/board'
import type { TabItem } from '@/interfaces/ui'

/** Board tabs (FR-03), straight from the BOARDS config. */
const { watchlistCount } = defineProps<{
  watchlistCount: number
}>()

const boardId = defineModel<BoardId>({ required: true })

const { t } = useI18n()

const items = computed<TabItem<BoardId>[]>(() =>
  BOARDS.map((board) => ({
    value: board.id,
    label: t(board.labelKey),
    count: board.id === 'WATCHLIST' ? watchlistCount : undefined,
  })),
)
</script>
