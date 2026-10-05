<template>
  <BaseErrorState v-if="error" :title="title" :message="error.message" :retry-label="t('common.retry')" @retry="reset" />
  <slot v-else></slot>
</template>

<script setup lang="ts">
import { onErrorCaptured, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseErrorState from '@/components/base/BaseErrorState.vue'

/**
 * Contains a render/setup error to one panel (NFR-R5): the panel shows an error state with
 * retry, and the rest of the dashboard keeps updating.
 */
const { title } = defineProps<{
  title: string
}>()

defineSlots<{
  default(): unknown
}>()

const { t } = useI18n()
const error = shallowRef<Error | null>(null)

function reset(): void {
  error.value = null
}

onErrorCaptured((cause) => {
  error.value = cause instanceof Error ? cause : new Error(String(cause))
  return false
})
</script>
