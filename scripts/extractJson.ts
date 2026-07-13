const NAMED: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", '#39': "'" }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+|#39);/g, (m, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16))
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10))
    return NAMED[code] ?? m
  })
}

/** 在 unescape 後的文字中，從第一個 `"AREA"` 往回找 `[`，做字串感知的括號配對，抽出 JSON 陣列 */
export function extractJsonArray(html: string): Record<string, unknown>[] {
  const text = decodeEntities(html)
  const anchor = text.indexOf('"AREA"')
  if (anchor === -1) throw new Error('頁面中找不到 "AREA" 錨點——上游格式可能已改版')
  const start = text.lastIndexOf('[', anchor)
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') {
      depth--
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('JSON 陣列未閉合——下載可能被截斷，請重試')
}
