<template>
  <v-btn
    :icon="ICONS[icon]"
    :aria-label="label"
    :aria-pressed="isPressed"
    :variant="variant"
    :color="color"
    :size="size"
    :disabled="isDisabled"
    density="comfortable"
  >
    <v-icon :icon="ICONS[icon]" />
    <v-tooltip activator="parent" :text="label" :location="tooltipLocation" />
  </v-btn>
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/constants/icons'
import type { ButtonVariant, ComponentSize, PopupLocation } from '@/interfaces/ui'

/** Icon-only button. `label` is required: it is both the accessible name and the tooltip (NFR-U2). */
const {
  icon,
  label,
  isPressed = undefined,
  variant = 'text',
  color = undefined,
  size = 'small',
  isDisabled = false,
  tooltipLocation = 'bottom',
} = defineProps<{
  icon: IconName
  label: string
  /** Set only for toggle buttons, so screen readers announce on/off. */
  isPressed?: boolean
  variant?: ButtonVariant
  color?: string
  size?: ComponentSize
  isDisabled?: boolean
  tooltipLocation?: PopupLocation
}>()
</script>
