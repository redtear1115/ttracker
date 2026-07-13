import { haversineMeters } from './geo'
import type { CollectionPoint } from './types'

export interface NearbyStop {
  point: CollectionPoint
  distanceM: number
}

export function nearbyStops(
  points: CollectionPoint[],
  lat: number,
  lng: number,
  limit = 10,
  radiusM = 500,
): NearbyStop[] {
  return points
    .map((point) => ({ point, distanceM: haversineMeters(lat, lng, point.lat, point.lng) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit)
}
