# ttracker — 台南垃圾車追蹤 PWA 設計規格

日期：2026-07-13
狀態：已核准（brainstorming 完成，使用者授權自主執行後續實作）

## 目的

給自己（與家人）用的台南市垃圾車查詢 PWA。官方「台南垃圾車」App 功能類似但體驗不佳；本專案目標是更快、更精簡、免安裝的替代品，只做真正需要的功能。

使用情境：倒垃圾前打開 app，一眼看到最愛清運點「還剩幾分鐘、車在哪、今天有沒有回收」。前景即時查看即可，**不做**背景推播提醒。

## 範圍

- 只支援台南市。
- 純自用，無帳號系統、無多使用者考量。
- 前景輪詢即時資訊；無推播、無背景監控。

## 資料源（已實測驗證）

| 資料 | 來源 | 取用方式 |
|---|---|---|
| 清運點靜態資料 | 臺南市政府資料開放平台「臺南市垃圾清運點資料」（resource id `84df8cd6-8741-41ed-919c-5105a28ecd6d`） | build 時打包，手動腳本更新 |
| 垃圾車 GPS 即時位置 | 同平台「臺南市垃圾車GPS資料」；官方查詢系統 clean.tnepb.gov.tw 使用同源資料 | Cloudflare Worker 代理，前端輪詢 |

清運點欄位：AREA（行政區）、ROUTEID（清運路線編號）、ROUTEORDER（清運次序）、VILLAGE（里別）、POINTNAME（清運點名稱）、TIME（清運時間）、LONGITUDE/LATITUDE（座標）、WORDDAY（收運日，如「一、二、四、六」）、RECYCLEDAY（資源回收日）。全市約 3,000+ 點。

GPS 欄位：AREA、ROUTENAME、CARNO（車號）、GPSTIME（回傳時間）、LONGITUDE/LATITUDE。

**已驗證的限制：**

- 政府 API 回應**無 CORS header**，瀏覽器不能直接抽 → 靜態資料 build 時打包、即時資料走 Worker 代理。
- 平台改版過，`?handler=GoJson` 下載端點回傳的 JSON 是 HTML-escaped 嵌在頁面裡；更新腳本需處理 unescape，或實作時另找乾淨的 raw 端點。
- **GPS 資料集在新版平台的確切端點尚未確認**（資料集確定存在）。這是實作計畫的第一個任務；若開放端點不可得，fallback 為 Worker 改抽官方查詢系統的同源資料。
- 國定假日停收公告不在開放資料內，app 不處理（明列為已知限制）。

## 架構

```
ttracker/
├── src/              Svelte 5 + Vite + TypeScript PWA 前端
├── worker/           Cloudflare Worker：GPS 代理（~30 行，10 秒快取）
├── scripts/          fetch-points.ts：抓清運點資料 → 正規化 → data/points.json
├── data/points.json  打包進 app 的靜態清運點資料（進版控）
└── docs/             規格與計畫
```

- 部署 Cloudflare Pages；Worker 掛同專案 `/api/gps` 路由 → 前端同源請求，零 CORS 問題。
- Worker 對上游加 10 秒快取（`caches.default` 或記憶體 TTL），多裝置同開也只有極少量上游請求。
- 技術選型：Svelte 5、Vite、TypeScript、vite-plugin-pwa、Leaflet + OpenStreetMap、Vitest。最愛存 localStorage。

## 資料層設計

### points.json（正規化後）

```ts
interface CollectionPoint {
  id: string;          // 穩定 id：`${routeId}-${routeOrder}`
  area: string;        // 行政區
  routeId: string;
  routeOrder: number;
  village: string;
  name: string;        // 清運點名稱
  time: string;        // "HH:mm" 清運時間
  lat: number;
  lng: number;
  workDays: number[];  // [1,2,4,6]，週一=1…週日=7；腳本內解析「一、二、四、六」
  recycleDays: number[];
}
```

字串→數字的星期解析只在 `fetch-points.ts` 做一次；app 執行期不碰原始字串格式。

### GPS 輪詢

- app 前景時每 15 秒 GET `/api/gps`；`visibilitychange` 切背景即暫停，回前景立即刷新。
- `GPSTIME` 距今超過 10 分鐘 → 該車視為「未發車／離線」，不顯示為即時。

### 最愛

localStorage 存 `favoriteIds: string[]`。無同步、無帳號。

## 核心邏輯（單元測試重點）

### 下一班倒數

輸入：清運點 `time` + `workDays` + 現在時間。輸出：下次收運的 datetime 與倒數分鐘。

- 今天是收運日且班次未過 → 今天該時刻。
- 今天班次已過或今天不收 → 找下一個收運日的該時刻（可能跨週）。
- 今天是否回收日 → `recycleDays.includes(today)` 亮 ♻️ 標記。
- 日期數學全部進 Vitest：跨日、跨週、當下正好等於班次時刻、workDays 為空等 edge case。

### 車輛即時狀態

- 以最愛點的 `routeId` 從 GPS feed 找同路線車輛。
- 車輛位置 → 對該路線所有清運點算最近點 → 取其 `routeOrder`，與最愛點的 `routeOrder` 相比 → 顯示「還差 N 站」／「已過站」。
- **倒數以官方時刻表為準**；車輛位置是輔助訊號。第一版不做 ETA 預測——誠實顯示優於假精準。

## UI

### 主畫面：最愛倒數列表

- 每個最愛一張卡片：點名稱、下次收運時刻與倒數分鐘、即時車輛狀態（差 N 站／移動中／未發車）、今日回收標記。
- 無最愛時顯示引導（去搜尋或看地圖）。
- 下拉刷新。

### 加最愛／搜尋

- 階層瀏覽：行政區 → 路線 → 清運點。
- 「附近的點」：geolocation 一鍵列出最近的清運點。

### 地圖頁（第二層）

- Leaflet + OSM tiles：顯示清運點與即時車輛位置；從卡片點入可聚焦該點與該路線的車。

### PWA

- vite-plugin-pwa：manifest、service worker、可加入主畫面。
- 離線：靜態時刻表與倒數照常可用；即時區塊顯示「暫不可用」。

## 錯誤處理

- `/api/gps` 失敗或上游改版 → 即時區塊整體降級為純時刻表模式，附一行狀態說明。app 核心（倒數）永遠可用。
- 政府清運點資料格式變動 → 只影響 `fetch-points.ts`，腳本內做欄位驗證，異常時報錯不產出壞資料。

## 測試策略

- **Vitest 單元測試**：下一班計算、星期解析、車輛對站（routeOrder 比較）、GPSTIME 過期判斷。
- Worker：本地以 wrangler dev 驗證代理與快取行為。
- UI 以手動驗證為主（自用工具，不做 E2E）。

## 已知限制（明列，不解）

- 國定假日、颱風假停收不會反映。
- 清運點資料更新靠手動跑腳本。
- ETA 只反映官方時刻表，車輛延誤時倒數不會自動修正（但看得到車的即時位置自行判斷）。
