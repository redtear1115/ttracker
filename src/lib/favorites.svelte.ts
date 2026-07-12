const KEY = 'ttracker.favorites.v1'

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

class Favorites {
  ids = $state<string[]>(load())
  has(id: string): boolean { return this.ids.includes(id) }
  toggle(id: string): void {
    this.ids = this.has(id) ? this.ids.filter((x) => x !== id) : [...this.ids, id]
    localStorage.setItem(KEY, JSON.stringify(this.ids))
  }
}

export const favorites = new Favorites()
