/*
  Vercel Serverless Function: Stock historical data proxy
  - Primary: yahoo-finance2
  - Fallback: Alpha Vantage (free tier: 25 requests/day)
  - Avoids browser CORS by fetching on the server
  - Returns a minimal series compatible with KlineData: { time, close }
  - Implements long-term caching to avoid rate limits
*/

import type { IncomingMessage, ServerResponse } from "http"

// Response data type
interface HistoricalDataResponse {
  symbol: string
  interval: string
  points: Array<{ time: number; close: number }>
}

// Simple in-memory cache with LONG TTL to survive rate limits
const cache = new Map<string, { data: HistoricalDataResponse; expires: number }>()

// Lazy import to be safe across ESM/CJS bundling environments
async function getYahooFinance() {
  const { default: YahooFinance } = await import("yahoo-finance2")
  // yahoo-finance2 v3 requires instantiation
  const yahooFinance = new YahooFinance()
  return yahooFinance
}

// Fallback to Alpha Vantage API (requires API key in env)
async function fetchFromAlphaVantage(
  symbol: string,
  interval: string
): Promise<Array<{ date: Date; close: number }>> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || "demo"

  // Map intervals
  const functionMap: Record<string, string> = {
    "1d": "TIME_SERIES_DAILY",
    "1wk": "TIME_SERIES_WEEKLY",
    "1mo": "TIME_SERIES_MONTHLY",
  }

  const func = functionMap[interval] || "TIME_SERIES_DAILY"
  const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}&outputsize=full`

  const response = await fetch(url)
  const data: unknown = await response.json()

  // Type guard for Alpha Vantage response
  if (!data || typeof data !== "object") {
    throw new Error("Invalid Alpha Vantage response")
  }

  // Parse response
  const dataObj = data as Record<string, unknown>
  const timeSeriesKey = Object.keys(dataObj).find((key) =>
    key.includes("Time Series")
  )

  if (!timeSeriesKey || !dataObj[timeSeriesKey]) {
    throw new Error("Invalid Alpha Vantage response format")
  }

  const timeSeries = dataObj[timeSeriesKey] as Record<
    string,
    Record<string, string>
  >
  return Object.entries(timeSeries).map(([date, values]) => ({
    date: new Date(date),
    close: parseFloat(values["4. close"]),
  }))
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
  ttlSeconds = 3600 // Increased to 1 hour default
): void {
  // Cache with longer TTL to survive rate limits
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

    // Add retry logic with exponential backoff and fallback
    let retries = 0
    const maxRetries = 2
    let results: Array<{ date: Date; close: number }> = []
    let usedFallback = false

    while (retries <= maxRetries) {
      try {
        // yahoo-finance2 historical supports Date objects
        // Cast interval to valid yahoo-finance2 types
        const validInterval =
          interval === "1d" || interval === "1wk" || interval === "1mo"
            ? interval
            : "1d"

        results = await yf.historical(symbol, {
          period1,
          period2,
          interval: validInterval,
        })
        break // Success, exit retry loop
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        const isRateLimit =
          errorMessage.includes("Too Many Requests") ||
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit")

        // If all retries exhausted, try Alpha Vantage as fallback
        if (retries === maxRetries) {
          console.log(
            `Yahoo Finance failed, trying Alpha Vantage fallback for ${symbol}`
          )
          try {
            results = await fetchFromAlphaVantage(symbol, interval)
            usedFallback = true
            break
          } catch (fallbackError) {
            console.error("Alpha Vantage fallback also failed:", fallbackError)
            throw error // Throw original Yahoo error
          }
        }

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

    // Cache the successful response with longer TTL (1 hour)
    setCachedData(cacheKey, responseData, 3600)

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("X-Cache", "MISS")
    res.setHeader("X-Data-Source", usedFallback ? "alphavantage" : "yahoo")
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
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


