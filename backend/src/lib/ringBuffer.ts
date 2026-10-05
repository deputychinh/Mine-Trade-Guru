/** Fixed-capacity FIFO. Pushing past capacity overwrites the oldest item, so memory never grows. */
export class RingBuffer<T> {
  private readonly items: Array<T | undefined>
  private start = 0
  private count = 0

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`RingBuffer capacity must be a positive integer, got ${capacity}`)
    }
    this.items = new Array<T | undefined>(capacity)
  }

  get size(): number {
    return this.count
  }

  push(item: T): void {
    const index = (this.start + this.count) % this.capacity
    this.items[index] = item
    if (this.count < this.capacity) {
      this.count++
    } else {
      this.start = (this.start + 1) % this.capacity
    }
  }

  /** Newest item, or undefined when empty. */
  last(): T | undefined {
    if (this.count === 0) return undefined
    return this.items[(this.start + this.count - 1) % this.capacity]
  }

  /** Replace the newest item (used to update the current 1-minute bar in place). */
  replaceLast(item: T): void {
    if (this.count === 0) {
      this.push(item)
      return
    }
    this.items[(this.start + this.count - 1) % this.capacity] = item
  }

  /** Oldest → newest. */
  toArray(): T[] {
    const result: T[] = []
    for (let i = 0; i < this.count; i++) {
      result.push(this.items[(this.start + i) % this.capacity] as T)
    }
    return result
  }

  clear(): void {
    this.items.fill(undefined)
    this.start = 0
    this.count = 0
  }
}
