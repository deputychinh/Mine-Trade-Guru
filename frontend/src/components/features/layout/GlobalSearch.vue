<template>
  <v-autocomplete
    ref="field"
    v-model="selected"
    v-model:search="query"
    :items="results"
    item-title="symbol"
    item-value="symbol"
    :label="t('search.placeholder')"
    :prepend-inner-icon="ICONS.search"
    menu-icon=""
    no-filter
    hide-no-data
    hide-details
    density="compact"
    variant="solo-filled"
    flat
    rounded="xl"
    class="global-search"
    @update:model-value="select"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :title="item.symbol" :subtitle="item.name">
        <template #append>
          <span class="global-search__exchange">{{ item.exchange }}</span>
        </template>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSymbolSearch } from '@/composables/useSymbolSearch'
import { ICONS } from '@/constants/icons'
import { useBoardStore } from '@/stores/useBoardStore'
import { useSymbolDetailStore } from '@/stores/useSymbolDetailStore'

/** Container: symbol / company search; a pick opens the detail and focuses the row (FR-40). */
const boardStore = useBoardStore()
const detailStore = useSymbolDetailStore()
const { t } = useI18n()

const field = useTemplateRef<{ focus: () => void }>('field')
const query = ref('')
const selected = ref<string | null>(null)
const results = useSymbolSearch(query)

async function select(symbol: string | null): Promise<void> {
  if (!symbol) return
  boardStore.focus(symbol)
  void detailStore.open(symbol)
  await nextTick()
  selected.value = null
  query.value = ''
}

defineExpose({
  focus: () => field.value?.focus(),
})
</script>

<style scoped>
.global-search {
  width: var(--mtg-search-width);
  max-width: 100%;
}

.global-search__exchange {
  font-size: var(--mtg-font-label-sm);
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
