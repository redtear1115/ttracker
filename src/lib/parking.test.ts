import { describe, it, expect } from 'vitest'
import { slimParkingResponse, availability, isParkingStale } from './parking'

// 真實上游一筆（2026-07-13 實測），欄位可覆寫
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    typeId: '2', typeName: '公有收費停車場', id: '1', code: 'B00001',
    name: '海安路地下停車場', zoneId: '1', zone: '中西區',
    address: '台南市中西區海安路188號B1',
    largeCar: 0, car: 378, carDis: 0, carWoman: 0, carGreen: 0, moto: 0, motoDis: 0,
    largeCar_total: 0, car_total: 909, carDis_total: 28, carWoman_total: 21,
    carGreen_total: 24, moto_total: 0, motoDis_total: 0,
    chargeTime: '', chargeFee: '',
    update_time: '2026-07-13 17:48:04',
    lnglat: '22.991501,120.195621',
    ...over,
  }
}

describe('slimParkingResponse', () => {
  it('瘦身成 ParkingLot，lnglat 依 lat,lng 順序解析', () => {
    const lots = slimParkingResponse({ data: [raw()] })
    expect(lots).toEqual([{
      id: '1', name: '海安路地下停車場', zone: '中西區',
      address: '台南市中西區海安路188號B1',
      car: 378, carTotal: 909,
      updateTime: '2026-07-13 17:48:04',
      lat: 22.991501, lng: 120.195621, fee: null,
    }])
  })

  it('car=-1（無感應器）→ car: null', () => {
    const [lot] = slimParkingResponse({ data: [raw({ car: -1 })] })
    expect(lot.car).toBeNull()
    expect(lot.carTotal).toBe(909)
  })

  it('car_total=0（無汽車位）→ carTotal 與 car 都是 null', () => {
    const [lot] = slimParkingResponse({ data: [raw({ car_total: 0 })] })
    expect(lot.carTotal).toBeNull()
    expect(lot.car).toBeNull()
  })

  it('chargeFee 有值時保留', () => {
    const [lot] = slimParkingResponse({ data: [raw({ chargeFee: '汽車30元/時' })] })
    expect(lot.fee).toBe('汽車30元/時')
  })

  it('座標超界（比照 points 清洗範圍）的整筆剔除', () => {
    expect(slimParkingResponse({ data: [raw({ lnglat: '24.1,120.2' })] })).toEqual([])
    expect(slimParkingResponse({ data: [raw({ lnglat: '22.99,121.0' })] })).toEqual([])
  })

  it('lnglat 壞掉（非數字／缺半邊）的整筆剔除', () => {
    expect(slimParkingResponse({ data: [raw({ lnglat: 'x' })] })).toEqual([])
    expect(slimParkingResponse({ data: [raw({ lnglat: '' })] })).toEqual([])
  })

  it('缺 data 陣列時 throw（上游改版警報）', () => {
    expect(() => slimParkingResponse({})).toThrow()
    expect(() => slimParkingResponse({ data: 'nope' })).toThrow()
  })
})

describe('availability', () => {
  it('有位 → open 帶數字', () => {
    expect(availability({ car: 378, carTotal: 909 })).toEqual({ kind: 'open', count: 378 })
  })
  it('0 → full', () => {
    expect(availability({ car: 0, carTotal: 909 })).toEqual({ kind: 'full' })
  })
  it('car null 或 carTotal null → unknown', () => {
    expect(availability({ car: null, carTotal: 909 })).toEqual({ kind: 'unknown' })
    expect(availability({ car: 5, carTotal: null })).toEqual({ kind: 'unknown' })
  })
})

describe('isParkingStale', () => {
  const now = new Date('2026-07-13T18:00:00')
  it('30 分鐘內不算過時', () => {
    expect(isParkingStale('2026-07-13 17:48:04', now)).toBe(false)
  })
  it('超過 30 分鐘算過時', () => {
    expect(isParkingStale('2026-07-13 17:20:00', now)).toBe(true)
  })
  it('解析不了的時間視為過時', () => {
    expect(isParkingStale('', now)).toBe(true)
  })
})
