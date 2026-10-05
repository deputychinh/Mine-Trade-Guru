import { onBeforeUnmount, onMounted, readonly, ref, type ShallowRef } from 'vue'

/** Content-box size of an element, kept current with one ResizeObserver. */
export function useElementSize(target: Readonly<ShallowRef<HTMLElement | null>>) {
  const width = ref(0)
  const height = ref(0)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const element = target.value
    if (!element) return
    observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      width.value = Math.round(entry.contentRect.width)
      height.value = Math.round(entry.contentRect.height)
    })
    observer.observe(element)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { width: readonly(width), height: readonly(height) }
}
