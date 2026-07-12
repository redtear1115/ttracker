import { describe, it, expect } from 'vitest'
import { haversineMeters } from './geo'
import { parseCarsResponse, isStale, matchTruckToPoint, type Truck } from './trucks'
import type { CollectionPoint } from './types'

const RAW = JSON.stringify({
  d: JSON.stringify({
    DATA: [
      { car_licence: '615-Y5', caption: '臺南市中西區 慶中街', dt: '2026-07-13 19:24:37', x: '120.205782', y: '22.982303', direct: '↗', status: '96', car_no: '', rcar_licence: '', cartype: 'N', car_id: 'CH9K036D' },
      { car_licence: 'BAD-1', caption: '壞資料', dt: '2026-07-13 19:00:00', x: 'abc', y: '22.9', direct: '', status: '', car_no: '', rcar_licence: '', cartype: 'N', car_id: 'X' },
    ],
  }),
})

const point = (routeOrder: number, lat: number, lng: number): CollectionPoint => ({
  id: `東區-177-${routeOrder}`, area: '東區', routeId: '177', routeOrder,
  village: '', name: `站${routeOrder}`, time: '19:30', lat, lng, workDays: [1], recycleDays: [],
})

const truck = (lat: number, lng: number, at = new Date(2026, 6, 13, 19, 25)): Truck => ({
  plate: 'T', caption: '', at, lat, lng, direct: '', cartype: 'N', carId: 'id', substitutePlate: '',
})

describe('haversineMeters', () => {
  it('約 111m per 0.001 度緯度', () => {
    const d = haversineMeters(22.98, 120.2, 22.981, 120.2)
    expect(d).toBeGreaterThan(105)
    expect(d).toBeLessThan(118)
  })
})

describe('parseCarsResponse', () => {
  it('解析雙層 JSON 並丟棄壞座標', () => {
    const trucks = parseCarsResponse(RAW)
    expect(trucks).toHaveLength(1)
    expect(trucks[0].plate).toBe('615-Y5')
    expect(trucks[0].lng).toBeCloseTo(120.205782)
    expect(trucks[0].lat).toBeCloseTo(22.982303)
    expect(trucks[0].at.getHours()).toBe(19)
  })
})

describe('isStale', () => {
  it('超過 10 分鐘為過期', () => {
    const now = new Date(2026, 6, 13, 19, 36)
    expect(isStale(truck(22.98, 120.2, new Date(2026, 6, 13, 19, 25)), now)).toBe(true)
    expect(isStale(truck(22.98, 120.2, new Date(2026, 6, 13, 19, 27)), now)).toBe(false)
  })
})

describe('matchTruckToPoint', () => {
  const route = [point(1, 22.980, 120.200), point(2, 22.982, 120.202), point(3, 22.984, 120.204)]
  const now = new Date(2026, 6, 13, 19, 26)

  it('車在站2附近、我在站3 → 還差 1 站', () => {
    const m = matchTruckToPoint(route[2], route, [truck(22.9821, 120.2021)], now)!
    expect(m.nearestOrder).toBe(2)
    expect(m.stopsAway).toBe(1)
  })
  it('車已過我的站 → stopsAway 為負', () => {
    const m = matchTruckToPoint(route[0], route, [truck(22.9821, 120.2021)], now)!
    expect(m.stopsAway).toBe(-1)
  })
  it('車距路線太遠（>500m）→ null', () => {
    expect(matchTruckToPoint(route[2], route, [truck(23.05, 120.3)], now)).toBeNull()
  })
  it('過期車不匹配', () => {
    const old = truck(22.9821, 120.2021, new Date(2026, 6, 13, 19, 0))
    expect(matchTruckToPoint(route[2], route, [old], now)).toBeNull()
  })
  it('多車取最近', () => {
    const m = matchTruckToPoint(route[2], route, [truck(22.9801, 120.2001), truck(22.9839, 120.2039)], now)!
    expect(m.nearestOrder).toBe(3)
  })
})
