import { writeFileSync, mkdirSync } from 'node:fs'
import { extractJsonArray } from './extractJson'
import { parseDays } from '../src/lib/parseDays'
import type { CollectionPoint, PointsFile } from '../src/lib/types'

const SOURCE = 'https://data.tainan.gov.tw/Resource/84df8cd6-8741-41ed-919c-5105a28ecd6d?handler=GoJson'

interface RawPoint {
  AREA: string; ROUTEID: string; ROUTEORDER: number; VILLAGE: string | null
  POINTNAME: string; TIME: string | null; LONGITUDE: number | null
  LATITUDE: number | null; WORKDAY: string | null; RECYCLEDAY: string | null
}

async function main() {
  console.log('下載中（~28MB，需一兩分鐘）…')
  const res = await fetch(SOURCE)
  if (!res.ok) throw new Error(`下載失敗: HTTP ${res.status}`)
  const html = await res.text()
  const raw = extractJsonArray(html) as unknown as RawPoint[]
  console.log(`原始筆數: ${raw.length}`)
  if (raw.length < 10000) throw new Error('筆數異常偏低，疑似上游改版或截斷')

  const seen = new Map<string, number>()
  let skippedNoCoord = 0
  let skippedBadCoord = 0
  const points: CollectionPoint[] = []
  for (const r of raw) {
    if (r.LONGITUDE == null || r.LATITUDE == null) { skippedNoCoord++; continue }
    if (r.LONGITUDE < 119.9 || r.LONGITUDE > 120.7 || r.LATITUDE < 22.7 || r.LATITUDE > 23.5) {
      skippedBadCoord++ // 實測上游有零星超界座標（如緯度 24.1 的錯誤點位），比照缺座標略過
      continue
    }
    if (r.TIME != null && !/^\d{2}:\d{2}$/.test(r.TIME))
      throw new Error(`TIME 格式異常: ${JSON.stringify(r.TIME)}`)
    const base = `${r.AREA}-${r.ROUTEID}-${r.ROUTEORDER}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    points.push({
      id: n === 1 ? base : `${base}-${n}`,
      area: r.AREA,
      routeId: r.ROUTEID,
      routeOrder: r.ROUTEORDER,
      village: r.VILLAGE ?? '',
      name: r.POINTNAME,
      time: r.TIME,
      lat: Math.round(r.LATITUDE * 1e6) / 1e6,
      lng: Math.round(r.LONGITUDE * 1e6) / 1e6,
      workDays: parseDays(r.WORKDAY),
      recycleDays: parseDays(r.RECYCLEDAY),
    })
  }
  const skipped = skippedNoCoord + skippedBadCoord
  if (skipped > raw.length * 0.01)
    throw new Error(`略過筆數異常（${skipped}/${raw.length}），疑似上游座標格式改版`)
  const out: PointsFile = { updatedAt: new Date().toISOString().slice(0, 10), points }
  mkdirSync('data', { recursive: true })
  writeFileSync('data/points.json', JSON.stringify(out))
  console.log(`完成: ${points.length} 點（略過 ${skippedNoCoord} 筆缺座標、${skippedBadCoord} 筆超界座標）→ data/points.json`)
}

main()
