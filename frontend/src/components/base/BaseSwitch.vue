<template>
  <v-switch v-model="value" :label="label" :disabled="isDisabled" />
</template>

<script setup lang="ts">
/** M3 switch for on/off settings. */
const { label, isDisabled = false } = defineProps<{
  label: string
  isDisabled?: boolean
}>()

const value = defineModel<boolean>({ required: true })
</script>
