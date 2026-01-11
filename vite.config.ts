import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin, ViteDevServer } from 'vite'
import type { ServerResponse, IncomingMessage } from 'http'

// Plugin to handle Vercel-style serverless functions locally
function vercelApiPlugin(): Plugin {
  return {
    name: 'vercel-api-plugin',
    enforce: 'pre',
    configureServer(server: ViteDevServer) {
      // Add middleware BEFORE Vite's internal middleware (by not returning a function)
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
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
          res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : String(error)
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
  // Optimize deps to handle yahoo-finance2 properly in SSR
  optimizeDeps: {
    exclude: ['yahoo-finance2'],
  },
  ssr: {
    // Don't externalize yahoo-finance2 to ensure it works properly
    noExternal: ['yahoo-finance2'],
  },
})
