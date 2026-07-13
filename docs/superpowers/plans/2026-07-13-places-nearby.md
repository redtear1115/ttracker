# 我的地點＋臨近站點 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 儲存多個具名地點（住家/公司），地圖上顯示各地點 500m 圈與臨近站點面板，🚮/♻️ 標記下一班是否有回收。

**Architecture:** 三個新 lib 單元（places store、geocode、nearby 純函式）＋ MapView 疊加地點圖層與兩個底部面板元件；🚮/♻️ 判斷抽成 `schedule.ts` 的共用純函式，最愛卡片與臨近列表共用。詳見 `docs/superpowers/specs/2026-07-13-places-nearby-design.md`。

**Tech Stack:** 既有 stack（Svelte 5 runes、Leaflet、Vitest）；geocoding 用 Nominatim（瀏覽器直打，CORS 已實測）。

## Global Constraints

- 所有既有測試保持綠；TS strict；純邏輯進 `src/lib/` 並有 Vitest。
- localStorage key：`ttracker.places.v1`；壞資料 fallback `[]`（比照 favorites）。
- Nominatim：`https://nominatim.openstreetmap.org/search`、參數 `format=jsonv2&countrycodes=tw&limit=5&viewbox=119.9,23.5,120.7,22.7&bounded=1`、10 秒逾時、任何錯誤/空結果一律回 `[]` 不拋。按鈕觸發，不做 autocomplete。
- 🚮/♻️ 規則：**下一班當天** `recycleDays` 含該日 → ♻️，否則 🚮；無下一班 → 不顯示。
- 臨近：半徑 500m、最多 10 點、依距離排序、圈內不足不硬湊。
- UI 繁體中文；深色 tokens；44px 觸控目標。
- Conventional commits，結尾 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

### Task 1: 純邏輯——nextArrivalHasRecycle 與 nearbyStops

**Files:**
- Modify: `src/lib/schedule.ts`（檔尾加一個函式）
- Create: `src/lib/nearby.ts`
- Test: `src/lib/schedule.test.ts`（追加 describe）、`src/lib/nearby.test.ts`

**Interfaces:**
- Consumes: `nextArrival`/`isoDay`（schedule.ts 既有）、`haversineMeters`（geo.ts）、`CollectionPoint`（types.ts）
- Produces:
  - `nextArrivalHasRecycle(point: Pick<CollectionPoint, 'time' | 'workDays' | 'recycleDays'>, now: Date): boolean | null`
  - `nearby.ts`：`interface NearbyStop { point: CollectionPoint; distanceM: number }`、`nearbyStops(points: CollectionPoint[], lat: number, lng: number, limit = 10, radiusM = 500): NearbyStop[]`

- [ ] **Step 1: 寫失敗測試**

`src/lib/schedule.test.ts` 檔尾追加：

```ts
describe('nextArrivalHasRecycle', () => {
  // mon(h, m) 已存在於檔案上方（2026-07-13 週一）
  it('下一班當天是回收日 → true', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [1, 4] }, mon(18, 0))).toBe(true)
  })
  it('下一班當天非回收日 → false', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [2, 6] }, mon(18, 0))).toBe(false)
  })
  it('今天班次過了、下一班在週四且週四有回收 → true', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [4] }, mon(20, 0))).toBe(true)
  })
  it('無班次 → null', () => {
    expect(nextArrivalHasRecycle({ time: null, workDays: [1], recycleDays: [1] }, mon(12, 0))).toBeNull()
  })
})
```

（import 行補上 `nextArrivalHasRecycle`。）

`src/lib/nearby.test.ts`（新檔）：

```ts
import { describe, it, expect } from 'vitest'
import { nearbyStops } from './nearby'
import type { CollectionPoint } from './types'

const pt = (id: string, lat: number, lng: number): CollectionPoint => ({
  id, area: '東區', routeId: '1', routeOrder: 1, village: '', name: id,
  time: '19:00', lat, lng, workDays: [1], recycleDays: [],
})

// 0.001 度緯度 ≈ 111m
const HOME = { lat: 22.98, lng: 120.2 }
const points = [
  pt('near-111m', 22.981, 120.2),
  pt('near-222m', 22.982, 120.2),
  pt('far-1km', 22.989, 120.2),
]

describe('nearbyStops', () => {
  it('依距離排序且只含 500m 圈內', () => {
    const r = nearbyStops(points, HOME.lat, HOME.lng)
    expect(r.map((s) => s.point.id)).toEqual(['near-111m', 'near-222m'])
    expect(r[0].distanceM).toBeGreaterThan(100)
    expect(r[0].distanceM).toBeLessThan(120)
  })
  it('limit 生效', () => {
    expect(nearbyStops(points, HOME.lat, HOME.lng, 1)).toHaveLength(1)
  })
  it('圈內不足不硬湊、圈外為空', () => {
    expect(nearbyStops(points, 23.3, 120.5)).toEqual([])
  })
  it('自訂半徑', () => {
    expect(nearbyStops(points, HOME.lat, HOME.lng, 10, 2000)).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/schedule.test.ts src/lib/nearby.test.ts`
Expected: FAIL（`nextArrivalHasRecycle` 未匯出、`./nearby` 不存在）

- [ ] **Step 3: 實作**

`src/lib/schedule.ts` 檔尾追加（檔頭補 `import type { CollectionPoint } from './types'`）：

```ts
export function nextArrivalHasRecycle(
  point: Pick<CollectionPoint, 'time' | 'workDays' | 'recycleDays'>,
  now: Date,
): boolean | null {
  const at = nextArrival(point.time, point.workDays, now)
  return at ? point.recycleDays.includes(isoDay(at)) : null
}
```

`src/lib/nearby.ts`（新檔）：

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run`
Expected: 全綠（既有 29 + 新 8）

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "feat: 下一班回收判斷與臨近站點計算"
```

---

### Task 2: places store 與 geocode

**Files:**
- Create: `src/lib/places.svelte.ts`, `src/lib/geocode.ts`
- Test: `src/lib/places.test.ts`

**Interfaces:**
- Produces:
  - `places.svelte.ts`：`interface Place { id: string; name: string; lat: number; lng: number }`、單例 `places`——`list: Place[]`（$state）、`add(name, lat, lng): Place`、`remove(id): void`
  - `geocode.ts`：`interface GeocodeResult { name: string; lat: number; lng: number }`、`geocode(q: string): Promise<GeocodeResult[]>`

- [ ] **Step 1: 寫 places 失敗測試 `src/lib/places.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

describe('places', () => {
  beforeEach(() => { store.clear(); vi.resetModules() })

  it('add 回傳含 uuid 的地點並持久化', async () => {
    const { places } = await import('./places.svelte')
    const p = places.add('家', 22.98, 120.2)
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(places.list).toEqual([p])
    expect(JSON.parse(store.get('ttracker.places.v1')!)).toEqual([p])
  })

  it('remove 移除並持久化', async () => {
    const { places } = await import('./places.svelte')
    const p = places.add('公司', 23.0, 120.21)
    places.remove(p.id)
    expect(places.list).toEqual([])
    expect(JSON.parse(store.get('ttracker.places.v1')!)).toEqual([])
  })

  it('載入既有資料、過濾壞形狀', async () => {
    store.set('ttracker.places.v1', JSON.stringify([
      { id: 'a', name: '家', lat: 22.98, lng: 120.2 },
      { id: 'b', name: '壞', lat: 'x', lng: 120.2 },
      null,
    ]))
    const { places } = await import('./places.svelte')
    expect(places.list.map((p) => p.id)).toEqual(['a'])
  })

  it('壞 JSON 不炸', async () => {
    store.set('ttracker.places.v1', 'not json')
    const { places } = await import('./places.svelte')
    expect(places.list).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/lib/places.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

`src/lib/places.svelte.ts`：

```ts
const KEY = 'ttracker.places.v1'

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
}

function load(): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(v)) return []
    return v.filter(
      (p): p is Place =>
        p != null && typeof p.id === 'string' && typeof p.name === 'string' &&
        Number.isFinite(p.lat) && Number.isFinite(p.lng),
    )
  } catch {
    return []
  }
}

class Places {
  list = $state<Place[]>(load())

  add(name: string, lat: number, lng: number): Place {
    const place: Place = { id: crypto.randomUUID(), name, lat, lng }
    this.list = [...this.list, place]
    this.#persist()
    return place
  }

  remove(id: string): void {
    this.list = this.list.filter((p) => p.id !== id)
    this.#persist()
  }

  #persist(): void {
    localStorage.setItem(KEY, JSON.stringify(this.list))
  }
}

export const places = new Places()
```

`src/lib/geocode.ts`（依 spec：不做打真網路的單元測試）：

```ts
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
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run`
Expected: 全綠

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "feat: places store 與 Nominatim geocode"
```

---

### Task 3: 最愛卡片 🚮/♻️ 前綴

**Files:**
- Modify: `src/components/FavoriteCard.svelte`

**Interfaces:**
- Consumes: `nextArrivalHasRecycle`（Task 1）

- [ ] **Step 1: 修改 FavoriteCard**

script 區塊：import 行加 `nextArrivalHasRecycle`（來自 `../lib/schedule`），derived 區塊加：

```ts
const nextRecycle = $derived(nextArrivalHasRecycle(point, now))
```

markup 的 countdown 段落改為（兩個分支都加前綴 icon；`nextRecycle` 為 null 時不會走到這裡，因為 arrival 也是 null）：

```svelte
  {#if arrival && mins != null}
    <p class="countdown">
      <span class="runicon" title={nextRecycle ? '這班有回收' : '這班只收垃圾'}>{nextRecycle ? '♻️' : '🚮'}</span>
      {#if isToday}
        <strong>{point.time}</strong>
        <span class="mins">剩 {mins >= 60 ? `${Math.floor(mins / 60)} 小時 ${mins % 60}` : mins} 分</span>
      {:else}
        下次：週{DAY_NAMES[((arrival.getDay() + 6) % 7) + 1]} {point.time}
      {/if}
    </p>
  {:else}
    <p class="countdown muted">無固定班次資料</p>
  {/if}
```

`src/app.css` 的 `.countdown` 區塊附近加：

```css
.countdown .runicon { font-size: 1.2rem; }
```

- [ ] **Step 2: 驗證**

Run: `npx vitest run && npm run build && npm run check`
Expected: 全綠、0 errors

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: 最愛卡片以 🚮/♻️ 標記下一班是否有回收"
```

---

### Task 4: 地圖——地點圖層、新增流程、臨近面板

**Files:**
- Modify: `src/views/MapView.svelte`、`src/app.css`
- Create: `src/components/PlacePanel.svelte`、`src/components/AddPlacePanel.svelte`

**Interfaces:**
- Consumes: `places`（Task 2）、`geocode`（Task 2）、`nearbyStops`（Task 1）、`nextArrival`/`nextArrivalHasRecycle`（schedule）、`allPoints`（points.ts）、`favorites`
- Produces: 無下游依賴（終端 UI）。

**UI 實作前先用 Skill tool 載入 `impeccable` skill**，依其指引把面板的層級、間距、觸控與微互動做好；視覺語言沿用 app.css 既有 tokens。

- [ ] **Step 1: 實作 `PlacePanel.svelte`（底部面板：臨近站點列表）**

```svelte
<script lang="ts">
  import type { Place } from '../lib/places.svelte'
  import { places } from '../lib/places.svelte'
  import { favorites } from '../lib/favorites.svelte'
  import { nearbyStops } from '../lib/nearby'
  import { allPoints } from '../lib/points'
  import { nextArrival, nextArrivalHasRecycle } from '../lib/schedule'
  import type { CollectionPoint } from '../lib/types'

  let { place, onFocus, onClose }: {
    place: Place
    onFocus: (point: CollectionPoint) => void
    onClose: () => void
  } = $props()

  const now = new Date()
  const stops = $derived(nearbyStops(allPoints, place.lat, place.lng))

  function timeLabel(p: CollectionPoint): string {
    const at = nextArrival(p.time, p.workDays, now)
    if (!at) return '無班次'
    const DAY = ['日', '一', '二', '三', '四', '五', '六']
    const sameDay = at.getDate() === now.getDate()
    return sameDay ? `今天 ${p.time}` : `週${DAY[at.getDay()]} ${p.time}`
  }

  function removePlace(): void {
    places.remove(place.id)
    onClose()
  }
</script>

<div class="sheet">
  <header class="sheet-head">
    <h3>🏠 {place.name}</h3>
    <div class="sheet-actions">
      <button class="ghost" onclick={removePlace}>刪除地點</button>
      <button class="ghost" onclick={onClose} aria-label="關閉">✕</button>
    </div>
  </header>
  {#if stops.length === 0}
    <p class="muted sheet-empty">500 公尺內沒有清運點</p>
  {:else}
    <ul class="stoplist">
      {#each stops as s (s.point.id)}
        <li>
          <button class="stop-main" onclick={() => onFocus(s.point)}>
            <span class="runicon">{nextArrivalHasRecycle(s.point, now) ? '♻️' : '🚮'}</span>
            <span class="stop-name">{s.point.name}</span>
            <span class="muted">{timeLabel(s.point)} · {Math.round(s.distanceM)}m</span>
          </button>
          <button class="fav" class:on={favorites.has(s.point.id)} onclick={() => favorites.toggle(s.point.id)}>
            {favorites.has(s.point.id) ? '★' : '☆'}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

- [ ] **Step 2: 實作 `AddPlacePanel.svelte`（新增地點面板）**

```svelte
<script lang="ts">
  import { geocode } from '../lib/geocode'

  let { onLocate, onSave, onCancel }: {
    onLocate: (lat: number, lng: number) => void
    onSave: (name: string) => void
    onCancel: () => void
  } = $props()

  let name = $state('')
  let query = $state('')
  let searching = $state(false)
  let hint = $state('輸入路名或地標搜尋，或直接拖曳地圖上的 📍')

  async function search(): Promise<void> {
    if (!query.trim() || searching) return
    searching = true
    const results = await geocode(query.trim())
    searching = false
    if (results.length === 0) {
      hint = '找不到，換路名或地標試試，或直接拖曳 📍 定位'
    } else {
      hint = `已定位：${results[0].name.split(',')[0]}——可拖曳 📍 微調`
      onLocate(results[0].lat, results[0].lng)
    }
  }
</script>

<div class="sheet">
  <header class="sheet-head">
    <h3>＋ 新增地點</h3>
    <button class="ghost" onclick={onCancel} aria-label="取消">✕</button>
  </header>
  <div class="addform">
    <input placeholder="名稱（如：家、公司）" bind:value={name} />
    <div class="searchrow">
      <input placeholder="路名或地標" bind:value={query} onkeydown={(e) => e.key === 'Enter' && search()} />
      <button class="refresh" onclick={search} disabled={searching}>{searching ? '搜尋中…' : '搜尋'}</button>
    </div>
    <p class="muted hint">{hint}</p>
    <button class="primary" disabled={!name.trim()} onclick={() => onSave(name.trim())}>儲存地點</button>
  </div>
</div>
```

- [ ] **Step 3: MapView 整合**

`src/views/MapView.svelte` 修改（在既有內容上疊加；保留 favorites/路線/車輛既有邏輯）：

script 新增：

```ts
import { places, type Place } from '../lib/places.svelte'
import { nearbyStops } from '../lib/nearby'
import { allPoints } from '../lib/points'
import PlacePanel from '../components/PlacePanel.svelte'
import AddPlacePanel from '../components/AddPlacePanel.svelte'
import type { CollectionPoint } from '../lib/types'

let selectedPlace = $state<Place | null>(null)
let adding = $state(false)
let placesLayer = L.layerGroup()
let highlightLayer = L.layerGroup()
let draftMarker: L.Marker | null = null

const homeIcon = L.divIcon({ className: 'place-icon', html: '🏠', iconSize: [28, 28] })
const draftIcon = L.divIcon({ className: 'place-icon', html: '📍', iconSize: [32, 32] })

function redrawPlaces(): void {
  placesLayer.clearLayers()
  for (const p of places.list) {
    L.circle([p.lat, p.lng], { radius: 500, color: '#ffc53d', weight: 1, fillOpacity: 0.05 }).addTo(placesLayer)
    L.marker([p.lat, p.lng], { icon: homeIcon })
      .on('click', () => { selectedPlace = p; adding = false })
      .addTo(placesLayer)
  }
}

function startAdding(): void {
  adding = true
  selectedPlace = null
  if (!draftMarker) {
    draftMarker = L.marker(map.getCenter(), { icon: draftIcon, draggable: true }).addTo(map)
  } else {
    draftMarker.setLatLng(map.getCenter())
  }
}

function locateDraft(lat: number, lng: number): void {
  draftMarker?.setLatLng([lat, lng])
  map.setView([lat, lng], 16)
}

function savePlace(name: string): void {
  if (!draftMarker) return
  const { lat, lng } = draftMarker.getLatLng()
  selectedPlace = places.add(name, lat, lng)
  stopAdding()
}

function stopAdding(): void {
  adding = false
  draftMarker?.remove()
  draftMarker = null
}

function focusStop(point: CollectionPoint): void {
  map.setView([point.lat, point.lng], 17)
}
```

onMount 內（tileLayer 之後）加：`placesLayer.addTo(map)`、`highlightLayer.addTo(map)`。

$effect 兩個：

```ts
$effect(() => {
  places.list // 追蹤
  redrawPlaces()
})

$effect(() => {
  highlightLayer.clearLayers()
  if (!selectedPlace) return
  for (const s of nearbyStops(allPoints, selectedPlace.lat, selectedPlace.lng)) {
    L.circleMarker([s.point.lat, s.point.lng], { radius: 5, color: '#ffc53d', weight: 2, fillOpacity: 0.6 })
      .bindPopup(`${s.point.name}`)
      .addTo(highlightLayer)
  }
})
```

markup（`<div class="map">` 之後）：

```svelte
<button class="addplace primary" onclick={startAdding}>＋ 地點</button>

{#if adding}
  <AddPlacePanel onLocate={locateDraft} onSave={savePlace} onCancel={stopAdding} />
{:else if selectedPlace}
  <PlacePanel place={selectedPlace} onFocus={focusStop} onClose={() => (selectedPlace = null)} />
{/if}
```

onMount 的 cleanup 保持 `map.remove()`（draftMarker 隨 map 一起清）。

- [ ] **Step 4: app.css 補面板樣式**

```css
/* ---- bottom sheet ---- */
.sheet {
  position: fixed;
  left: 0; right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom));
  max-height: 45vh;
  overflow-y: auto;
  background: var(--card);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px 16px 0 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  z-index: 1000; /* Leaflet 地圖層之上 */
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; }
.sheet-head h3 { margin: 0; font-size: 1rem; }
.sheet-actions { display: flex; gap: 4px; }
.ghost {
  min-height: 44px; padding: 6px 12px;
  border: none; background: transparent; color: var(--muted); font-size: 0.85rem;
}
.sheet-empty { padding: 16px 0; }
.stoplist { list-style: none; margin: 8px 0 0; padding: 0; }
.stoplist li { display: flex; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.stop-main {
  flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0;
  min-height: 44px; padding: 8px 0; border: none; background: transparent;
  color: var(--text); text-align: left; font-size: 0.9rem;
}
.stop-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stop-main .muted { flex: none; font-size: 0.78rem; }
.addplace { position: fixed; top: 12px; right: 12px; z-index: 1000; }
.addform { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.addform input {
  min-height: 44px; padding: 8px 12px; width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
  background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.95rem;
}
.searchrow { display: flex; gap: 8px; }
.searchrow input { flex: 1; }
.hint { margin: 0; font-size: 0.8rem; }
:global(.place-icon) { font-size: 24px; line-height: 1; background: none; border: none; }
```

（`.place-icon` 若放在 MapView 的 `<style>` 內需 `:global()`；放 app.css 則不用前綴。擇一，不重複。）

- [ ] **Step 5: 驗證**

Run: `npx vitest run && npm run build && npm run check`
Expected: 全綠、0 errors。

手動驗證（dev server）：＋地點 → 搜「成功大學」→ 地圖跳轉、📍 可拖 → 儲存 → 🏠＋500m 圈出現 → 點 🏠 → 面板列出臨近站點（🚮/♻️、距離、☆ 可按）→ 點列表項地圖聚焦。刪除地點 → 圖層消失。重整後地點仍在（localStorage）。

- [ ] **Step 6: Commit**

```bash
git add src && git commit -m "feat: 地圖地點圖層、新增流程與臨近站點面板"
```

---

### Task 5: 收尾——全驗證、合併、部署

**Files:**
- Modify: `README.md`（功能清單加「我的地點」一段：怎麼新增、門牌搜不到用拖曳、資料存本機）

- [ ] **Step 1: README 補充**

「功能」段落加：

```markdown
### 我的地點

地圖頁右上「＋ 地點」可儲存住家、公司等常用地點：輸入路名或地標搜尋（門牌號碼搜不到——定位後拖曳 📍 微調即可），儲存後地圖顯示 500m 範圍圈；點 🏠 可看圈內最近 10 個清運點（含下一班時刻與 🚮/♻️ 回收標記）並一鍵加最愛。地點只存在你的裝置（localStorage）。地址搜尋由 [Nominatim](https://nominatim.org/)（OpenStreetMap）提供。
```

- [ ] **Step 2: 全驗證**

Run: `npx vitest run && npm run build && npm run check`
Expected: 全綠。

- [ ] **Step 3: 合併、推送、部署**

```bash
git add README.md && git commit -m "docs: README 補我的地點功能說明"
git checkout main && git merge <feature-branch> --no-ff -m "Merge: 我的地點＋臨近站點"
git push origin main
npm run build && npx wrangler pages deploy dist --project-name ttracker --branch main --commit-dirty=true
```

- [ ] **Step 4: 線上驗證**

`curl -s https://ttracker.pages.dev/ | grep -o '<title>[^<]*</title>'` → `台南垃圾車`；手機實測新增地點流程。

---

## 驗收清單（對照 spec）

- [ ] 新增地點：搜尋跳轉＋拖曳微調＋儲存；搜尋失敗有提示且拖曳仍可完成
- [ ] 地圖：🏠＋500m 圈；選取地點時圈內站點高亮（circleMarker，未選取不畫）
- [ ] 臨近面板：最近 10 站、站名/下一班/距離/🚮♻️/☆；點項目聚焦
- [ ] 最愛卡片下次收運行有 🚮/♻️ 前綴
- [ ] 刪除地點；localStorage 持久化；壞資料不炸
- [ ] 全部測試綠、build/check 綠、已部署
