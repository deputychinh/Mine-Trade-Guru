<template>
  <v-btn
    :type="type"
    :variant="variant"
    :color="color"
    :size="size"
    :loading="isLoading"
    :disabled="isDisabled"
    :block="isBlock"
    :prepend-icon="prependIcon ? ICONS[prependIcon] : undefined"
  >
    <slot></slot>
  </v-btn>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/constants/icons'
import type { ButtonVariant, ComponentSize } from '@/interfaces/ui'

/** M3 common button: filled by default; tonal/outlined/text for lower emphasis. */
const {
  type = 'button',
  variant = 'flat',
  color = 'primary',
  size = 'default',
  isLoading = false,
  isDisabled = false,
  isBlock = false,
  prependIcon = undefined,
} = defineProps<{
  type?: 'button' | 'submit'
  variant?: ButtonVariant
  color?: string
  size?: ComponentSize
  isLoading?: boolean
  isDisabled?: boolean
  isBlock?: boolean
  prependIcon?: IconName
}>()
</script>
