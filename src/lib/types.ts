export interface CollectionPoint {
  id: string          // `${area}-${routeId}-${routeOrder}`，重複時尾綴 `-2`, `-3`…
  area: string
  routeId: string
  routeOrder: number
  village: string
  name: string
  time: string | null // "HH:mm"；來源為 null 時保持 null
  lat: number
  lng: number
  workDays: number[]  // 1=一…7=日；「無清運」與 null → []
  recycleDays: number[]
}

export interface PointsFile {
  updatedAt: string   // ISO date
  points: CollectionPoint[]
}
