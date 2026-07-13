<script lang="ts">
  import HomeView from './views/HomeView.svelte'
  import SearchView from './views/SearchView.svelte'
  import { gps } from './lib/gpsPoller.svelte'
  import { onMount } from 'svelte'

  let view = $state<'home' | 'search' | 'map'>('home')
  onMount(() => {
    gps.start()
    return () => gps.stop()
  })
</script>

<main>
  {#if view === 'home'}
    <HomeView gotoSearch={() => (view = 'search')} />
  {:else if view === 'search'}
    <SearchView />
  {:else}
    {#await import('./views/MapView.svelte') then { default: MapView }}
      <MapView />
    {/await}
  {/if}
</main>

<nav class="tabbar">
  <button class:active={view === 'home'} onclick={() => (view = 'home')}>最愛</button>
  <button class:active={view === 'search'} onclick={() => (view = 'search')}>搜尋</button>
  <button class:active={view === 'map'} onclick={() => (view = 'map')}>地圖</button>
</nav>
