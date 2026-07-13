# 我的地點＋臨近站點 設計規格

日期：2026-07-13
狀態：已核准（brainstorming 完成）
前置：v1 已上線（https://ttracker.pages.dev），本功能疊加於現有架構之上。

## 目的

使用者可儲存多個具名地點（住家、公司…），在地圖上一眼看到每個地點臨近的清運站點，並快速把合適的站點加入最愛。

## 需求

1. 新增地點：輸入名稱＋地址/地標搜尋定位，地圖上拖曳 marker 微調後儲存。
2. 地圖顯示：每個地點 🏠 marker＋500m 半徑圈；點選某地點時，其圈內站點以 accent 色 `circleMarker`（radius 5）顯示，未選取時不畫（避免 14k 點全上地圖）。
3. 點地點 marker → 最近 10 站列表：站名、下一班時刻、距離、🚮/♻️ 標記、☆ 一鍵加最愛；點列表項聚焦該站。
4. 🚮/♻️ 規則：站點「下一班」當天是回收日 → ♻️，否則 🚮。主畫面最愛卡片的「下次收運」行套用同一規則（今日回收標記維持不變）。
5. 刪除地點：地點 popup 內提供刪除。改名不做（刪掉重加）。

## 已實測驗證的事實

- Nominatim（`nominatim.openstreetmap.org/search`）有 `access-control-allow-origin: *`，瀏覽器可直打，零 key。
- 台南的**路名、地標、車站**定位準確；**門牌號碼查不到**（回空陣列）→ 流程必須以「搜尋跳轉＋拖曳微調」為主，UI 提示輸入「路名或地標」。
- 用量政策：≤1 req/s、需 User-Agent 識別 → 按鈕觸發搜尋（不做輸入即搜的 autocomplete）。

## 架構

新增三個單元，其餘為既有元件的小幅修改：

| 單元 | 責任 | 介面 |
|---|---|---|
| `src/lib/places.svelte.ts` | 地點 CRUD＋localStorage 持久化（比照 favorites 模式） | `places.list: Place[]`（$state）、`add(name, lat, lng)`、`remove(id)`；key `ttracker.places.v1`；`Place = { id: string; name: string; lat: number; lng: number }`，id 用 `crypto.randomUUID()` |
| `src/lib/geocode.ts` | Nominatim 查詢 | `geocode(q: string): Promise<GeocodeResult[]>`；`GeocodeResult = { name: string; lat: number; lng: number }`；參數 `format=jsonv2&countrycodes=tw&limit=5&viewbox=119.9,23.5,120.7,22.7&bounded=1`；header `User-Agent` 不可設於瀏覽器 fetch（forbidden header）→ 靠預設 UA＋Referer 即可；錯誤/空結果擲回空陣列不拋 |
| `src/lib/nearby.ts` | 臨近站點計算（純函式） | `nearbyStops(lat, lng, limit = 10, radiusM = 500): NearbyStop[]`；`NearbyStop = { point: CollectionPoint; distanceM: number }`；依距離排序；回傳圈內的最多 limit 點，**圈內不足 limit 時只回圈內的**（不硬湊） |

修改：

- `MapView.svelte`：places layer（🏠 divIcon marker＋`L.circle` 500m）、地點 popup（最近 10 站列表）、站點高亮與聚焦、「＋ 地點」新增流程（名稱輸入＋搜尋框＋可拖 marker＋儲存/取消）、popup 內刪除。
- `FavoriteCard.svelte`：「下次收運」行前綴 🚮/♻️（依下一班當天是否回收日）。
- 新增共用純函式 `nextArrivalHasRecycle(point, now): boolean | null`（放 `src/lib/schedule.ts`：取 `nextArrival` 的日期，判斷 `recycleDays` 是否含該日；無下一班 → null）。

## 資料流

新增地點：輸入名稱＋query → `geocode()` → 取第一筆結果 `setView`＋放可拖 marker（搜不到 → 提示「找不到，換路名或地標試試，或直接拖地圖選點」，marker 放地圖中心）→ 拖曳 → 儲存 → `places.add()` → 地圖重繪 places layer。

臨近列表：點 🏠 marker → `nearbyStops(place.lat, place.lng)` → popup 渲染列表（站名、`nextArrival` 時刻、`Math.round(distanceM)`m、🚮/♻️、☆ toggle `favorites`）→ 點列表項 → `map.setView` 至該站並開站點 popup。

## 錯誤處理

- Nominatim 逾時（10s）/HTTP 錯誤/空結果 → 統一以空陣列處理，UI 顯示上述提示；新增流程永遠可用拖曳完成，外部服務死掉不擋路。
- localStorage 壞資料 → 比照 favorites：fallback 空陣列。

## 測試

- Vitest：`nearbyStops`（排序、radius 過濾、limit、圈內不足）、`nextArrivalHasRecycle`（回收日/非回收日/無班次 null）、`places` store（add/remove/持久化/壞資料）。
- `geocode.ts`：不做打真網路的單元測試；解析邏輯薄到以型別涵蓋，實機驗證。
- 地圖 UI：手動驗證（比照 v1 慣例）。

## 不做（YAGNI）

- 地點改名、地點排序、地點數量上限
- autocomplete 即時搜尋
- 門牌級 geocoding（外部服務能力不及，以拖曳補）
