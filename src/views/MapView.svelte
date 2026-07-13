<script lang="ts">
  import { onMount } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { favorites } from '../lib/favorites.svelte'
  import { pointById, routeKey, routePoints, allPoints } from '../lib/points'
  import { gps } from '../lib/gpsPoller.svelte'
  import { isStale } from '../lib/trucks'
  import { places, type Place } from '../lib/places.svelte'
  import { nearbyStops } from '../lib/nearby'
  import type { CollectionPoint } from '../lib/types'
  import PlacePanel from '../components/PlacePanel.svelte'
  import AddPlacePanel from '../components/AddPlacePanel.svelte'

  let el: HTMLDivElement
  let map: L.Map
  let truckLayer = L.layerGroup()

  let selectedPlace = $state<Place | null>(null)
  let adding = $state(false)
  let placesLayer = L.layerGroup()
  let highlightLayer = L.layerGroup()
  let draftMarker: L.Marker | null = null

  const truckIcon = L.divIcon({ className: 'truck-icon', html: '🚛', iconSize: [28, 28] })
  const starIcon = L.divIcon({ className: 'star-icon', html: '⭐', iconSize: [24, 24] })
  const homeIcon = L.divIcon({ className: 'place-icon', html: '🏠', iconSize: [28, 28] })
  const draftIcon = L.divIcon({ className: 'place-icon', html: '📍', iconSize: [32, 32] })

  function redrawPlaces(): void {
    placesLayer.clearLayers()
    for (const p of places.list) {
      L.circle([p.lat, p.lng], { radius: 500, color: '#ffc53d', weight: 1, fillOpacity: 0.05 }).addTo(placesLayer)
      L.marker([p.lat, p.lng], { icon: homeIcon })
        .on('click', () => { stopAdding(); selectedPlace = p })
        .addTo(placesLayer)
    }
  }

  function startAdding(): void {
    adding = true
    selectedPlace = null
    if (!draftMarker) {
      draftMarker = L.marker(map.getCenter(), { icon: draftIcon, draggable: true }).addTo(map)
    } else {
      draftMarker.setLatLng(map.getCenter())
    }
  }

  function locateDraft(lat: number, lng: number): void {
    draftMarker?.setLatLng([lat, lng])
    map.setView([lat, lng], 16)
  }

  function savePlace(name: string): void {
    if (!draftMarker) return
    const { lat, lng } = draftMarker.getLatLng()
    selectedPlace = places.add(name, lat, lng)
    stopAdding()
  }

  function stopAdding(): void {
    adding = false
    draftMarker?.remove()
    draftMarker = null
  }

  function focusStop(point: CollectionPoint): void {
    map.setView([point.lat, point.lng], 17)
  }

  onMount(() => {
    map = L.map(el, { zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    truckLayer.addTo(map)
    placesLayer.addTo(map)
    highlightLayer.addTo(map)

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

  $effect(() => {
    places.list // 追蹤
    redrawPlaces()
  })

  $effect(() => {
    highlightLayer.clearLayers()
    if (!selectedPlace) return
    for (const s of nearbyStops(allPoints, selectedPlace.lat, selectedPlace.lng)) {
      L.circleMarker([s.point.lat, s.point.lng], { radius: 5, color: '#ffc53d', weight: 2, fillOpacity: 0.6 })
        .bindPopup(`${s.point.name}`)
        .addTo(highlightLayer)
    }
  })
</script>

<div class="map" bind:this={el}></div>

<button class="addplace primary" onclick={startAdding}>＋ 地點</button>

{#if adding}
  <AddPlacePanel onLocate={locateDraft} onSave={savePlace} onCancel={stopAdding} />
{:else if selectedPlace}
  <PlacePanel place={selectedPlace} onFocus={focusStop} onClose={() => (selectedPlace = null)} />
{/if}

<style>
  .map { position: fixed; inset: 0 0 56px 0; }
  :global(.truck-icon), :global(.star-icon) { font-size: 22px; line-height: 1; background: none; border: none; }
</style>
