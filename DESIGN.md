---
name: ttracker
description: 台南垃圾車即時追蹤 PWA——傍晚等車時看一眼就知道還剩幾分鐘
colors:
  night-bg: "#0d1418"
  night-surface: "#172228"
  ink: "#e8edf2"
  ink-muted: "#9aa7b0"
  bureau-teal: "#5fc4d4"
  bureau-teal-deep: "#2e7688"
  teal-ink: "#062026"
  truck-green: "#55d073"
  truck-green-deep: "#33a457"
  green-ink: "#0d2a16"
  danger-red: "#ff6b6e"
  day-bg: "#eef4f5"
  day-surface: "#ffffff"
  day-ink: "#16262e"
  day-ink-muted: "#52646e"
  day-teal: "#1e7286"
  day-truck: "#20713c"
  day-danger: "#b3372e"
typography:
  display:
    fontFamily: "'Noto Sans TC', system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "'Noto Sans TC', system-ui, -apple-system, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Noto Sans TC', system-ui, -apple-system, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Noto Sans TC', system-ui, -apple-system, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.bureau-teal}"
    textColor: "{colors.teal-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#79d2e0"
    textColor: "{colors.teal-ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "#ffffff0f"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.bureau-teal}"
---

# Design System: ttracker

## 1. Overview

**Creative North Star: 「路燈下的環保局」**

ttracker 是在人行道上、天色暗下來之後被打開的 app：手裡提著垃圾袋、耳朵聽著遠處有沒有〈少女的祈禱〉。整個視覺系統為這個場景服務——深色底、超大倒數數字、單手可及的底部分頁列，一眼掃過就能得到「還剩幾分鐘」的答案，然後把手機收回口袋。

配色向台南、台北、高雄三個環保局官網取經。三站雖然各自設計，卻共享同一個機構色：色相約 200° 的藍綠色（台南 `#2e7688`、台北 `#029996`、高雄 `#0b7f8e`）——那是台灣「環保局」的公務信任色。ttracker 把這個 teal 帶進夜間場景：背景與表層都往 teal 微微調色，所有互動元素（按鈕、連結、當前分頁、焦點框）由提亮後的 bureau-teal 承擔。而「車」的訊號色來自實車：台南是全台唯一把垃圾車塗成綠色的縣市（2009 年起，取環保與再生的象徵），truck-green `#55d073` 就是那台車的夜間提亮版——它不是裝飾色，它就是車。

本系統明確拒絕：把官網的白底公告版式照搬進工具型 PWA、SaaS 儀表板的 hero-metric 排版、以及任何會拖慢「看一眼就走」的裝飾動效。

**Key Characteristics:**
- 日夜雙主題，跟隨系統深淡色：夜間是「路燈下的環保局」，日間是官網的白晝公務色
- 機構 teal 承擔全部互動語彙；台南垃圾車綠是保留字
- 倒數數字是每個畫面的主角，其他一切退後
- 觸控目標一律 ≥44px，底部操作區避開 safe-area

## 2. Colors: The Three-Bureau Palette

三個環保局的公務色，日間照官網的白晝樣貌，夜間換到台南傍晚的路燈下。以下以夜間版為基準描述角色；日間對應值見 Day Variant。

### Primary
- **Bureau Teal / 環保局青** (#5fc4d4): 三局共享色相的提亮版，深色底上的互動主色——主要按鈕底色、當前分頁、連結、焦點框、選中狀態。對 night-bg 對比 9.1:1。
- **Bureau Teal Deep / 台南官網青** (#2e7688): 台南環保局官網的原始主色，作為色相錨點；用於按下狀態（pressed）、teal 系的邊框微調，以及淺色地圖磚上的資訊標記。不做文字色。
- **Teal Ink** (#062026): 落在 bureau-teal 底上的文字專用墨色（對比 8.3:1）。禁止在 teal 底上用灰字。

### Secondary
- **Truck Green / 台南垃圾車綠** (#55d073): 車體本色的夜間提亮版——台南垃圾車是全台唯一的綠色（基隆藍、多數縣市黃）。只出現在與「車」直接相關的位置：倒數分鐘數、即將到站卡片的描邊、最愛站點的星號、資源回收日徽章（16% 透明度同色底＋同色字——回收日說的也是那台車收什麼）。對 night-bg 對比 9.4:1；green-ink (#0d2a16) 是它在實色底上唯一合法的前景色。深一階的 truck-green-deep (#33a457) 專供淺色地圖磚上的車站標記——亮色版留給深色 UI。

### Tertiary
- **Danger Red** (#ff6b6e): 錯誤與停收警示，本系統唯一的暖色，源自高雄站警示紅 (#d23024) 的夜間提亮版。

### Neutral
- **Night BG / 夜幕** (#0d1418): 頁面底色，往 teal 色相微調的近黑，不是純黑。
- **Night Surface / 路燈下的卡片** (#172228): 卡片、分頁列、輸入框底色，比夜幕亮一階的同色相層。
- **Ink** (#e8edf2): 主要文字（對比 15.8:1）。
- **Ink Muted** (#9aa7b0): 次要文字——狀態列、站點區域、輔助說明（對 surface 6.6:1，安全通過 4.5:1）。
- **Hairline**: 分隔線與描邊一律用前景色透明度（夜間白 0.08–0.12、日間黑 0.08–0.14），不引入新灰階。

### Day Variant（跟隨系統深淡色）
日間版是三個環保局官網的白晝公務色，角色一對一對應、語意規則完全相同：day-bg (#eef4f5，teal 微調近白) / day-surface (#ffffff) / day-ink (#16262e) / day-ink-muted (#52646e) / day-teal (#1e7286，台南官網日間 teal，配白字) / day-truck (#20713c，綠家族深端) / day-danger (#b3372e)。全部組合已驗證 ≥4.96:1。切換由 `prefers-color-scheme` 決定，不做手動 toggle——手機自己知道現在是白天還是晚上。

### Named Rules
**The One-Truck Rule.** 台南垃圾車綠只在「指涉那台車」時出現：倒數數字、即將到站的卡片光圈、標記站點的星、回收日徽章。按鈕、分頁、連結永遠是 teal。綠色一旦出現在畫面上，意思只有一個——跟車有關，而且多半是車要來了。

**The Three-Bureau Rule.** 所有互動 affordance 共用同一個 teal（色相 ~200°），不得為不同元件另配藍、紫或其他冷色。truck-green（色相 ~140°）永遠不做互動色——teal 是「你可以按」，綠是「車的訊號」，兩者不得互換。

## 3. Typography

**Display Font:** Noto Sans TC（fallback: system-ui, -apple-system, sans-serif）
**Body Font:** 同上——單一家族，多權重
**Label/Mono Font:** 無獨立家族；倒數數字使用 `font-variant-numeric: tabular-nums` 避免跳動

**Character:** 一個字族撐起全部——工具型 UI 不需要展示字體。層級靠權重（400/600/700）與字級差拉開，比例緊湊（約 1.15），資訊密度優先。

### Hierarchy
- **Display**（700, 2rem, lh 1.1, letter-spacing 0.02em）: 倒數分鐘數專用。它是整個 app 的主角，不得用於其他標題。
- **Headline**（600, 1.1rem, lh 1.3）: 卡片標題（站點名稱）。
- **Body**（400, 0.95rem, lh 1.5）: 一般內文、清單項、輸入框文字。
- **Label**（400, 0.8rem, lh 1.4）: 狀態列、站點區域、徽章（0.75rem）等輔助文字，一律配 ink-muted 或語意色。

### Named Rules
**The Tabular Countdown Rule.** 倒數數字必須等寬（tabular-nums）。每秒更新的數字若寬度跳動，就是在跟使用者的餘光作對。

## 4. Elevation

本系統不用陰影。深度全靠色調分層：夜幕 (#0d1418) → 表層 (#172228) → 白色透明度 hairline。唯一的例外是「即將到站」卡片的綠色光圈（`box-shadow: 0 0 0 1px #55d073` 疊在 1px 綠描邊上）——那不是 elevation，是訊號，受 One-Truck Rule 管轄。

### Named Rules
**The Flat Night Rule.** 表面靜止時一律平坦。任何投影、光暈若不是在說「車要來了」，就是違規。

## 5. Components

### Buttons
- **Shape:** 膠囊形（border-radius 999px），最小高度 44px
- **Primary:** bureau-teal 底 + teal-ink 字（padding 10px 20px, weight 600）。用於每個畫面唯一的主要動作（「加入站點」「開始搜尋」）
- **Hover / Focus:** hover 提亮至 #79d2e0；:active 壓深至 bureau-teal-deep；:focus-visible 顯示 2px bureau-teal 外框（offset 2px）
- **Ghost（更新按鈕等次要動作）:** 透明底 + 1px ink-muted 描邊 + ink 字；:active 疊 rgba(255,255,255,0.06)

### Chips
- **Style:** 膠囊形，rgba(255,255,255,0.06) 底 + ink 字（padding 3px 10px, 0.75rem）
- **State:** 資源回收日變體用 rgba(85,208,115,0.16) 底 + truck-green 字；停收日用 danger 同構

### Cards / Containers
- **Corner Style:** 12px
- **Background:** night-surface，1px 透明 border 佔位
- **Shadow Strategy:** 無陰影（見 Elevation）；「即將到站」狀態將 border 轉為 truck-green 並加 1px 同色光圈
- **Internal Padding:** 16px

### Inputs / Fields
- **Style:** night-surface 底、1px rgba(255,255,255,0.12) 描邊、8px 圓角、最小高度 44px
- **Focus:** 描邊轉 bureau-teal（1px→ 外加 focus ring），不用 glow
- **Placeholder:** ink-muted（已通過 4.5:1，不得再淡）
- **Disabled:** opacity 0.5

### Navigation
- **底部分頁列:** night-surface 底 + 上緣 hairline，固定於底部並讓出 safe-area-inset-bottom；每個分頁最小高度 56px
- **狀態:** 預設 ink-muted；當前分頁 bureau-teal + weight 600（v1 的黃色 active 依 One-Truck Rule 讓位給 teal）；:active 疊 rgba(255,255,255,0.04)

### Icons
圖標一律使用 Lucide（ISC 授權，https://lucide.dev）內嵌 SVG——24 格、2px 筆畫、圓端點，不加執行期依賴，不與 emoji 混用。行內圖標 16px 隨文字色（currentColor），按鈕圖標 18–22px，與文字基線對齊（vertical-align -0.125em）。顏色語意跟色彩章一致：星（最愛）、卡車、回收屬「車」的家族用 truck-green；關閉、新增等操作圖標跟隨所在文字的顏色。

**The No-Emoji Rule.** UI 的圖標語彙只有 Lucide 一套。emoji 只允許出現在使用者輸入的內容裡，不出現在介面本身。

### Map Markers
Leaflet 地圖磚是淺色的，夜間調色盤的亮色在上面站不住——地圖標記一律用色階深端：資訊層（地點範圍圈、路線點）用 bureau-teal-deep (#2e7688)，最愛站點用 truck-green-deep (#33a457)。亮色版（#5fc4d4 / #55d073）只屬於深色 UI。圖形標記（車輛、地點）放在 28px 白色圓 chip 上（box-shadow 0 1px 3px rgba(0,0,0,0.35)）以浮出地圖磚；最愛星形直接以 truck-green-deep 填色＋白邊。

### Countdown（signature component）
本 app 的靈魂。2rem/700 的等寬分鐘數 + truck-green 的「分」字尾標，落在最愛卡片內。無資料或已收運完畢時整組退為 ink-muted 的一行文字——絕不顯示假數字。

## 6. Do's and Don'ts

### Do:
- **Do** 把所有互動元素統一在 bureau-teal (#5fc4d4) 上——按鈕、分頁、連結、焦點，一個聲音。
- **Do** 保持倒數數字為畫面最大元素（2rem/700/tabular-nums），其他資訊退居 0.95rem 以下。
- **Do** 維持觸控目標 ≥44px、分頁列 ≥56px，並永遠計入 env(safe-area-inset-bottom)。
- **Do** 用色調分層（bg → surface → hairline）表達深度，靜止表面保持平坦。
- **Do** 動效限於狀態回饋，150–250ms、ease-out；並為 prefers-reduced-motion 提供直接切換。

### Don't:
- **Don't** 把台南垃圾車綠用在任何與車無關的地方——不做按鈕底、不做分頁 active、不做裝飾、不做「成功」狀態色。綠色是保留字。
- **Don't** 在介面裡用 emoji 當圖標——圖標語彙只有 Lucide 一套（The No-Emoji Rule）。
- **Don't** 使用黃色的「垃圾車」意象——台南的垃圾車是綠色的（全台唯一），黃色垃圾車是別的縣市的記憶。
- **Don't** 照搬三個官網的白底日間版式。取的是它們的機構色相，不是公告欄的排版。
- **Don't** 在 teal 或綠色底上放灰字；前景一律用對應的 ink 色（teal-ink #062026 / green-ink #0d2a16）。
- **Don't** 使用陰影堆疊、玻璃擬態、漸層文字，或 border-left 色條。
- **Don't** 為載入畫面編排進場動畫；使用者要的是答案，不是開場秀。
- **Don't** 顯示無憑據的倒數數字；資料缺席時誠實顯示「今日已收運完畢」或「無班次資料」。
