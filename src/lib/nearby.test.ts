import { describe, it, expect } from 'vitest'
import { nearbyStops } from './nearby'
import type { CollectionPoint } from './types'

const pt = (id: string, lat: number, lng: number): CollectionPoint => ({
  id, area: '東區', routeId: '1', routeOrder: 1, village: '', name: id,
  time: '19:00', lat, lng, workDays: [1], recycleDays: [],
})

// 0.001 度緯度 ≈ 111m
const HOME = { lat: 22.98, lng: 120.2 }
const points = [
  pt('near-111m', 22.981, 120.2),
  pt('near-222m', 22.982, 120.2),
  pt('far-1km', 22.989, 120.2),
]

describe('nearbyStops', () => {
  it('依距離排序且只含 500m 圈內', () => {
    const r = nearbyStops(points, HOME.lat, HOME.lng)
    expect(r.map((s) => s.point.id)).toEqual(['near-111m', 'near-222m'])
    expect(r[0].distanceM).toBeGreaterThan(100)
    expect(r[0].distanceM).toBeLessThan(120)
  })
  it('limit 生效', () => {
    expect(nearbyStops(points, HOME.lat, HOME.lng, 1)).toHaveLength(1)
  })
  it('圈內不足不硬湊、圈外為空', () => {
    expect(nearbyStops(points, 23.3, 120.5)).toEqual([])
  })
  it('自訂半徑', () => {
    expect(nearbyStops(points, HOME.lat, HOME.lng, 10, 2000)).toHaveLength(3)
  })
})
