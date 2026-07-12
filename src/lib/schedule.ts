export function isoDay(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1
}

export function nextArrival(time: string | null, workDays: number[], now: Date): Date | null {
  if (!time || workDays.length === 0) return null
  const [h, m] = time.split(':').map(Number)
  for (let add = 0; add < 8; add++) {
    const d = new Date(now)
    d.setDate(d.getDate() + add)
    d.setHours(h, m, 0, 0)
    if (workDays.includes(isoDay(d)) && d.getTime() >= now.getTime()) return d
  }
  return null
}

export function minutesUntil(target: Date, now: Date): number {
  return Math.floor((target.getTime() - now.getTime()) / 60000)
}

export function isRecycleDay(recycleDays: number[], now: Date): boolean {
  return recycleDays.includes(isoDay(now))
}
