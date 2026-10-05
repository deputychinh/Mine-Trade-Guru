<template>
  <v-chip
    :color="color"
    :variant="variant"
    :size="size"
    :prepend-icon="prependIcon ? ICONS[prependIcon] : undefined"
    :closable="isClosable"
    :label="isLabel"
  >
    <slot></slot>
  </v-chip>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/constants/icons'
import type { ComponentSize } from '@/interfaces/ui'

/** M3 assist/filter chip; status chips (session, connection) use `isLabel`. */
const {
  color = undefined,
  variant = 'tonal',
  size = 'small',
  prependIcon = undefined,
  isClosable = false,
  isLabel = false,
} = defineProps<{
  color?: string
  variant?: 'tonal' | 'outlined' | 'flat' | 'text'
  size?: ComponentSize
  prependIcon?: IconName
  isClosable?: boolean
  isLabel?: boolean
}>()
</script>
