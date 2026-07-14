import type { ParkingLot } from './parking'

const INTERVAL_MS = 60_000 // 與 /api/parking 的 cache TTL 對齊

class ParkingPoller {
  lots = $state<ParkingLot[]>([])
  status = $state<'idle' | 'ok' | 'error'>('idle')
  lastFetched = $state<Date | null>(null)
  #timer: ReturnType<typeof setInterval> | null = null

  async #fetch(): Promise<void> {
    try {
      const r = await fetch('/api/parking')
      if (!r.ok) throw new Error(String(r.status))
      const json = (await r.json()) as { lots: ParkingLot[] }
      this.lots = json.lots
      this.status = 'ok'
      this.lastFetched = new Date()
    } catch {
      this.status = 'error'
    }
  }

  refresh(): Promise<void> {
    return this.#fetch()
  }

  start(): void {
    if (this.#timer) return
    void this.#fetch()
    this.#timer = setInterval(() => void this.#fetch(), INTERVAL_MS)
    document.addEventListener('visibilitychange', this.#onVisibility)
  }

  stop(): void {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
    document.removeEventListener('visibilitychange', this.#onVisibility)
  }

  #onVisibility = (): void => {
    if (document.hidden) {
      if (this.#timer) clearInterval(this.#timer)
      this.#timer = null
    } else if (!this.#timer) {
      void this.#fetch()
      this.#timer = setInterval(() => void this.#fetch(), INTERVAL_MS)
    }
  }
}

export const parking = new ParkingPoller()
