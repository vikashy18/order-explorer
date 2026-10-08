interface Entry<T> {
  value: T
  storedAt: number
}

/** Tiny LRU with a TTL. Lets back/forward and re-visited filters render instantly. */
export class QueryCache<T> {
  private readonly entries = new Map<string, Entry<T>>()
  private readonly maxEntries: number
  private readonly ttlMs: number

  constructor(options: { maxEntries?: number; ttlMs?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 50
    this.ttlMs = options.ttlMs ?? 60_000
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T) {
    this.entries.delete(key)
    this.entries.set(key, { value, storedAt: Date.now() })
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
  }

  clear() {
    this.entries.clear()
  }
}
