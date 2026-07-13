import { describe, it, expect } from 'vitest'
import { isoDay, nextArrival, minutesUntil, isRecycleDay, nextArrivalHasRecycle } from './schedule'

// 2026-07-13 是週一
const mon = (h: number, m: number) => new Date(2026, 6, 13, h, m)

describe('isoDay', () => {
  it('週一=1、週日=7', () => {
    expect(isoDay(new Date(2026, 6, 13))).toBe(1)
    expect(isoDay(new Date(2026, 6, 19))).toBe(7)
  })
})

describe('nextArrival', () => {
  it('今天收運且班次未到 → 今天', () => {
    const at = nextArrival('19:30', [1, 4], mon(18, 0))!
    expect(at.getDate()).toBe(13)
    expect(at.getHours()).toBe(19)
  })
  it('正好等於班次時刻 → 視為現在到站', () => {
    const at = nextArrival('19:30', [1], mon(19, 30))!
    expect(at.getTime()).toBe(mon(19, 30).getTime())
  })
  it('今天班次已過 → 下一個收運日', () => {
    const at = nextArrival('19:30', [1, 4], mon(20, 0))!
    expect(at.getDate()).toBe(16) // 週四
  })
  it('跨週：週一過班後、只收週一 → 下週一', () => {
    const at = nextArrival('19:30', [1], mon(20, 0))!
    expect(at.getDate()).toBe(20)
  })
  it('無收運日 → null', () => {
    expect(nextArrival('19:30', [], mon(12, 0))).toBeNull()
  })
  it('無時刻 → null', () => {
    expect(nextArrival(null, [1], mon(12, 0))).toBeNull()
  })
})

describe('minutesUntil', () => {
  it('整分差', () => {
    expect(minutesUntil(mon(19, 30), mon(19, 11))).toBe(19)
    expect(minutesUntil(mon(19, 30), mon(19, 30))).toBe(0)
  })
  it('有秒數餘量時向下取整', () => {
    expect(minutesUntil(mon(19, 30), new Date(2026, 6, 13, 19, 11, 30))).toBe(18) // 18.5 分
  })
})

describe('isRecycleDay', () => {
  it('今天在回收日清單', () => {
    expect(isRecycleDay([1, 4], mon(8, 0))).toBe(true)
    expect(isRecycleDay([2, 6], mon(8, 0))).toBe(false)
  })
})

describe('nextArrivalHasRecycle', () => {
  // mon(h, m) 已存在於檔案上方（2026-07-13 週一）
  it('下一班當天是回收日 → true', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [1, 4] }, mon(18, 0))).toBe(true)
  })
  it('下一班當天非回收日 → false', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [2, 6] }, mon(18, 0))).toBe(false)
  })
  it('今天班次過了、下一班在週四且週四有回收 → true', () => {
    expect(nextArrivalHasRecycle({ time: '19:30', workDays: [1, 4], recycleDays: [4] }, mon(20, 0))).toBe(true)
  })
  it('無班次 → null', () => {
    expect(nextArrivalHasRecycle({ time: null, workDays: [1], recycleDays: [1] }, mon(12, 0))).toBeNull()
  })
})
