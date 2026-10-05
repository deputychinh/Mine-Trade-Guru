<template>
  <div class="volume-cell mtg-num" :class="[color ? `text-${color}` : '', flashClass]" role="cell">{{ text }}</div>
</template>

<script setup lang="ts">
import { usePriceFlash } from '@/composables/usePriceFlash'
import type { MarketColorToken } from '@/interfaces/theme'

/**
 * Volume / value cell. Takes the color of the price next to it (iBoard convention); the
 * marker lives on that price cell, so this one carries no glyph.
 */
const {
  text,
  color = null,
  flashValue = null,
  isFlashEnabled,
} = defineProps<{
  text: string
  color?: MarketColorToken | null
  flashValue?: number | null
  isFlashEnabled: boolean
}>()

const flashClass = usePriceFlash(
  () => flashValue,
  () => isFlashEnabled,
)
</script>

<style scoped>
.volume-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-inline: var(--mtg-board-cell-padding-x);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
