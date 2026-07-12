import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

describe('favorites', () => {
  beforeEach(() => { store.clear(); vi.resetModules() })

  it('toggle 加入與移除並持久化', async () => {
    const { favorites } = await import('./favorites.svelte')
    favorites.toggle('a')
    expect(favorites.has('a')).toBe(true)
    expect(JSON.parse(store.get('ttracker.favorites.v1')!)).toEqual(['a'])
    favorites.toggle('a')
    expect(favorites.has('a')).toBe(false)
  })

  it('從 localStorage 載入既有最愛', async () => {
    store.set('ttracker.favorites.v1', '["x","y"]')
    const { favorites } = await import('./favorites.svelte')
    expect(favorites.ids).toEqual(['x', 'y'])
  })

  it('壞資料不炸', async () => {
    store.set('ttracker.favorites.v1', 'not json')
    const { favorites } = await import('./favorites.svelte')
    expect(favorites.ids).toEqual([])
  })
})
