<template>
  <BaseDialog v-model="isOpen" :title="t('watchlist.manage')" :close-label="t('common.close')" :max-width="560">
    <div class="watchlist-manager">
      <section class="watchlist-manager__row">
        <BaseSelect v-model="activeId" :items="listOptions" :label="t('watchlist.active')" class="watchlist-manager__grow" />
        <BaseButton
          v-if="!isConfirmingDelete"
          variant="text"
          color="error"
          prepend-icon="delete"
          :is-disabled="watchlistStore.lists.length <= 1"
          @click="isConfirmingDelete = true"
        >
          {{ t('watchlist.delete') }}
        </BaseButton>
        <BaseButton v-else variant="tonal" color="error" @click="removeActive">{{ t('watchlist.confirmDelete') }}</BaseButton>
      </section>

      <form class="watchlist-manager__row" @submit.prevent="rename">
        <BaseTextField v-model="nameDraft" :label="t('watchlist.name')" :placeholder="t('watchlist.defaultName')" class="watchlist-manager__grow" />
        <BaseButton type="submit" variant="tonal" prepend-icon="edit">{{ t('watchlist.rename') }}</BaseButton>
      </form>

      <form class="watchlist-manager__row" @submit.prevent="create">
        <BaseTextField v-model="newName" :label="t('watchlist.newList')" class="watchlist-manager__grow" />
        <BaseButton type="submit" variant="tonal" prepend-icon="add" :is-disabled="!(newName ?? '').trim()">{{ t('watchlist.create') }}</BaseButton>
      </form>

      <form class="watchlist-manager__row" @submit.prevent="addSymbol">
        <BaseTextField v-model="symbolDraft" :label="t('watchlist.addSymbolLabel')" :error-message="symbolError" class="watchlist-manager__grow" />
        <BaseButton type="submit" variant="tonal" prepend-icon="add">{{ t('watchlist.add') }}</BaseButton>
      </form>

      <VueDraggable
        v-if="watchlistStore.activeList.symbols.length > 0"
        :model-value="watchlistStore.activeList.symbols"
        handle=".watchlist-manager__handle"
        :animation="150"
        tag="ul"
        class="watchlist-manager__symbols"
        @update:model-value="reorder"
      >
        <li v-for="symbol in watchlistStore.activeList.symbols" :key="symbol" class="watchlist-manager__symbol">
          <v-icon :icon="ICONS.dragHandle" class="watchlist-manager__handle" aria-hidden="true" />
          <span class="watchlist-manager__code">{{ symbol }}</span>
          <span class="watchlist-manager__name">{{ instrumentStore.get(symbol)?.name ?? '' }}</span>
          <BaseIconButton icon="close" size="x-small" :label="t('watchlist.removeSymbol', { symbol })" @click="watchlistStore.toggle(symbol)" />
        </li>
      </VueDraggable>
      <BaseEmptyState v-else icon="unwatched" :title="t('board.emptyWatchlistTitle')" :text="t('board.emptyWatchlistText')" />

      <section class="watchlist-manager__row watchlist-manager__row--end">
        <input ref="fileInput" type="file" accept=".csv,text/csv,text/plain" class="d-sr-only" tabindex="-1" @change="importFile" />
        <BaseButton variant="text" prepend-icon="import" @click="fileInput?.click()">{{ t('watchlist.import') }}</BaseButton>
        <BaseButton variant="text" prepend-icon="export" @click="exportActive">{{ t('watchlist.export') }}</BaseButton>
      </section>
      <p v-if="importMessage" class="watchlist-manager__message" role="status">{{ importMessage }}</p>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextField from '@/components/base/BaseTextField.vue'
import { ICONS } from '@/constants/icons'
import { WATCHLIST_IMPORT_MAX_BYTES } from '@/constants/limits'
import type { SelectOption } from '@/interfaces/ui'
import { useInstrumentStore } from '@/stores/useInstrumentStore'
import { useWatchlistStore } from '@/stores/useWatchlistStore'

/** Container: create, rename, delete, reorder, import and export watchlists (FR-30, FR-31). */
const isOpen = defineModel<boolean>({ required: true })

const watchlistStore = useWatchlistStore()
const instrumentStore = useInstrumentStore()
const { t } = useI18n()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const nameDraft = ref<string | null>(watchlistStore.activeList.name)
const newName = ref<string | null>('')
const symbolDraft = ref<string | null>('')
const symbolError = ref('')
const importMessage = ref('')
const isConfirmingDelete = ref(false)

const activeId = computed<string>({
  get: () => watchlistStore.activeId,
  set: (id) => watchlistStore.setActive(id),
})

const listOptions = computed<SelectOption<string>[]>(() =>
  watchlistStore.lists.map((list) => ({ value: list.id, title: list.name || t('watchlist.defaultName') })),
)

function isKnownSymbol(symbol: string): boolean {
  return instrumentStore.get(symbol) !== undefined
}

function rename(): void {
  watchlistStore.rename(watchlistStore.activeId, nameDraft.value ?? '')
}

function create(): void {
  const name = (newName.value ?? '').trim()
  if (!name) return
  watchlistStore.create(name)
  newName.value = ''
}

function removeActive(): void {
  watchlistStore.remove(watchlistStore.activeId)
  isConfirmingDelete.value = false
}

function addSymbol(): void {
  const symbol = (symbolDraft.value ?? '').trim().toUpperCase()
  if (!isKnownSymbol(symbol)) {
    symbolError.value = t('watchlist.unknownSymbol')
    return
  }
  symbolError.value = ''
  if (!watchlistStore.isWatched(symbol)) watchlistStore.toggle(symbol)
  symbolDraft.value = ''
}

function reorder(symbols: string[]): void {
  watchlistStore.reorder(watchlistStore.activeId, symbols)
}

async function importFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > WATCHLIST_IMPORT_MAX_BYTES) {
    importMessage.value = t('watchlist.importTooLarge')
    return
  }
  const result = watchlistStore.importCsv(watchlistStore.activeId, await file.text(), isKnownSymbol)
  importMessage.value = t('watchlist.importResult', {
    added: result.added.length,
    unknown: result.unknown.length,
    duplicates: result.duplicates.length,
  })
}

function exportActive(): void {
  const csv = watchlistStore.exportCsv(watchlistStore.activeId)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${watchlistStore.activeList.name || t('watchlist.defaultName')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

watch(
  () => watchlistStore.activeList,
  (list) => {
    nameDraft.value = list.name
    isConfirmingDelete.value = false
    importMessage.value = ''
  },
)
</script>

<style scoped>
.watchlist-manager {
  display: flex;
  flex-direction: column;
  gap: var(--mtg-space-3);
  padding-block-start: var(--mtg-space-2);
}

.watchlist-manager__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--mtg-space-2);
}

.watchlist-manager__row--end {
  justify-content: flex-end;
}

.watchlist-manager__grow {
  flex: 1 1 calc(var(--mtg-panel-min-width) / 2);
}

.watchlist-manager__symbols {
  max-height: var(--mtg-panel-list-height);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.watchlist-manager__symbol {
  display: grid;
  grid-template-columns: auto var(--mtg-board-col-symbol) 1fr auto;
  align-items: center;
  gap: var(--mtg-space-2);
  padding-block: var(--mtg-space-1);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.watchlist-manager__handle {
  cursor: grab;
  color: rgb(var(--v-theme-on-surface-variant));
}

.watchlist-manager__code {
  font-weight: var(--mtg-weight-bold);
}

.watchlist-manager__name {
  overflow: hidden;
  font-size: var(--mtg-font-body-sm);
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.watchlist-manager__message {
  margin: 0;
  font-size: var(--mtg-font-body-sm);
}
</style>
