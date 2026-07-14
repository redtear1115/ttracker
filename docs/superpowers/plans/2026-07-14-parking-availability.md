# 停車場即時查詢 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ttracker 加入第四分頁「停車」，以地圖顯示台南 260 處路外停車場的即時汽車剩餘格位。

**Architecture:** Cloudflare Pages Function `/api/parking` 抓交通局 SOA JSON（無 CORS，前端不能直讀），瘦身成 ~30KB 後以 60 秒 cache 回應；前端 ParkingView 用自有 Leaflet 地圖畫剩餘數字 chip，60 秒輪詢。解析／正規化是 `src/lib/parking.ts` 純函式，function、vite dev proxy、測試三方共用。

**Tech Stack:** Svelte 5 runes、Leaflet 1.9、Vitest、Cloudflare Pages Functions。無新依賴。

**Spec:** `docs/superpowers/specs/2026-07-13-parking-availability-design.md`（含實測驗證的上游行為）

## Global Constraints

- 上游端點：`https://soa.tainan.gov.tw/Api/Service/Get/91073f40-d251-42cc-9f4c-88e8937c9911`（回 `{ data: [...] }`，260 筆）
- `lnglat` 欄位名寫 lnglat，**實際順序是 `lat,lng`**（半形逗號）
- `car < 0` ＝無感應器 → 正規化 `null`；`car_total <= 0` → `carTotal: null`
- 座標清洗範圍（比照 `scripts/fetch-points.ts`）：lat 22.7–23.5、lng 119.9–120.7
- 節流：上游無 rate limit，我方 cache 60 秒（沿用 `functions/api/gps.ts` 的 module 級 cache 模式，不用 caches.default——與 repo 既有模式一致，效果相同）
- 顏色紀律（DESIGN.md One-Truck Rule）：停車功能只用 teal（#2e7688）／danger（#b3372e）／muted（#52646e）＋白，**禁止 truck-green**；地圖標記用色階深端（淺色地圖磚）
- 圖標只用 Lucide 內嵌 SVG（No-Emoji Rule）
- 測試指令：`npm test`（vitest run）；型別檢查：`npm run check`
- 每個 task 結尾 commit，訊息附：
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 與 `Claude-Session: https://claude.ai/code/session_01R12bJGGXGzejnzRhZdLzGi`

---

### Task 1: 解析與正規化純函式 `src/lib/parking.ts`

**Files:**
- Create: `src/lib/parking.ts`
- Test: `src/lib/parking.test.ts`

**Interfaces:**
- Produces:
  - `PARKING_UPSTREAM: string`（上游 URL 常數）
  - `interface ParkingLot { id: string; name: string; zone: string; address: string; car: number | null; carTotal: number | null; updateTime: string; lat: number; lng: number; fee: string | null }`
  - `slimParkingResponse(json: unknown): ParkingLot[]`（壞筆剔除，格式全壞 throw）
  - `type Availability = { kind: 'open'; count: number } | { kind: 'full' } | { kind: 'unknown' }`
  - `availability(lot: Pick<ParkingLot, 'car' | 'carTotal'>): Availability`
  - `isParkingStale(updateTime: string, now: Date): boolean`（>30 分鐘）

- [ ] **Step 1: 寫失敗測試**

`src/lib/parking.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { slimParkingResponse, availability, isParkingStale } from './parking'

// 真實上游一筆（2026-07-13 實測），欄位可覆寫
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    typeId: '2', typeName: '公有收費停車場', id: '1', code: 'B00001',
    name: '海安路地下停車場', zoneId: '1', zone: '中西區',
    address: '台南市中西區海安路188號B1',
    largeCar: 0, car: 378, carDis: 0, carWoman: 0, carGreen: 0, moto: 0, motoDis: 0,
    largeCar_total: 0, car_total: 909, carDis_total: 28, carWoman_total: 21,
    carGreen_total: 24, moto_total: 0, motoDis_total: 0,
    chargeTime: '', chargeFee: '',
    update_time: '2026-07-13 17:48:04',
    lnglat: '22.991501,120.195621',
    ...over,
  }
}

describe('slimParkingResponse', () => {
  it('瘦身成 ParkingLot，lnglat 依 lat,lng 順序解析', () => {
    const lots = slimParkingResponse({ data: [raw()] })
    expect(lots).toEqual([{
      id: '1', name: '海安路地下停車場', zone: '中西區',
      address: '台南市中西區海安路188號B1',
      car: 378, carTotal: 909,
      updateTime: '2026-07-13 17:48:04',
      lat: 22.991501, lng: 120.195621, fee: null,
    }])
  })

  it('car=-1（無感應器）→ car: null', () => {
    const [lot] = slimParkingResponse({ data: [raw({ car: -1 })] })
    expect(lot.car).toBeNull()
    expect(lot.carTotal).toBe(909)
  })

  it('car_total=0（無汽車位）→ carTotal 與 car 都是 null', () => {
    const [lot] = slimParkingResponse({ data: [raw({ car_total: 0 })] })
    expect(lot.carTotal).toBeNull()
    expect(lot.car).toBeNull()
  })

  it('chargeFee 有值時保留', () => {
    const [lot] = slimParkingResponse({ data: [raw({ chargeFee: '汽車30元/時' })] })
    expect(lot.fee).toBe('汽車30元/時')
  })

  it('座標超界（比照 points 清洗範圍）的整筆剔除', () => {
    expect(slimParkingResponse({ data: [raw({ lnglat: '24.1,120.2' })] })).toEqual([])
    expect(slimParkingResponse({ data: [raw({ lnglat: '22.99,121.0' })] })).toEqual([])
  })

  it('lnglat 壞掉（非數字／缺半邊）的整筆剔除', () => {
    expect(slimParkingResponse({ data: [raw({ lnglat: 'x' })] })).toEqual([])
    expect(slimParkingResponse({ data: [raw({ lnglat: '' })] })).toEqual([])
  })

  it('缺 data 陣列時 throw（上游改版警報）', () => {
    expect(() => slimParkingResponse({})).toThrow()
    expect(() => slimParkingResponse({ data: 'nope' })).toThrow()
  })
})

describe('availability', () => {
  it('有位 → open 帶數字', () => {
    expect(availability({ car: 378, carTotal: 909 })).toEqual({ kind: 'open', count: 378 })
  })
  it('0 → full', () => {
    expect(availability({ car: 0, carTotal: 909 })).toEqual({ kind: 'full' })
  })
  it('car null 或 carTotal null → unknown', () => {
    expect(availability({ car: null, carTotal: 909 })).toEqual({ kind: 'unknown' })
    expect(availability({ car: 5, carTotal: null })).toEqual({ kind: 'unknown' })
  })
})

describe('isParkingStale', () => {
  const now = new Date('2026-07-13T18:00:00')
  it('30 分鐘內不算過時', () => {
    expect(isParkingStale('2026-07-13 17:48:04', now)).toBe(false)
  })
  it('超過 30 分鐘算過時', () => {
    expect(isParkingStale('2026-07-13 17:20:00', now)).toBe(true)
  })
  it('解析不了的時間視為過時', () => {
    expect(isParkingStale('', now)).toBe(true)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/parking.test.ts`
Expected: FAIL——`Cannot find module './parking'`（或同義錯誤）

- [ ] **Step 3: 最小實作**

`src/lib/parking.ts`：

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/lib/parking.test.ts`
Expected: PASS（13 tests）

- [ ] **Step 5: 全套檢查後 commit**

Run: `npm run check && npm test`
Expected: 0 errors；全部測試通過

```bash
git add src/lib/parking.ts src/lib/parking.test.ts
git commit -m "feat: 停車場上游資料瘦身與正規化（lat,lng 順序、-1 防禦、座標清洗）"
```

---

### Task 2: `/api/parking` Pages Function 與 dev proxy

**Files:**
- Create: `functions/api/parking.ts`
- Modify: `vite.config.ts`（在 `gpsDevProxy` 函式後加 `parkingDevProxy`，並掛進 `plugins`）

**Interfaces:**
- Consumes: Task 1 的 `PARKING_UPSTREAM`、`slimParkingResponse`
- Produces: HTTP GET `/api/parking` → `200 {"fetchedAt":"<ISO>","lots":[ParkingLot...]}`；上游失敗 → `502 {"error":"upstream"}`（前端據此顯示「暫不可用」）

- [ ] **Step 1: 寫 Pages Function**

`functions/api/parking.ts`（模式比照 `functions/api/gps.ts`）：

```ts
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
```

- [ ] **Step 2: 加 dev proxy**

`vite.config.ts`——在檔案頂部 import 區加：

```ts
import { PARKING_UPSTREAM, slimParkingResponse } from './src/lib/parking'
```

在 `gpsDevProxy()` 函式定義之後加：

```ts
// 開發期代理：停車場上游無 CORS，dev server 代打（正式環境由 functions/api/parking.ts 處理）
function parkingDevProxy(): Plugin {
  return {
    name: 'parking-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/parking', async (_req, res) => {
        try {
          const r = await fetch(PARKING_UPSTREAM)
          if (!r.ok) throw new Error('bad upstream')
          const lots = slimParkingResponse(await r.json())
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ fetchedAt: new Date().toISOString(), lots }))
        } catch {
          res.statusCode = 502
          res.end('{"error":"upstream"}')
        }
      })
    },
  }
}
```

`plugins` 陣列的 `gpsDevProxy(),` 之後加一行 `parkingDevProxy(),`。

- [ ] **Step 3: 實測 dev proxy**

Run:
```bash
npm run dev &   # 或已在跑
sleep 2 && curl -s http://localhost:5173/api/parking | head -c 200; echo
```
Expected: `{"fetchedAt":"2026-…","lots":[{"id":"1","name":"海安路地下停車場",…` 開頭的 JSON；`"lots"` 長度約 260

- [ ] **Step 4: 型別檢查後 commit**

Run: `npm run check`
Expected: 0 errors（`functions/` 由 tsconfig.node.json 覆蓋，`PagesFunction` 型別來自既有的 `@cloudflare/workers-types`）

```bash
git add functions/api/parking.ts vite.config.ts
git commit -m "feat: /api/parking edge 瘦身代理（60s 節流）與 dev proxy"
```

---

### Task 3: 輪詢器、地圖 chip、分頁圖標

**Files:**
- Create: `src/lib/parkingPoller.svelte.ts`
- Modify: `src/lib/mapIcons.ts`（檔尾加停車 chip）
- Modify: `src/components/Icon.svelte`（`IconName` union 與 `PATHS` 各加 `circle-parking`）

**Interfaces:**
- Consumes: Task 1 的 `ParkingLot`、`Availability`；`/api/parking` 端點
- Produces:
  - `parking`（singleton）：`{ lots: ParkingLot[]; status: 'idle' | 'ok' | 'error'; lastFetched: Date | null; start(): void; stop(): void; refresh(): Promise<void> }`
  - `parkingMarkerHtml(a: Availability): string`
  - `Icon` 支援 `name="circle-parking"`

- [ ] **Step 1: 輪詢器（模式比照 `gpsPoller.svelte.ts`，間隔 60s 對齊 cache TTL）**

`src/lib/parkingPoller.svelte.ts`：

```ts
import type { ParkingLot } from './parking'

const INTERVAL_MS = 60_000 // 與 /api/parking 的 cache TTL 對齊

class ParkingPoller {
  lots = $state<ParkingLot[]>([])
  status = $state<'idle' | 'ok' | 'error'>('idle')
  lastFetched = $state<Date | null>(null)
  #timer: ReturnType<typeof setInterval> | null = null

  async #fetch(): Promise<void> {
    try {
      const r = await fetch('/api/parking')
      if (!r.ok) throw new Error(String(r.status))
      const json = (await r.json()) as { lots: ParkingLot[] }
      this.lots = json.lots
      this.status = 'ok'
      this.lastFetched = new Date()
    } catch {
      this.status = 'error'
    }
  }

  refresh(): Promise<void> {
    return this.#fetch()
  }

  start(): void {
    if (this.#timer) return
    void this.#fetch()
    this.#timer = setInterval(() => void this.#fetch(), INTERVAL_MS)
    document.addEventListener('visibilitychange', this.#onVisibility)
  }

  stop(): void {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
    document.removeEventListener('visibilitychange', this.#onVisibility)
  }

  #onVisibility = (): void => {
    if (document.hidden) {
      if (this.#timer) clearInterval(this.#timer)
      this.#timer = null
    } else if (!this.#timer) {
      void this.#fetch()
      this.#timer = setInterval(() => void this.#fetch(), INTERVAL_MS)
    }
  }
}

export const parking = new ParkingPoller()
```

- [ ] **Step 2: 地圖 chip**

`src/lib/mapIcons.ts` 檔尾加（import 區加 `import type { Availability } from './parking'`）：

```ts
// 停車 chip：帶剩餘數的圓標記。停車與垃圾車無關——
// teal／danger／muted ＋白邊，禁用 truck-green（One-Truck Rule）
function parkingChip(bg: string, label: string): string {
  return (
    `<div style="min-width:30px;height:30px;padding:0 5px;border-radius:999px;` +
    `background:${bg};box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,0.35);` +
    `display:flex;align-items:center;justify-content:center;color:#fff;` +
    `font:700 12px/1 'Noto Sans TC',system-ui,sans-serif;box-sizing:border-box;">${label}</div>`
  )
}

export function parkingMarkerHtml(a: Availability): string {
  if (a.kind === 'open') return parkingChip('#2e7688', String(a.count)) // 淺色地圖磚專用深青
  if (a.kind === 'full') return parkingChip('#b3372e', '滿')
  return parkingChip('#52646e', '—')
}
```

- [ ] **Step 3: Icon 加 `circle-parking`**

`src/components/Icon.svelte`——`IconName` union 加一行 `| 'circle-parking'`；`PATHS` 物件加（path 取自 lucide-static@1.24.0 官方 SVG，已驗證）：

```ts
'circle-parking':
  '<circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
```

- [ ] **Step 4: 檢查後 commit**

Run: `npm run check && npm test`
Expected: 0 errors；全部測試通過（本 task 無新測試——輪詢器與既有 gpsPoller 同構、chip 是字串模板，行為由 Task 1 的 `availability` 測試與 Task 5 的視覺驗證覆蓋）

```bash
git add src/lib/parkingPoller.svelte.ts src/lib/mapIcons.ts src/components/Icon.svelte
git commit -m "feat: 停車輪詢器、地圖剩餘數 chip、circle-parking 圖標"
```

---

### Task 4: ParkingView 與第四分頁

**Files:**
- Create: `src/views/ParkingView.svelte`
- Modify: `src/App.svelte`（view union 加 `'parking'`、lazy import、第四個 tab）
- Modify: `src/app.css`（`:global(.marker-icon)` 樣式從 MapView 移到共用處＋新增 `.parkbanner`/`.parkcount`）
- Modify: `src/views/MapView.svelte`（刪掉移走的 `:global(.marker-icon)` 那行）

**Interfaces:**
- Consumes: Task 1 `availability`/`isParkingStale`/`ParkingLot`、Task 3 `parking`/`parkingMarkerHtml`、`Icon name="circle-parking"`、app.css 既有的 `.sheet`/`.sheet-head`/`.sheet-title`/`.sheet-actions`/`.ghost`/`.muted` 樣式
- Produces: 使用者可見的「停車」分頁

- [ ] **Step 1: 建 ParkingView**

`src/views/ParkingView.svelte`：

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { parking } from '../lib/parkingPoller.svelte'
  import { availability, isParkingStale, type ParkingLot } from '../lib/parking'
  import { parkingMarkerHtml } from '../lib/mapIcons'
  import Icon from '../components/Icon.svelte'

  let el: HTMLDivElement
  let map: L.Map
  let lotLayer = L.layerGroup()
  let selected = $state<ParkingLot | null>(null)

  onMount(() => {
    map = L.map(el, { zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    lotLayer.addTo(map)
    map.setView([22.99, 120.21], 14)
    // 情境是「到陣地前找車位」：有 GPS 就跳到人所在的位置
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {},
      { maximumAge: 60_000, timeout: 5_000 },
    )
    parking.start()
    return () => {
      parking.stop()
      map.remove()
    }
  })

  $effect(() => {
    lotLayer.clearLayers()
    for (const lot of parking.lots) {
      const icon = L.divIcon({
        className: 'marker-icon',
        html: parkingMarkerHtml(availability(lot)),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker([lot.lat, lot.lng], { icon })
        .on('click', () => (selected = lot))
        .addTo(lotLayer)
    }
  })

  function ageLabel(lot: ParkingLot): string {
    const t = new Date(lot.updateTime.replace(' ', 'T'))
    if (Number.isNaN(t.getTime())) return '更新時間不明'
    const mins = Math.max(0, Math.round((Date.now() - t.getTime()) / 60_000))
    return mins === 0 ? '剛剛更新' : `${mins} 分鐘前更新`
  }
</script>

<div class="map" bind:this={el}></div>

{#if parking.status === 'error'}
  <div class="parkbanner">
    {parking.lots.length === 0 ? '即時車位暫不可用' : '連線失敗，顯示上次成功的資料'}
  </div>
{/if}

{#if selected}
  <div class="sheet">
    <header class="sheet-head">
      <h3 class="sheet-title"><Icon name="circle-parking" size={18} />{selected.name}</h3>
      <div class="sheet-actions">
        <button class="ghost" onclick={() => (selected = null)} aria-label="關閉"><Icon name="x" size={18} /></button>
      </div>
    </header>
    <p class="muted">{selected.zone}・{selected.address}</p>
    {#if availability(selected).kind === 'unknown'}
      <p class="parkcount muted">無汽車位即時資料</p>
    {:else}
      <p class="parkcount"><strong>{selected.car}</strong> ／ 共 {selected.carTotal} 位</p>
    {/if}
    <p class="muted">
      {ageLabel(selected)}{isParkingStale(selected.updateTime, new Date()) ? '・資料可能過時' : ''}
    </p>
    {#if selected.fee}<p class="muted">{selected.fee}</p>{/if}
  </div>
{/if}

<style>
  .map { position: fixed; inset: 0 0 56px 0; }
</style>
```

- [ ] **Step 2: App.svelte 加第四分頁**

`src/App.svelte` 整檔改為：

```svelte
<script lang="ts">
  import HomeView from './views/HomeView.svelte'
  import SearchView from './views/SearchView.svelte'
  import { gps } from './lib/gpsPoller.svelte'
  import { onMount } from 'svelte'

  let view = $state<'home' | 'search' | 'map' | 'parking'>('home')
  onMount(() => {
    gps.start()
    return () => gps.stop()
  })
</script>

<main>
  {#if view === 'home'}
    <HomeView gotoSearch={() => (view = 'search')} />
  {:else if view === 'search'}
    <SearchView />
  {:else if view === 'map'}
    {#await import('./views/MapView.svelte') then { default: MapView }}
      <MapView />
    {/await}
  {:else}
    {#await import('./views/ParkingView.svelte') then { default: ParkingView }}
      <ParkingView />
    {/await}
  {/if}
</main>

<nav class="tabbar">
  <button class:active={view === 'home'} onclick={() => (view = 'home')}>最愛</button>
  <button class:active={view === 'search'} onclick={() => (view = 'search')}>搜尋</button>
  <button class:active={view === 'map'} onclick={() => (view = 'map')}>地圖</button>
  <button class:active={view === 'parking'} onclick={() => (view = 'parking')}>停車</button>
</nav>
```

（分頁維持現有的純文字樣式，與其他三頁一致；spec 提的 circle-parking 圖標用在詳情面板標題。）

- [ ] **Step 3: 共用樣式**

`src/app.css`——在 `.tabbar` 區塊附近（tabbar 規則之後）加：

```css
/* ---- shared map marker / parking view ---- */
.marker-icon { background: none; border: none; line-height: 0; }
.parkbanner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500; /* Leaflet pane 之上、sheet 之下 */
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--card);
  color: var(--muted);
  font-size: 0.85rem;
  border: 1px solid var(--hairline);
}
.parkcount { margin: 10px 0 4px; font-size: 1rem; }
.parkcount strong { font-size: 1.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
```

`src/views/MapView.svelte` 的 `<style>` 區刪掉這行（已移到 app.css；`.map` 與 `.addplace` 保留）：

```css
:global(.marker-icon) { background: none; border: none; line-height: 0; }
```

- [ ] **Step 4: 檢查後 commit**

Run: `npm run check && npm test`
Expected: 0 errors；全部測試通過

```bash
git add src/views/ParkingView.svelte src/App.svelte src/app.css src/views/MapView.svelte
git commit -m "feat: 停車分頁——即時剩餘車位地圖與詳情面板"
```

---

### Task 5: 端到端驗證

**Files:** 無新檔；只驗證與修小問題

- [ ] **Step 1: 全套檢查**

Run: `npm run check && npm test && npm run build`
Expected: check 0 errors、測試全過、build 成功（PWA precache 正常產出）

- [ ] **Step 2: dev 實測 API**

Run:
```bash
npm run dev &
sleep 2
curl -s http://localhost:5173/api/parking | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('lots:',j.lots.length,'first:',j.lots[0].name)})"
```
Expected: `lots: ~260 first: 海安路地下停車場`（±數筆，座標清洗可能剔除少數）

- [ ] **Step 3: 瀏覽器驗證（主session 用 Chrome 工具做）**

檢查清單：
- 「停車」分頁出現且 active 色是 teal（不是綠）
- 地圖上出現數字 chip：深青（有位）／紅「滿」／灰「—」三態至少各找一個（灰可能沒有，樣本裡 unknown 來自 car_total=0 的場，實測有）
- 點 chip 開詳情面板：名稱、區＋地址、「N ／ 共 M 位」、更新時間、收費（有值的場）
- 深色與淺色主題下面板都可讀（面板用 token，chip 在地圖磚上不隨主題變）
- 斷網（dev server 停掉）後切回分頁：顯示「即時車位暫不可用」

- [ ] **Step 4: 殘項清零後結束**

有小問題就修＋commit；沒問題本 task 無 commit。

---

## Self-Review 紀錄

- **Spec coverage**：資料層規則（lat,lng、-1、超界、fee、fetchedAt）→ Task 1/2；60s 節流 → Task 2；分頁＋地圖＋chip 三態＋詳情＋輪詢 → Task 3/4；錯誤離線橫幅 → Task 4；測試 → Task 1；YAGNI 排除項未實作 ✓
- **偏差（兩處，皆有理由）**：① cache 用 repo 既有的 module 級模式而非 caches.default（一致性，效果同）；② 分頁不放圖標維持四 tab 純文字一致，circle-parking 移到面板標題
- **Placeholder scan**：無 TBD／無「適當處理」／每步有完整程式碼 ✓
- **Type consistency**：`ParkingLot`／`Availability`／`parking`／`parkingMarkerHtml` 名稱在 Task 1/3/4 間一致 ✓
