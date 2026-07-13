const KEY = 'ttracker.places.v1'

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
}

function load(): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(v)) return []
    return v.filter(
      (p): p is Place =>
        p != null && typeof p.id === 'string' && typeof p.name === 'string' &&
        Number.isFinite(p.lat) && Number.isFinite(p.lng),
    )
  } catch {
    return []
  }
}

class Places {
  list = $state<Place[]>(load())

  add(name: string, lat: number, lng: number): Place {
    const place: Place = { id: crypto.randomUUID(), name, lat, lng }
    this.list = [...this.list, place]
    this.#persist()
    return place
  }

  remove(id: string): void {
    this.list = this.list.filter((p) => p.id !== id)
    this.#persist()
  }

  #persist(): void {
    localStorage.setItem(KEY, JSON.stringify(this.list))
  }
}

export const places = new Places()
