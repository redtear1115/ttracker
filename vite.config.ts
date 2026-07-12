import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

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
  plugins: [svelte(), gpsDevProxy()],
  test: { environment: 'node' },
})
