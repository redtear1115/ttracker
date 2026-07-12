<script lang="ts">
  import { onMount } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { favorites } from '../lib/favorites.svelte'
  import { pointById, routeKey, routePoints } from '../lib/points'
  import { gps } from '../lib/gpsPoller.svelte'
  import { isStale } from '../lib/trucks'

  let el: HTMLDivElement
  let map: L.Map
  let truckLayer = L.layerGroup()

  const truckIcon = L.divIcon({ className: 'truck-icon', html: '🚛', iconSize: [28, 28] })
  const starIcon = L.divIcon({ className: 'star-icon', html: '⭐', iconSize: [24, 24] })

  onMount(() => {
    map = L.map(el, { zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    truckLayer.addTo(map)

    const favs = favorites.ids.map((id) => pointById.get(id)).filter((p) => p != null)
    const bounds: L.LatLngTuple[] = []
    const routesDrawn = new Set<string>()
    for (const p of favs) {
      L.marker([p.lat, p.lng], { icon: starIcon }).bindPopup(`${p.name}<br>${p.time ?? ''}`).addTo(map)
      bounds.push([p.lat, p.lng])
      const k = routeKey(p)
      if (!routesDrawn.has(k)) {
        routesDrawn.add(k)
        for (const rp of routePoints(k))
          L.circleMarker([rp.lat, rp.lng], { radius: 3, color: '#ffc53d', weight: 1 }).addTo(map)
      }
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    else map.setView([22.99, 120.21], 13)

    return () => map.remove()
  })

  $effect(() => {
    const now = new Date()
    truckLayer.clearLayers()
    for (const t of gps.trucks) {
      if (isStale(t, now)) continue
      L.marker([t.lat, t.lng], { icon: truckIcon })
        .bindPopup(`${t.plate}<br>${t.caption}<br>${t.at.toLocaleTimeString('zh-TW')}`)
        .addTo(truckLayer)
    }
  })
</script>

<div class="map" bind:this={el}></div>

<style>
  .map { position: fixed; inset: 0 0 56px 0; }
  :global(.truck-icon), :global(.star-icon) { font-size: 22px; line-height: 1; background: none; border: none; }
</style>
