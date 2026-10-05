<template>
  <BaseDialog v-model="isOpen" :title="t('shortcut.title')" :close-label="t('common.close')" :max-width="440">
    <table class="shortcut-help">
      <tbody>
        <tr v-for="item in SHORTCUT_HELP" :key="item.action">
          <th scope="row" class="shortcut-help__key"><kbd>{{ item.display }}</kbd></th>
          <td>{{ t(item.labelKey) }}</td>
        </tr>
      </tbody>
    </table>
  </BaseDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { SHORTCUT_HELP } from '@/constants/shortcuts'

/** Lists the keyboard shortcuts (FR-41). */
const isOpen = defineModel<boolean>({ required: true })

const { t } = useI18n()
</script>

<style scoped>
.shortcut-help {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--mtg-font-body-md);
}

.shortcut-help tr {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.shortcut-help td,
.shortcut-help th {
  padding: var(--mtg-space-2) 0;
  text-align: start;
}

.shortcut-help__key {
  width: var(--mtg-board-col-volume);
}

.shortcut-help kbd {
  padding: var(--mtg-space-0) var(--mtg-space-2);
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: var(--mtg-shape-xs);
  font-family: inherit;
  font-size: var(--mtg-font-label-md);
}
</style>
