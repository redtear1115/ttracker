# 停車場即時查詢——設計規格

日期：2026-07-13
狀態：已與使用者確認

## 目標與情境

在 ttracker 加入台南市路外停車場即時剩餘車位查詢。主要情境是「到陣地前找車位」：人在路上，想看目的地附近哪個停車場還有位。地圖優先，只顯示**汽車**格位。放在底部第四個分頁「停車」。

## 資料來源（已實測驗證）

- **上游**：`https://soa.tainan.gov.tw/Api/Service/Get/91073f40-d251-42cc-9f4c-88e8937c9911`
  - 回應 `application/json`，約 133KB，形狀 `{ contentType, isImage, size, data: [...] }`，`data` 為 260 筆停車場
  - **無 CORS header**，瀏覽器不能直讀，必須經自家代理
  - 備援：同 resource 的頁面內嵌版 `https://data.tainan.gov.tw/Resource/91073f40-d251-42cc-9f4c-88e8937c9911?handler=GoJson`（1.1MB HTML，需用 extractJsonArray 解，僅當 SOA 掛掉時考慮）
- **欄位陷阱（實測 2026-07-13）**：
  - `lnglat` 名稱寫 lnglat，實際順序是 **`lat,lng`**（半形逗號）：`"22.991501,120.195621"`
  - 剩餘格位可能為 **`-1`＝無感應器**（研究筆記；本次樣本 0 筆，仍需防禦）
  - `car_total` 可能為 0（該場無汽車位或無資料）
  - 資料集頁 metadata「最後更新 2025-12-24」**不可信**；實測 `update_time` 為逐場時間戳，130 種值、最新距抓取僅數分鐘，資料是活的
  - 上游無 rate limit 防護，節流責任在我方（60 秒 cache）

## 架構（方案 A：Edge 瘦身代理）

```
瀏覽器 ──/api/parking──▶ Pages Function ──fetch──▶ soa.tainan.gov.tw
   ▲                        │ 解析＋瘦身＋驗證
   └── ~30KB 乾淨 JSON ◀────┘ edge cache 60s（caches.default + s-maxage=60）
```

- `functions/api/parking.ts`：抓 SOA JSON → 瘦身 → cache。上游失敗回 `502 {"error":"upstream"}`（比照 `gps.ts`）。
- dev 環境：`vite.config.ts` 加 `/api/parking` middleware（比照 `gpsDevProxy`），共用同一個解析模組。
- 解析／正規化邏輯放 `src/lib/parking.ts`（純函式），function、dev proxy、測試三方共用。

## 資料層規則

瘦身後每筆：`{ id, name, zone, address, car, carTotal, updateTime, lat, lng, fee }`

- `lnglat` 按 `lat,lng` 順序 split；座標超出台南範圍（lat 22.7–23.5、lng 119.9–120.7，比照 points 清洗）→ 剔除該筆
- `car < 0` → 正規化為 `null`（無感應器）
- `carTotal <= 0` → `carTotal: null`（該場無汽車位資料）
- `fee` 取 `chargeFee`，空字串 → `null`
- 回應附 `fetchedAt`（function 抓取時間），供前端算資料年齡

## UI

- **分頁**：底部 tabbar 第四項「停車」，圖標用 Lucide `circle-parking`（若無則 `square-parking`），active 色照 DESIGN.md 用 teal
- **ParkingView**：自有 Leaflet 地圖（沿用 MapView 初始化模式與圖磚）。預設中心：有 GPS 用使用者位置，否則台南市中心
- **標記**：圓 chip 帶剩餘數字（divIcon）：
  - 有位（car ≥ 1）：深 teal 底（#2e7688）白字，數字即剩餘數
  - 滿（car === 0 且 carTotal 有值）：danger 深紅底白字「滿」
  - 無資料（car === null 或 carTotal === null）：muted 灰底「—」
- **詳情面板**（點標記，沿用 PlacePanel 版式）：名稱、區＋地址、「剩餘 N／共 M」、相對更新時間（「3 分鐘前」；`update_time` 距今 >30 分鐘加註「資料可能過時」）、收費方式（有才顯示）
- **輪詢**：分頁可見時每 60 秒重抓（與 cache TTL 對齊），切走即停
- **顏色紀律**：停車與垃圾車無關——只用 teal／danger／muted。**不得使用 truck-green**（One-Truck Rule）。地圖 chip 用色階深端（淺色地圖磚規則）

## 錯誤與離線

- 上游失敗／離線：保留記憶體中上次成功資料並顯示「即時車位暫不可用」橫幅；完全無資料時 empty state 說明
- 不顯示無憑據的數字（「誠實的資料」原則）

## 測試

- `parking.test.ts`：lnglat 順序與超界剔除、`-1`→null、`carTotal 0`→null、空 `chargeFee`→null、瘦身欄位完整性
- 顯示規則（滿／無資料／過時標記）以純函式測試
- function 主體薄到只剩 fetch＋cache，不另測

## 不做（YAGNI）

- 機車／身障／婦幼／綠能格位（未來要加時欄位都在）
- 停車場最愛、通知、歷史趨勢
- 清單檢視（情境是地圖找位；要再說）
- Service worker 快取停車資料（即時性資料離線無意義，離線走「暫不可用」）
