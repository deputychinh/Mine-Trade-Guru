import { onMounted, onUnmounted, readonly, ref, type Ref } from 'vue'

/** Current time, refreshed every `intervalMs`, for countdowns and "stale for N s" labels. */
export function useNow(intervalMs: number = 1_000): Readonly<Ref<number>> {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })
  onUnmounted(() => {
    if (timer !== null) clearInterval(timer)
    timer = null
  })

  return readonly(now)
}
