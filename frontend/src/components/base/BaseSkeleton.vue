<template>
  <v-skeleton-loader :type="type" :aria-label="label" color="transparent" />
</template>

<script setup lang="ts">
/** Placeholder while a panel loads, sized like the content it replaces (NFR-U3: no layout shift). */
const { type = 'list-item-two-line', label } = defineProps<{
  /** Any Vuetify skeleton type, e.g. 'table-row@8', 'image', 'list-item-two-line@3'. */
  type?: string
  label: string
}>()
</script>
