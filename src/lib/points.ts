import raw from '../../data/points.json'
import type { CollectionPoint, PointsFile } from './types'

const file = raw as unknown as PointsFile
export const allPoints: CollectionPoint[] = file.points
export const updatedAt = file.updatedAt

export const pointById = new Map(allPoints.map((p) => [p.id, p]))

export function routeKey(p: CollectionPoint): string {
  return `${p.area}|${p.routeId}`
}

const byRoute = new Map<string, CollectionPoint[]>()
for (const p of allPoints) {
  const k = routeKey(p)
  if (!byRoute.has(k)) byRoute.set(k, [])
  byRoute.get(k)!.push(p)
}
for (const list of byRoute.values()) list.sort((a, b) => a.routeOrder - b.routeOrder)

export function routePoints(key: string): CollectionPoint[] {
  return byRoute.get(key) ?? []
}

export const areas: string[] = [...new Set(allPoints.map((p) => p.area))].sort()

export function routesInArea(area: string): { routeId: string; key: string }[] {
  const keys = new Set<string>()
  for (const p of allPoints) if (p.area === area) keys.add(routeKey(p))
  return [...keys].sort().map((key) => ({ key, routeId: key.split('|')[1] }))
}
