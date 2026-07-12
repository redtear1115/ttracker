<script lang="ts">
  import HomeView from './views/HomeView.svelte'
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
    <p class="empty">搜尋（下個 task 實作）</p>
  {:else}
    <p class="empty">地圖（下個 task 實作）</p>
  {/if}
</main>

<nav class="tabbar">
  <button class:active={view === 'home'} onclick={() => (view = 'home')}>最愛</button>
  <button class:active={view === 'search'} onclick={() => (view = 'search')}>搜尋</button>
  <button class:active={view === 'map'} onclick={() => (view = 'map')}>地圖</button>
</nav>
