import { describe, it, expect } from 'vitest'
import { parseDays } from './parseDays'

describe('parseDays', () => {
  it('解析頓號分隔的星期', () => {
    expect(parseDays('一、二、四、六')).toEqual([1, 2, 4, 6])
  })
  it('解析單日', () => {
    expect(parseDays('三')).toEqual([3])
  })
  it('週日為 7', () => {
    expect(parseDays('一、二、三、四、五、六、日')).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('無清運 → 空陣列', () => {
    expect(parseDays('無清運')).toEqual([])
  })
  it('null → 空陣列', () => {
    expect(parseDays(null)).toEqual([])
  })
  it('未知字元擲錯（防資料格式默默漂移）', () => {
    expect(() => parseDays('一、每日')).toThrow()
  })
})
