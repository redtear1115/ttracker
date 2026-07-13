import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

const UPSTREAM = 'https://clean.tnepb.gov.tw/WebService/WsSkyeyes.asmx/NewgetCarsinfo'

// 開發期代理：上游要求特定 Referer，瀏覽器無法直打，dev server 代打
function gpsDevProxy(): Plugin {
  return {
    name: 'gps-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gps', async (_req, res) => {
        try {
          const r = await fetch(UPSTREAM, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              Referer: 'https://clean.tnepb.gov.tw/GarbageTruckLiveFeed',
            },
            body: '{}',
          })
          const text = await r.text()
          if (!r.ok || !text.trimStart().startsWith('{')) throw new Error('bad upstream')
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(text)
        } catch {
          res.statusCode = 502
          res.end('{"error":"upstream"}')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    svelte(),
    gpsDevProxy(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '台南垃圾車',
        short_name: '垃圾車',
        lang: 'zh-TW',
        theme_color: '#0d1418',
        background_color: '#0d1418',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // 主 chunk 內嵌清運點資料，約 2.8MB，超過 workbox 預設 2MB 上限；放寬以便 shell + 時刻表可離線
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: { cacheName: 'osm-tiles', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
})
