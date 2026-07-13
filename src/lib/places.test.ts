import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

describe('places', () => {
  beforeEach(() => { store.clear(); vi.resetModules() })

  it('add 回傳含 uuid 的地點並持久化', async () => {
    const { places } = await import('./places.svelte')
    const p = places.add('家', 22.98, 120.2)
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(places.list).toEqual([p])
    expect(JSON.parse(store.get('ttracker.places.v1')!)).toEqual([p])
  })

  it('remove 移除並持久化', async () => {
    const { places } = await import('./places.svelte')
    const p = places.add('公司', 23.0, 120.21)
    places.remove(p.id)
    expect(places.list).toEqual([])
    expect(JSON.parse(store.get('ttracker.places.v1')!)).toEqual([])
  })

  it('載入既有資料、過濾壞形狀', async () => {
    store.set('ttracker.places.v1', JSON.stringify([
      { id: 'a', name: '家', lat: 22.98, lng: 120.2 },
      { id: 'b', name: '壞', lat: 'x', lng: 120.2 },
      null,
    ]))
    const { places } = await import('./places.svelte')
    expect(places.list.map((p) => p.id)).toEqual(['a'])
  })

  it('壞 JSON 不炸', async () => {
    store.set('ttracker.places.v1', 'not json')
    const { places } = await import('./places.svelte')
    expect(places.list).toEqual([])
  })
})
