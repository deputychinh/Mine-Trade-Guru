<template>
  <div class="price-cell mtg-num" :class="[color ? `text-${color}` : '', flashClass]" role="cell">
    <span v-if="marker" class="price-cell__marker" aria-hidden="true">{{ marker }}</span>{{ text }}
    <span v-if="ariaText" class="d-sr-only">{{ ariaText }}</span>
  </div>
</template>

<script setup lang="ts">
import { usePriceFlash } from '@/composables/usePriceFlash'
import type { MarketColorToken } from '@/interfaces/theme'

/** One colored price cell: VN color + marker + flash (FR-02, FR-04). Primitive props so it only re-renders on real change. */
const {
  text,
  color = null,
  marker = null,
  ariaText = '',
  flashValue = null,
  isFlashEnabled,
} = defineProps<{
  text: string
  color?: MarketColorToken | null
  marker?: string | null
  /** Spoken instead of the marker glyph, e.g. "tăng". */
  ariaText?: string
  flashValue?: number | null
  isFlashEnabled: boolean
}>()

const flashClass = usePriceFlash(
  () => flashValue,
  () => isFlashEnabled,
)
</script>

<style scoped>
.price-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-inline: var(--mtg-board-cell-padding-x);
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-cell__marker {
  margin-inline-end: var(--mtg-space-1);
  font-size: var(--mtg-board-marker-size);
  vertical-align: middle;
}
</style>
