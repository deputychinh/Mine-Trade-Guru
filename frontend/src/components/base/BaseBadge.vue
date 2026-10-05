<template>
  <v-badge :model-value="isVisible" :content="content" :max="max" :dot="isDot" :color="color" floating>
    <slot></slot>
  </v-badge>
</template>

<script setup lang="ts">
/** M3 badge on an icon (e.g. unread alert count). */
const {
  content = undefined,
  isVisible = true,
  isDot = false,
  max = 99,
  color = 'error',
} = defineProps<{
  content?: number | string
  isVisible?: boolean
  isDot?: boolean
  max?: number
  color?: string
}>()
</script>
