<script lang="ts">
  import { geocode } from '../lib/geocode'
  import Icon from './Icon.svelte'

  let { onLocate, onSave, onCancel }: {
    onLocate: (lat: number, lng: number) => void
    onSave: (name: string) => void
    onCancel: () => void
  } = $props()

  let name = $state('')
  let query = $state('')
  let searching = $state(false)
  let hint = $state('輸入路名或地標搜尋，或直接拖曳地圖上的圖釘')

  async function search(): Promise<void> {
    if (!query.trim() || searching) return
    searching = true
    const results = await geocode(query.trim())
    searching = false
    if (results.length === 0) {
      hint = '找不到，換路名或地標試試，或直接拖曳圖釘定位'
    } else {
      hint = `已定位：${results[0].name.split(',')[0]}——可拖曳圖釘微調`
      onLocate(results[0].lat, results[0].lng)
    }
  }
</script>

<div class="sheet">
  <header class="sheet-head">
    <h3 class="sheet-title"><Icon name="plus" size={18} />新增地點</h3>
    <button class="ghost" onclick={onCancel} aria-label="取消"><Icon name="x" size={18} /></button>
  </header>
  <div class="addform">
    <input placeholder="名稱（如：家、公司）" bind:value={name} />
    <div class="searchrow">
      <input placeholder="路名或地標" bind:value={query} onkeydown={(e) => e.key === 'Enter' && search()} />
      <button class="refresh" onclick={search} disabled={searching}>{searching ? '搜尋中…' : '搜尋'}</button>
    </div>
    <p class="muted hint">{hint}</p>
    <button class="primary" disabled={!name.trim()} onclick={() => onSave(name.trim())}>儲存地點</button>
  </div>
</div>

<style>
  .sheet-title { display: inline-flex; align-items: center; gap: 0.35em; }
</style>
