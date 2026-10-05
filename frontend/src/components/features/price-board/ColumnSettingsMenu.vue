<template>
  <BaseMenu :is-closed-on-content-click="false" location="bottom">
    <template #activator="{ props: activatorProps }">
      <BaseIconButton v-bind="activatorProps" icon="columns" :label="t('board.columns')" />
    </template>
    <div class="column-settings">
      <p class="column-settings__title">{{ t('board.columnsTitle') }}</p>
      <p class="column-settings__hint">{{ t('board.columnsHint') }}</p>
      <VueDraggable
        :model-value="movableGroups"
        handle=".column-settings__handle"
        :animation="150"
        tag="ul"
        class="column-settings__list"
        @update:model-value="onDragged"
      >
        <li v-for="(group, index) in movableGroups" :key="group.key" class="column-settings__item">
          <v-icon :icon="ICONS.dragHandle" class="column-settings__handle" aria-hidden="true" />
          <v-checkbox-btn
            :model-value="!hiddenSet.has(group.key)"
            :label="t(group.labelKey)"
            density="compact"
            class="column-settings__checkbox"
            @update:model-value="emit('toggleGroup', group.key)"
          />
          <BaseIconButton
            icon="collapse"
            size="x-small"
            :label="t('board.moveGroupUp', { group: t(group.labelKey) })"
            :is-disabled="index === 0"
            @click="move(index, -1)"
          />
          <BaseIconButton
            icon="expand"
            size="x-small"
            :label="t('board.moveGroupDown', { group: t(group.labelKey) })"
            :is-disabled="index === movableGroups.length - 1"
            @click="move(index, 1)"
          />
        </li>
      </VueDraggable>
      <BaseButton variant="text" size="small" prepend-icon="retry" @click="emit('resetLayout')">
        {{ t('board.resetLayout') }}
      </BaseButton>
    </div>
  </BaseMenu>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseMenu from '@/components/base/BaseMenu.vue'
import { ICONS } from '@/constants/icons'
import type { ColumnGroupDefinition, ColumnGroupKey } from '@/interfaces/board'

/**
 * Show/hide and reorder column groups (FR-05). Drag has a keyboard alternative (the up/down
 * buttons), so reordering doesn't depend on a pointer (WCAG 2.5.7).
 */
const { groups, groupOrder, hiddenGroups } = defineProps<{
  groups: readonly ColumnGroupDefinition[]
  groupOrder: readonly ColumnGroupKey[]
  hiddenGroups: readonly ColumnGroupKey[]
}>()

const emit = defineEmits<{
  toggleGroup: [group: ColumnGroupKey]
  reorderGroups: [order: ColumnGroupKey[]]
  resetLayout: []
}>()

// Sortable is only needed once the menu is open; keep it out of the initial bundle (NFR-P4).
const VueDraggable = defineAsyncComponent(() => import('vue-draggable-plus').then((module) => module.VueDraggable))

const { t } = useI18n()

const hiddenSet = computed(() => new Set(hiddenGroups))

/** Fixed groups (symbol) are not listed: they can't move or hide. */
const movableGroups = computed(() =>
  groupOrder
    .map((key) => groups.find((group) => group.key === key))
    .filter((group): group is ColumnGroupDefinition => group !== undefined && !group.isFixed),
)

function onDragged(next: ColumnGroupDefinition[]): void {
  emit(
    'reorderGroups',
    next.map((group) => group.key),
  )
}

function move(index: number, step: -1 | 1): void {
  const order = movableGroups.value.map((group) => group.key)
  const target = index + step
  const moved = order[index]
  const swapped = order[target]
  if (moved === undefined || swapped === undefined) return
  order[index] = swapped
  order[target] = moved
  emit('reorderGroups', order)
}
</script>

<style scoped>
.column-settings {
  padding: var(--mtg-space-3) var(--mtg-space-2);
}

.column-settings__title {
  margin: 0 var(--mtg-space-2);
  font-size: var(--mtg-font-title-sm);
  font-weight: var(--mtg-weight-medium);
}

.column-settings__hint {
  margin: var(--mtg-space-1) var(--mtg-space-2) var(--mtg-space-2);
  font-size: var(--mtg-font-body-sm);
  color: rgb(var(--v-theme-on-surface-variant));
}

.column-settings__list {
  margin: 0 0 var(--mtg-space-2);
  padding: 0;
  list-style: none;
}

.column-settings__item {
  display: flex;
  align-items: center;
  gap: var(--mtg-space-1);
  padding-inline: var(--mtg-space-1);
  border-radius: var(--mtg-shape-sm);
}

.column-settings__item:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent);
}

.column-settings__handle {
  cursor: grab;
  color: rgb(var(--v-theme-on-surface-variant));
}

.column-settings__checkbox {
  flex: 1;
}
</style>
