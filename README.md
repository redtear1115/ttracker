# 台南垃圾車

查詢臺南市垃圾車清運點時刻與即時車輛位置的離線可用 PWA：把常去的清運點加入最愛，主畫面直接看「下一班還有多久」，並在地圖上追蹤即時車位。

## 功能

- 最愛清運點倒數卡片：下一班倒數（今天／跨日／跨週）、今日回收標記、即時車輛「還差 N 站」
- 逐層瀏覽（區 → 路線 → 點）＋ 附近搜尋 ＋ 關鍵字搜尋，★ 即時同步
- 地圖顯示最愛、路線點與即時車位
- 可安裝為 PWA；離線時 App shell 與時刻表仍可用（即時 GPS 區塊會優雅降級為「暫不可用」）

## 資料來源與授權

- **清運點時刻資料**：臺南市政府資料開放平台「臺南市垃圾清運點資料」
  （<https://data.tainan.gov.tw/>，資源 ID `84df8cd6-8741-41ed-919c-5105a28ecd6d`）
- **即時車輛位置**：臺南市環保局垃圾清運即時查詢系統（`clean.tnepb.gov.tw`）
- 以上政府開放資料依「[政府資料開放授權條款](https://data.gov.tw/license)」（第 1 版）釋出使用。

本專案僅為便民查詢工具，非官方服務；一切以官方公告為準。

## 開發

```bash
npm install
npm run dev      # 本機開發（含 GPS 上游代理）
npm test         # 執行測試（vitest run）
npm run build    # 產出 dist/（含 PWA manifest 與 service worker）
npm run preview  # 預覽 build 結果
```

## 更新清運點資料

清運點時刻表變動不頻繁，資料以靜態 JSON 內嵌打包。上游若有調整（通常幾個月一次即可），重新抓取：

```bash
npm run fetch-points   # 下載上游資料（約 28MB），清洗後寫入 data/points.json
```

腳本會過濾缺座標／超界座標的點位，並在筆數異常時中止以防上游改版造成髒資料。跑完重新 `npm run build` 部署即可。

## 部署（Cloudflare Pages）

```bash
npm run build
npx wrangler pages deploy dist
```

`functions/api/gps.ts` 為 Cloudflare Pages Functions，部署後 `/api/gps` 端點自動生效（正式環境由 Function 代打上游，解決瀏覽器無法設定 Referer 的限制）。無需額外設定 Functions 目錄，Pages 會自動偵測 `functions/`。

## 已知限制

- **假日／彈性停收不反映**：時刻表僅依上游每週固定班表計算，國定假日、颱風或臨時停收不會反映在倒數中。
- **ETA 僅供參考**：車輛「還差 N 站」與到站時間以官方時刻表與即時車位推估，實際到站時間以官方為準。
- **離線範圍**：離線時 App shell 與時刻表可用，但即時 GPS 需連線；地圖圖磚僅快取曾瀏覽過的區域。
