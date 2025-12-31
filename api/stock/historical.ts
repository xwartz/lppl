/*
  Vercel Serverless Function: Stock historical data proxy using yahoo-finance2
  - Avoids browser CORS by fetching on the server
  - Returns a minimal series compatible with KlineData: { time, close }
  - Implements caching to avoid rate limits
*/

import type { IncomingMessage, ServerResponse } from "http"

// Response data type
interface HistoricalDataResponse {
  symbol: string
  interval: string
  points: Array<{ time: number; close: number }>
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: HistoricalDataResponse; expires: number }>()

// Lazy import to be safe across ESM/CJS bundling environments
async function getYahooFinance() {
  const mod = await import("yahoo-finance2")
  // yahoo-finance2 exports the yahooFinance instance as default
  return mod.default
}

function getCachedData(key: string): HistoricalDataResponse | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  if (cached) {
    cache.delete(key)
  }
  return null
}

function setCachedData(
  key: string,
  data: HistoricalDataResponse,
  ttlSeconds = 300
): void {
  // Cache for 5 minutes by default
  const expires = Date.now() + ttlSeconds * 1000
  cache.set(key, { data, expires })

  // Clean up old cache entries (keep cache size reasonable)
  if (cache.size > 100) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (v.expires < now) {
        cache.delete(k)
      }
    }
  }
}

type Req = IncomingMessage & {
  method?: string
  url?: string
}

type Res = ServerResponse & {
  setHeader: (name: string, value: string | number | readonly string[]) => void
}

export default async function handler(req: Req, res: Res) {
  // Basic CORS headers so this can be called from any origin if needed
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  )

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== "GET") {
    res.statusCode = 405
    res.end(JSON.stringify({ error: "Method not allowed" }))
    return
  }

  try {
    const host =
      (req.headers && (req.headers as Record<string, string>)["host"]) ||
      "localhost"
    const protoHeader =
      (req.headers &&
        ((req.headers as Record<string, string>)["x-forwarded-proto"] ||
          (req.headers as Record<string, string>)["x-forwarded-protocol"])) ||
      "http"
    const base = `${protoHeader}://${host}`
    const url = new URL(req.url || "/api/stock/historical", base)
    const symbol = url.searchParams.get("symbol")?.trim().toUpperCase()
    const interval = url.searchParams.get("interval") || "1d"
    const startParam = url.searchParams.get("start")
    const endParam = url.searchParams.get("end")
    const rangeDaysParam = url.searchParams.get("rangeDays")

    if (!symbol) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing symbol" }))
      return
    }

    const now = Date.now()
    let period1: Date
    let period2: Date

    if (startParam && endParam) {
      const startMs = isNaN(Number(startParam))
        ? Date.parse(startParam)
        : Number(startParam)
      const endMs = isNaN(Number(endParam))
        ? Date.parse(endParam)
        : Number(endParam)
      if (
        !Number.isFinite(startMs) ||
        !Number.isFinite(endMs) ||
        endMs < startMs
      ) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: "Invalid start/end" }))
        return
      }
      period1 = new Date(startMs)
      period2 = new Date(endMs)
    } else {
      const days = Math.max(1, Number(rangeDaysParam || 200))
      period2 = new Date(now)
      period1 = new Date(now - days * 24 * 60 * 60 * 1000)
    }

    // Create cache key based on request parameters
    const cacheKey = `${symbol}-${interval}-${period1.getTime()}-${period2.getTime()}`

    // Check cache first
    const cachedResult = getCachedData(cacheKey)
    if (cachedResult) {
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.setHeader("X-Cache", "HIT")
      res.statusCode = 200
      res.end(JSON.stringify(cachedResult))
      return
    }

    const yf = await getYahooFinance()

    // Add retry logic with exponential backoff
    let retries = 0
    const maxRetries = 2
    let results: Array<{ date: Date; close: number }> = []

    while (retries <= maxRetries) {
      try {
        // yahoo-finance2 historical supports Date objects
        results = await yf.historical(symbol, {
          period1,
          period2,
          interval,
        })
        break // Success, exit retry loop
      } catch (error: unknown) {
        if (retries === maxRetries) {
          throw error // Re-throw if we've exhausted retries
        }

        // Check if it's a rate limit error
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        const isRateLimit =
          errorMessage.includes("Too Many Requests") ||
          errorMessage.includes("429")

        if (isRateLimit) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, retries), 5000)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          retries++
        } else {
          throw error // Not a rate limit error, don't retry
        }
      }
    }

    const series = (results || [])
      .filter((r) => r && typeof r.close === "number" && r.date)
      .map((r) => ({
        time: new Date(r.date).getTime(),
        close: r.close as number,
      }))
      .sort((a, b) => a.time - b.time)

    const responseData = { symbol, interval, points: series }

    // Cache the successful response
    setCachedData(cacheKey, responseData, 300) // 5 minutes TTL

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("X-Cache", "MISS")
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    )
    res.statusCode = 200
    res.end(JSON.stringify(responseData))
  } catch (err) {
    res.statusCode = 500
    res.end(
      JSON.stringify({
        error: "Failed to fetch historical data",
        message: err instanceof Error ? err.message : String(err),
      })
    )
  }
}


