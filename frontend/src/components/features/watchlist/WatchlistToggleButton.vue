<template>
  <BaseIconButton
    :icon="isWatched ? 'watched' : 'unwatched'"
    :label="t(isWatched ? 'watchlist.removeSymbol' : 'watchlist.addSymbol', { symbol })"
    :is-pressed="isWatched"
    :color="isWatched ? 'warning' : undefined"
    @click="emit('toggle', symbol)"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BaseIconButton from '@/components/base/BaseIconButton.vue'

/** Star toggle for the active watchlist (FR-30). */
const { symbol, isWatched } = defineProps<{
  symbol: string
  isWatched: boolean
}>()

const emit = defineEmits<{
  toggle: [symbol: string]
}>()

const { t } = useI18n()
</script>
