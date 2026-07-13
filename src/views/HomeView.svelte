<script lang="ts">
  import { favorites } from '../lib/favorites.svelte'
  import { pointById } from '../lib/points'
  import { gps } from '../lib/gpsPoller.svelte'
  import FavoriteCard from '../components/FavoriteCard.svelte'

  let { gotoSearch }: { gotoSearch: () => void } = $props()
  const favPoints = $derived(favorites.ids.map((id) => pointById.get(id)).filter((p) => p != null))

  function pad(n: number): string {
    return String(n).padStart(2, '0')
  }
  const fetchedAt = $derived(
    gps.lastFetched
      ? `${pad(gps.lastFetched.getHours())}:${pad(gps.lastFetched.getMinutes())}:${pad(gps.lastFetched.getSeconds())}`
      : null,
  )
</script>

<div class="statusrow">
  <span class="status-text">
    {#if gps.status === 'error'}
      即時資訊暫不可用
    {:else if fetchedAt}
      即時資訊更新於 {fetchedAt}
    {:else}
      載入中…
    {/if}
  </span>
  <button class="refresh" onclick={() => gps.refresh()} aria-label="重新整理">重新整理</button>
</div>

{#if favPoints.length === 0}
  <div class="empty">
    <p>還沒有最愛清運點</p>
    <button class="primary" onclick={gotoSearch}>搜尋停靠點</button>
  </div>
{:else}
  {#each favPoints as point (point.id)}
    <FavoriteCard {point} />
  {/each}
{/if}
