<script lang="ts">
  import type { CollectionPoint } from '../lib/types'
  import { nextArrival, minutesUntil, isRecycleDay, nextArrivalHasRecycle } from '../lib/schedule'
  import { matchTruckToPoint } from '../lib/trucks'
  import { routeKey, routePoints } from '../lib/points'
  import { gps } from '../lib/gpsPoller.svelte'
  import { favorites } from '../lib/favorites.svelte'
  import Icon from './Icon.svelte'

  let { point }: { point: CollectionPoint } = $props()

  let now = $state(new Date())
  $effect(() => {
    const t = setInterval(() => (now = new Date()), 30_000)
    return () => clearInterval(t)
  })

  const arrival = $derived(nextArrival(point.time, point.workDays, now))
  const mins = $derived(arrival ? minutesUntil(arrival, now) : null)
  const recycle = $derived(isRecycleDay(point.recycleDays, now))
  const nextRecycle = $derived(nextArrivalHasRecycle(point, now))
  const match = $derived(matchTruckToPoint(point, routePoints(routeKey(point)), gps.trucks, now))
  const isToday = $derived(arrival != null && arrival.getDate() === now.getDate() && mins != null && mins < 24 * 60)

  const DAY_NAMES = ['', '一', '二', '三', '四', '五', '六', '日']
</script>

<article class="card" class:soon={mins != null && isToday && mins <= 10}>
  <header>
    <h2>{point.name}</h2>
    <button class="unfav" onclick={() => favorites.toggle(point.id)} aria-label="移除最愛"><Icon name="star" size={22} filled /></button>
  </header>
  <p class="area">{point.area}・{point.village}・路線 {point.routeId}</p>

  {#if arrival && mins != null}
    <p class="countdown">
      <span class="runicon" class:recycle={nextRecycle} title={nextRecycle ? '這班有回收' : '這班只收垃圾'}>
        {#if nextRecycle}<Icon name="recycle" size={16} />{:else}<Icon name="trash-2" size={16} />{/if}
      </span>
      {#if isToday}
        <strong>{point.time}</strong>
        <span class="mins">剩 {mins >= 60 ? `${Math.floor(mins / 60)} 小時 ${mins % 60}` : mins} 分</span>
      {:else}
        下次：週{DAY_NAMES[((arrival.getDay() + 6) % 7) + 1]} {point.time}
      {/if}
    </p>
  {:else}
    <p class="countdown muted">無固定班次資料</p>
  {/if}

  <p class="badges">
    {#if recycle}<span class="badge recycle"><Icon name="recycle" size={14} />今天有回收</span>
    {:else}<span class="badge muted">今天無回收</span>{/if}
    {#if point.recycleDays.length}
      <span class="badge muted">回收日：{point.recycleDays.map((d) => DAY_NAMES[d]).join('、')}</span>
    {/if}
  </p>

  <p class="truck">
    {#if gps.status === 'error'}
      <span class="muted">即時資訊暫不可用</span>
    {:else if match}
      <span class="truck-signal"><Icon name="truck" size={16} /></span> {match.stopsAway > 0 ? `還差 ${match.stopsAway} 站` : match.stopsAway === 0 ? '就在附近！' : '已過站'}
      <span class="muted">（{match.truck.caption}）</span>
    {:else}
      <span class="muted"><Icon name="truck" size={16} /> 未發車或無法定位</span>
    {/if}
  </p>
</article>
