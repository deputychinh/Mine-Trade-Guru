<template>
  <v-text-field
    ref="field"
    v-model="value"
    :label="label"
    :placeholder="placeholder"
    :type="type"
    :prepend-inner-icon="prependIcon ? ICONS[prependIcon] : undefined"
    :clearable="isClearable"
    :clear-icon="ICONS.close"
    :error-messages="errorMessage || undefined"
    :autofocus="isAutofocus"
    :suffix="suffix"
  >
    <template v-if="$slots.append" #append-inner>
      <slot name="append"></slot>
    </template>
  </v-text-field>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { ICONS, type IconName } from '@/constants/icons'

/** M3 outlined text field. Exposes focus() for the `/` search shortcut. */
const {
  label = '',
  placeholder = '',
  type = 'text',
  prependIcon = undefined,
  isClearable = false,
  errorMessage = '',
  isAutofocus = false,
  suffix = undefined,
} = defineProps<{
  label?: string
  placeholder?: string
  type?: 'text' | 'number' | 'search'
  prependIcon?: IconName
  isClearable?: boolean
  errorMessage?: string
  isAutofocus?: boolean
  suffix?: string
}>()

const value = defineModel<string | null>({ default: '' })

defineSlots<{
  append?(): unknown
}>()

const field = useTemplateRef<{ focus: () => void; blur: () => void }>('field')

defineExpose({
  focus: () => field.value?.focus(),
  blur: () => field.value?.blur(),
})
</script>
