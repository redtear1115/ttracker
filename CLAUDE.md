# ttracker

台南垃圾車追蹤 PWA（Svelte 5 + Vite + Cloudflare Pages）。開發指令與資料來源見 README.md。

## Design Context

動 UI 之前先讀這兩份，它們是規範性文件：

- **PRODUCT.md** — 策略層：register `product`、platform `web`、使用者（本人＋家人朋友）、定位（最愛站點的即時倒數）、四條設計原則（三秒一眼／誠實的資料／為第一次打開的家人設計／工具的骨架，生活的溫度）。
- **DESIGN.md** — 視覺層：Three-Bureau Palette 日夜雙主題（跟隨 `prefers-color-scheme`，tokens 在 `src/app.css` 的 `:root` 與 light 覆寫塊）。互動一律 teal（夜 `#5fc4d4`／日 `#1e7286`）；垃圾車綠（夜 `#55d073`／日 `#20713c`）是保留字，只用於「車」的訊號——One-Truck Rule（台南垃圾車是全台唯一的綠色，不要用黃色垃圾車意象）。圖標只用 Lucide 內嵌 SVG，不用 emoji（No-Emoji Rule）。字級層級、元件規格與 Do/Don't 詳見文件；frontmatter tokens 為準，`.impeccable/design.json` 為機器可讀 sidecar。
