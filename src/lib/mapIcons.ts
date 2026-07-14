// Raw SVG markup for Leaflet divIcon markers.
// Icon paths from Lucide (https://lucide.dev), ISC License.

import type { Availability } from './parking'

const TRUCK_PATH =
  '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'

const HOUSE_PATH =
  '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'

const STAR_PATH =
  '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'

const MAP_PIN_PATH =
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'

function svg(
  size: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  paths: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}

// 28px 白色圓 chip；車＝綠，圖標 stroke #33a457（淺色地圖磚專用深綠）
export const truckMarkerHtml =
  `<div style="width:28px;height:28px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">` +
  `${svg(16, 'none', '#33a457', 2, TRUCK_PATH)}</div>`

// 24px star，fill 深綠、白邊，不用 chip
export const starMarkerHtml = svg(24, '#33a457', '#ffffff', 2, STAR_PATH)

// 28px 白色圓 chip 加 house 圖標 stroke #2e7688（淺色地圖磚專用深青）
export const homeMarkerHtml =
  `<div style="width:28px;height:28px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">` +
  `${svg(16, 'none', '#2e7688', 2, HOUSE_PATH)}</div>`

// 32px map-pin，fill 深青、白邊、細一階描邊；針尖朝下對準座標
export const draftMarkerHtml = svg(32, '#2e7688', '#ffffff', 1.5, MAP_PIN_PATH)

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
