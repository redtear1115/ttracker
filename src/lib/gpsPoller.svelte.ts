import { parseCarsResponse, type Truck } from './trucks'

const INTERVAL_MS = 15_000

class GpsPoller {
  trucks = $state<Truck[]>([])
  status = $state<'idle' | 'ok' | 'error'>('idle')
  lastFetched = $state<Date | null>(null)
  #timer: ReturnType<typeof setInterval> | null = null

  async #fetch(): Promise<void> {
    try {
      const r = await fetch('/api/gps')
      if (!r.ok) throw new Error(String(r.status))
      this.trucks = parseCarsResponse(await r.text())
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

export const gps = new GpsPoller()
