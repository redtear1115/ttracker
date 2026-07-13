const DAY_MAP: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 }

export function parseDays(s: string | null): number[] {
  if (s == null || s === '' || s === '無清運') return []
  return s.split('、').map((part) => {
    const d = DAY_MAP[part.trim()]
    if (d === undefined) throw new Error(`無法解析星期值: ${JSON.stringify(s)}`)
    return d
  })
}
