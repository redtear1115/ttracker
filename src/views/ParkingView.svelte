<script lang="ts">
  import { onMount } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { parking } from '../lib/parkingPoller.svelte'
  import { availability, isParkingStale, type ParkingLot } from '../lib/parking'
  import { parkingMarkerHtml } from '../lib/mapIcons'
  import Icon from '../components/Icon.svelte'

  let el: HTMLDivElement
  let map: L.Map
  let lotLayer = L.layerGroup()
  let selected = $state<ParkingLot | null>(null)

  onMount(() => {
    map = L.map(el, { zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    lotLayer.addTo(map)
    map.setView([22.99, 120.21], 14)
    // 情境是「到陣地前找車位」：有 GPS 就跳到人所在的位置
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => {},
      { maximumAge: 60_000, timeout: 5_000 },
    )
    parking.start()
    return () => {
      parking.stop()
      map.remove()
    }
  })

  $effect(() => {
    lotLayer.clearLayers()
    for (const lot of parking.lots) {
      const icon = L.divIcon({
        className: 'marker-icon',
        html: parkingMarkerHtml(availability(lot)),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker([lot.lat, lot.lng], { icon })
        .on('click', () => (selected = lot))
        .addTo(lotLayer)
    }
  })

  function ageLabel(lot: ParkingLot): string {
    const t = new Date(lot.updateTime.replace(' ', 'T'))
    if (Number.isNaN(t.getTime())) return '更新時間不明'
    const mins = Math.max(0, Math.round((Date.now() - t.getTime()) / 60_000))
    return mins === 0 ? '剛剛更新' : `${mins} 分鐘前更新`
  }
</script>

<div class="map" bind:this={el}></div>

{#if parking.status === 'error'}
  <div class="parkbanner">
    {parking.lots.length === 0 ? '即時車位暫不可用' : '連線失敗，顯示上次成功的資料'}
  </div>
{/if}

{#if selected}
  <div class="sheet">
    <header class="sheet-head">
      <h3 class="sheet-title"><Icon name="circle-parking" size={18} />{selected.name}</h3>
      <div class="sheet-actions">
        <button class="ghost" onclick={() => (selected = null)} aria-label="關閉"><Icon name="x" size={18} /></button>
      </div>
    </header>
    <p class="muted">{selected.zone}・{selected.address}</p>
    {#if availability(selected).kind === 'unknown'}
      <p class="parkcount muted">無汽車位即時資料</p>
    {:else}
      <p class="parkcount"><strong>{selected.car}</strong> ／ 共 {selected.carTotal} 位</p>
    {/if}
    <p class="muted">
      {ageLabel(selected)}{isParkingStale(selected.updateTime, new Date()) ? '・資料可能過時' : ''}
    </p>
    {#if selected.fee}<p class="muted">{selected.fee}</p>{/if}
  </div>
{/if}

<style>
  .map { position: fixed; inset: 0 0 56px 0; }
</style>
