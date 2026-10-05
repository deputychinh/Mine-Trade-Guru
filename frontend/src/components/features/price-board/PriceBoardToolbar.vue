<template>
  <div class="price-board-toolbar">
    <div class="price-board-toolbar__main">
      <BoardTabs v-model="boardId" :watchlist-count="watchlistCount" class="price-board-toolbar__tabs" />
      <div class="price-board-toolbar__actions">
        <BaseTextField
          v-model="filterText"
          :label="t('board.filterPlaceholder')"
          prepend-icon="search"
          is-clearable
          class="price-board-toolbar__filter"
        />
        <ColumnSettingsMenu
          :groups="groups"
          :group-order="groupOrder"
          :hidden-groups="hiddenGroups"
          @toggle-group="emit('toggleGroup', $event)"
          @reorder-groups="emit('reorderGroups', $event)"
          @reset-layout="emit('resetLayout')"
        />
      </div>
    </div>
    <SectorFilter v-if="boardId === 'SECTOR'" v-model="sector" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseTextField from '@/components/base/BaseTextField.vue'
import type { BoardId, ColumnGroupDefinition, ColumnGroupKey } from '@/interfaces/board'
import type { Sector } from '@/interfaces/market'
import BoardTabs from './BoardTabs.vue'
import ColumnSettingsMenu from './ColumnSettingsMenu.vue'
import SectorFilter from './SectorFilter.vue'

/** Tabs, quick symbol filter and column settings above the board. */
const { watchlistCount, groups, groupOrder, hiddenGroups } = defineProps<{
  watchlistCount: number
  groups: readonly ColumnGroupDefinition[]
  groupOrder: readonly ColumnGroupKey[]
  hiddenGroups: readonly ColumnGroupKey[]
}>()

const emit = defineEmits<{
  toggleGroup: [group: ColumnGroupKey]
  reorderGroups: [order: ColumnGroupKey[]]
  resetLayout: []
}>()

const boardId = defineModel<BoardId>('boardId', { required: true })
const sector = defineModel<Sector>('sector', { required: true })
const filterText = defineModel<string | null>('filterText', { required: true })

const { t } = useI18n()
</script>

<style scoped>
.price-board-toolbar {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.price-board-toolbar__main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--mtg-space-2);
  padding-inline-end: var(--mtg-space-2);
}

.price-board-toolbar__tabs {
  flex: 1 1 auto;
  min-width: 0;
}

.price-board-toolbar__actions {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
  padding-block: var(--mtg-space-1);
}

.price-board-toolbar__filter {
  width: calc(var(--mtg-search-width) / 2);
}
</style>
