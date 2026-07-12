import { describe, it, expect } from 'vitest'
import { decodeEntities, extractJsonArray } from './extractJson'

describe('decodeEntities', () => {
  it('解碼 quot/amp 與數字實體', () => {
    expect(decodeEntities('&quot;A&quot;&#xD;&#xA;&amp;&#65;')).toBe('"A"\r\n&A')
  })
})

describe('extractJsonArray', () => {
  it('從包住的 HTML 中抽出含 "AREA" 的 JSON 陣列', () => {
    const html = '<html><p>[not it]</p><pre>[ { "AREA": "東區", "POINTNAME": "含]括號的[名稱" } , { "AREA": "南區" } ]</pre></html>'
    const arr = extractJsonArray(html)
    expect(arr).toHaveLength(2)
    expect(arr[0].AREA).toBe('東區')
    expect(arr[0].POINTNAME).toBe('含]括號的[名稱')
  })
})
