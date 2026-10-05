<template>
  <DefaultLayout>
    <template #header>
      <span class="not-found__brand">{{ t('app.name') }}</span>
    </template>
    <BaseEmptyState icon="warning" :title="t('notFound.title')" :text="t('notFound.text')">
      <template #actions>
        <BaseButton :to="{ name: ROUTE_NAMES.board }">{{ t('notFound.back') }}</BaseButton>
      </template>
    </BaseEmptyState>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseEmptyState from '@/components/base/BaseEmptyState.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

/** Unknown URL. Plain page: no feed, no stores. */
const { t } = useI18n()
</script>

<style scoped>
.not-found__brand {
  padding-inline: var(--mtg-space-4);
  font-size: var(--mtg-font-title-md);
  font-weight: var(--mtg-weight-bold);
}
</style>
