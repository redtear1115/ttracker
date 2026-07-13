<script lang="ts">
  import type { Place } from '../lib/places.svelte'
  import { places } from '../lib/places.svelte'
  import { favorites } from '../lib/favorites.svelte'
  import { nearbyStops } from '../lib/nearby'
  import { allPoints } from '../lib/points'
  import { nextArrival, nextArrivalHasRecycle } from '../lib/schedule'
  import type { CollectionPoint } from '../lib/types'
  import Icon from './Icon.svelte'

  let { place, onFocus, onClose }: {
    place: Place
    onFocus: (point: CollectionPoint) => void
    onClose: () => void
  } = $props()

  const now = new Date()
  const stops = $derived(nearbyStops(allPoints, place.lat, place.lng))

  function timeLabel(p: CollectionPoint): string {
    const at = nextArrival(p.time, p.workDays, now)
    if (!at) return '無班次'
    const DAY = ['日', '一', '二', '三', '四', '五', '六']
    const sameDay = at.getDate() === now.getDate()
    return sameDay ? `今天 ${p.time}` : `週${DAY[at.getDay()]} ${p.time}`
  }

  function removePlace(): void {
    places.remove(place.id)
    onClose()
  }
</script>

<div class="sheet">
  <header class="sheet-head">
    <h3 class="sheet-title"><Icon name="house" size={18} />{place.name}</h3>
    <div class="sheet-actions">
      <button class="ghost" onclick={removePlace}>刪除地點</button>
      <button class="ghost" onclick={onClose} aria-label="關閉"><Icon name="x" size={18} /></button>
    </div>
  </header>
  {#if stops.length === 0}
    <p class="muted sheet-empty">500 公尺內沒有清運點</p>
  {:else}
    <ul class="stoplist">
      {#each stops as s (s.point.id)}
        <li>
          <button class="stop-main" onclick={() => onFocus(s.point)}>
            <span class="runicon" class:recycle={nextArrivalHasRecycle(s.point, now)}>
              {#if nextArrivalHasRecycle(s.point, now)}<Icon name="recycle" size={16} />{:else}<Icon name="trash-2" size={16} />{/if}
            </span>
            <span class="stop-name">{s.point.name}</span>
            <span class="muted">{timeLabel(s.point)} · {Math.round(s.distanceM)}m</span>
          </button>
          <button class="fav" class:on={favorites.has(s.point.id)} onclick={() => favorites.toggle(s.point.id)} aria-label={favorites.has(s.point.id) ? '移除最愛' : '加入最愛'}>
            <Icon name="star" size={22} filled={favorites.has(s.point.id)} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .sheet-title { display: inline-flex; align-items: center; gap: 0.35em; }
</style>
