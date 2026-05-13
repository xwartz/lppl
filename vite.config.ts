import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'
import type { Plugin, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Plugin to handle Vercel-style serverless functions locally
function vercelApiPlugin(): Plugin {
  return {
    name: 'vercel-api-plugin',
    enforce: 'pre',
    configureServer(server: ViteDevServer) {
      // Add middleware BEFORE Vite's internal middleware (by not returning a function)
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          // Only handle /api/* routes
          if (!req.url?.startsWith('/api/')) {
            return next()
          }

          console.log('[API Plugin] Handling:', req.url)

          try {
            // Parse the API path: /api/stock/historical -> api/stock/historical.ts
            const urlPath = req.url.split('?')[0] // Remove query string
            const apiPath = urlPath.replace(/^\//, '') // Remove leading slash
            const modulePath = `./${apiPath}.ts`

            console.log('[API Plugin] Loading module:', modulePath)

            // Dynamically import the handler using Vite's SSR module loader
            const module = await server.ssrLoadModule(modulePath)
            const handler = module.default

            if (typeof handler !== 'function') {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'API handler not found or not a function' }))
              return
            }

            // Call the handler with request and response
            await handler(req, res)
          } catch (error) {
            console.error('[API Plugin] Error:', error)
            res.statusCode = 500
            res.end(
              JSON.stringify({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : String(error),
              }),
            )
          }
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    vercelApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      useCredentials: true,
      includeAssets: ['lppl-logo.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'LPPL Tracker',
        short_name: 'LPPL',
        description:
          '基于 LPPL 模型的金融泡沫追踪工具，实时监测数字货币、股票与大宗商品市场的泡沫风险。',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // Optimize deps to handle yahoo-finance2 properly in SSR
  optimizeDeps: {
    exclude: ['yahoo-finance2'],
  },
  ssr: {
    // Don't externalize yahoo-finance2 to ensure it works properly
    noExternal: ['yahoo-finance2'],
  },
})
