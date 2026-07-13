<script lang="ts">
  import { areas, routesInArea, routePoints, allPoints } from '../lib/points'
  import { favorites } from '../lib/favorites.svelte'
  import { haversineMeters } from '../lib/geo'
  import type { CollectionPoint } from '../lib/types'

  let area = $state('')
  let routeKeySel = $state('')
  let keyword = $state('')
  let nearby = $state<CollectionPoint[] | null>(null)
  let geoError = $state('')

  const routes = $derived(area ? routesInArea(area) : [])
  const points = $derived.by(() => {
    if (nearby) return nearby
    if (!routeKeySel) return []
    const list = routePoints(routeKeySel)
    return keyword ? list.filter((p) => p.name.includes(keyword) || p.village.includes(keyword)) : list
  })

  function findNearby(): void {
    geoError = ''
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        nearby = [...allPoints]
          .map((p) => ({ p, d: haversineMeters(pos.coords.latitude, pos.coords.longitude, p.lat, p.lng) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 20)
          .map((x) => x.p)
      },
      () => (geoError = '無法取得定位，請改用逐層瀏覽'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }
</script>

<div class="search">
  <button class="primary" onclick={findNearby}>📍 附近的清運點</button>
  {#if geoError}<p class="muted">{geoError}</p>{/if}

  <div class="selectors">
    <select bind:value={area} onchange={() => { routeKeySel = ''; nearby = null }}>
      <option value="">選行政區</option>
      {#each areas as a}<option value={a}>{a}</option>{/each}
    </select>
    <select bind:value={routeKeySel} onchange={() => (nearby = null)} disabled={!area}>
      <option value="">選路線</option>
      {#each routes as r}<option value={r.key}>路線 {r.routeId}</option>{/each}
    </select>
    {#if routeKeySel}<input placeholder="過濾點名／里別" bind:value={keyword} />{/if}
  </div>

  <ul class="pointlist">
    {#each points as p (p.id)}
      <li>
        <div>
          <strong>{p.name}</strong>
          <span class="muted">{p.area}・{p.village}・{p.time ?? '無時刻'}・路線 {p.routeId}</span>
        </div>
        <button class="fav" class:on={favorites.has(p.id)} onclick={() => favorites.toggle(p.id)}>
          {favorites.has(p.id) ? '★' : '☆'}
        </button>
      </li>
    {/each}
  </ul>
</div>
