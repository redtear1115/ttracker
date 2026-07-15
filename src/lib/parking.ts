// 臺南市停車場即時剩餘車位——上游回應瘦身與正規化。
// 上游無 CORS，瀏覽器必須經 /api/parking 代理；本模組同時供
// Pages Function、vite dev proxy 與測試使用，保持純函式。
export const PARKING_UPSTREAM =
  'https://soa.tainan.gov.tw/Api/Service/Get/91073f40-d251-42cc-9f4c-88e8937c9911'

export interface ParkingLot {
  id: string
  name: string
  zone: string
  address: string
  /** 剩餘汽車位；null＝無感應器（上游 -1）或無資料 */
  car: number | null
  /** 汽車總格位；null＝該場無汽車位資料（上游 car_total<=0） */
  carTotal: number | null
  /** 上游逐場更新時間（"YYYY-MM-DD HH:mm:ss"，台灣時間） */
  updateTime: string
  lat: number
  lng: number
  fee: string | null
}

interface RawLot {
  id?: unknown; name?: unknown; zone?: unknown; address?: unknown
  car?: unknown; car_total?: unknown; update_time?: unknown
  lnglat?: unknown; chargeFee?: unknown
}

// 比照 scripts/fetch-points.ts 的台南座標清洗範圍
const LAT_MIN = 22.7, LAT_MAX = 23.5, LNG_MIN = 119.9, LNG_MAX = 120.7

export function slimParkingResponse(json: unknown): ParkingLot[] {
  const data = (json as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) throw new Error('上游格式異常：缺 data 陣列——可能已改版')
  const lots: ParkingLot[] = []
  for (const r of data as RawLot[]) {
    // 欄位名叫 lnglat，實測順序其實是 lat,lng（半形逗號）
    const [latS, lngS] = String(r.lnglat ?? '').split(',')
    const lat = Number(latS), lng = Number(lngS)
    if (!latS || !lngS || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) continue
    const rawTotal = Number(r.car_total)
    const carTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : null
    const rawCar = Number(r.car)
    const car = carTotal == null || !Number.isFinite(rawCar) || rawCar < 0 ? null : rawCar
    lots.push({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      zone: String(r.zone ?? ''),
      address: String(r.address ?? ''),
      car,
      carTotal,
      updateTime: String(r.update_time ?? ''),
      lat,
      lng,
      fee: r.chargeFee ? String(r.chargeFee) : null,
    })
  }
  return lots
}

export type Availability =
  | { kind: 'open'; count: number }
  | { kind: 'full' }
  | { kind: 'unknown' }

export function availability(lot: Pick<ParkingLot, 'car' | 'carTotal'>): Availability {
  if (lot.car == null || lot.carTotal == null) return { kind: 'unknown' }
  if (lot.car === 0) return { kind: 'full' }
  return { kind: 'open', count: lot.car }
}

/** update_time 距 now 超過 30 分鐘＝可能過時；解析失敗也算 */
export function isParkingStale(updateTime: string, now: Date): boolean {
  const t = new Date(updateTime.replace(' ', 'T'))
  if (Number.isNaN(t.getTime())) return true
  return now.getTime() - t.getTime() > 30 * 60_000
}
