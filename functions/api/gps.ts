const UPSTREAM = 'https://clean.tnepb.gov.tw/WebService/WsSkyeyes.asmx/NewgetCarsinfo'

let cached: { body: string; at: number } | null = null

export const onRequestGet: PagesFunction = async () => {
  if (cached && Date.now() - cached.at < 10_000) return ok(cached.body)
  try {
    const r = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Referer: 'https://clean.tnepb.gov.tw/GarbageTruckLiveFeed',
      },
      body: '{}',
    })
    const text = await r.text()
    if (!r.ok || !text.trimStart().startsWith('{')) throw new Error('upstream not json')
    cached = { body: text, at: Date.now() }
    return ok(text)
  } catch {
    return new Response('{"error":"upstream"}', { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

function ok(body: string): Response {
  return new Response(body, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=10' },
  })
}
