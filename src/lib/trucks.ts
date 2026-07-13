import { haversineMeters } from './geo'
import type { CollectionPoint } from './types'

export interface Truck {
  plate: string; caption: string; at: Date; lat: number; lng: number
  direct: string; cartype: string; carId: string; substitutePlate: string
}

interface RawCar {
  car_licence: string; caption: string; dt: string; x: string; y: string
  direct: string; status: string; car_no: string; rcar_licence: string; cartype: string; car_id: string
}

export function parseCarsResponse(raw: string): Truck[] {
  const outer = JSON.parse(raw) as { d: string }
  const inner = JSON.parse(outer.d) as { DATA?: RawCar[] }
  return (inner.DATA ?? [])
    .map((c): Truck | null => {
      const lat = Number(c.y)
      const lng = Number(c.x)
      const at = new Date(c.dt.replace(' ', 'T'))
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Number.isNaN(at.getTime())) return null
      return {
        plate: c.car_licence, caption: c.caption, at, lat, lng,
        direct: c.direct, cartype: c.cartype, carId: c.car_id, substitutePlate: c.rcar_licence,
      }
    })
    .filter((t): t is Truck => t !== null)
}

export function isStale(truck: Truck, now: Date, maxAgeMs = 10 * 60_000): boolean {
  return now.getTime() - truck.at.getTime() > maxAgeMs
}

export interface TruckMatch {
  truck: Truck; nearestOrder: number; stopsAway: number; distanceM: number
}

const MATCH_RADIUS_M = 500

export function matchTruckToPoint(
  point: CollectionPoint, routePoints: CollectionPoint[], trucks: Truck[], now: Date,
): TruckMatch | null {
  let best: TruckMatch | null = null
  for (const truck of trucks) {
    if (isStale(truck, now)) continue
    let nearest: { order: number; dist: number } | null = null
    for (const p of routePoints) {
      const dist = haversineMeters(truck.lat, truck.lng, p.lat, p.lng)
      if (nearest === null || dist < nearest.dist) nearest = { order: p.routeOrder, dist }
    }
    if (!nearest || nearest.dist > MATCH_RADIUS_M) continue
    if (best === null || nearest.dist < best.distanceM) {
      best = { truck, nearestOrder: nearest.order, stopsAway: point.routeOrder - nearest.order, distanceM: nearest.dist }
    }
  }
  return best
}
