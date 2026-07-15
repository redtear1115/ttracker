import { PARKING_UPSTREAM, slimParkingResponse } from '../../src/lib/parking'

let cached: { body: string; at: number } | null = null
// 上游無 rate limit 防護，節流責任在我方：60 秒內共用同一份回應
const TTL_MS = 60_000

export const onRequestGet: PagesFunction = async () => {
  if (cached && Date.now() - cached.at < TTL_MS) return ok(cached.body)
  try {
    const r = await fetch(PARKING_UPSTREAM)
    if (!r.ok) throw new Error(String(r.status))
    const lots = slimParkingResponse(await r.json())
    const body = JSON.stringify({ fetchedAt: new Date().toISOString(), lots })
    cached = { body, at: Date.now() }
    return ok(body)
  } catch {
    return new Response('{"error":"upstream"}', {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}

function ok(body: string): Response {
  return new Response(body, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' },
  })
}
