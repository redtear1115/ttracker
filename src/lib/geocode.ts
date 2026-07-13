const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export interface GeocodeResult {
  name: string
  lat: number
  lng: number
}

/** Nominatim 地址/地標搜尋。任何錯誤、逾時、空結果一律回空陣列——呼叫端以「找不到」處理。 */
export async function geocode(q: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q, format: 'jsonv2', countrycodes: 'tw', limit: '5',
    viewbox: '119.9,23.5,120.7,22.7', bounded: '1',
  })
  try {
    const r = await fetch(`${ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
    })
    if (!r.ok) return []
    const data = (await r.json()) as { display_name?: string; lat?: string; lon?: string }[]
    return data
      .map((d) => ({ name: d.display_name ?? '', lat: Number(d.lat), lng: Number(d.lon) }))
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
  } catch {
    return []
  }
}
