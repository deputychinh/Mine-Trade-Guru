import { readonly, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { FLASH_CLASSES } from '@/constants/marketColors'

/**
 * Class to flash a cell when its value changes (FR-04). CSS does the animation; this only
 * picks the class. Alternating between two identical keyframes restarts the animation on
 * consecutive same-direction ticks, so there is no timer per cell (NFR-P2, rule 9.10).
 * A freshly mounted cell (e.g. scrolled into view) never flashes.
 */
export function usePriceFlash(
  value: MaybeRefOrGetter<number | null>,
  isEnabled: MaybeRefOrGetter<boolean>,
): Readonly<Ref<string>> {
  const flashClass = ref('')
  let parity: 0 | 1 = 0

  watch(
    () => toValue(value),
    (next, previous) => {
      if (!toValue(isEnabled)) {
        flashClass.value = ''
        return
      }
      if (next === null || previous === null || previous === undefined || next === previous) return
      parity = parity === 0 ? 1 : 0
      flashClass.value = FLASH_CLASSES[next > previous ? 'up' : 'down'][parity]
    },
  )

  return readonly(flashClass)
}
