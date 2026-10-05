<template>
  <v-select v-model="value" :items="items" item-title="title" item-value="value" :label="label" :menu-icon="ICONS.expand" />
</template>

<script setup lang="ts" generic="T extends string | number">
import { ICONS } from '@/constants/icons'
import type { SelectOption } from '@/interfaces/ui'

/** M3 outlined single select over typed options. */
const { items, label = '' } = defineProps<{
  items: ReadonlyArray<SelectOption<T>>
  label?: string
}>()

const value = defineModel<T>({ required: true })
</script>
