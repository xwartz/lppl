/*
  Vercel Serverless Function: Stock historical data proxy using yahoo-finance2
  - Avoids browser CORS by fetching on the server
  - Returns a minimal series compatible with KlineData: { time, close }
*/

import type { IncomingMessage, ServerResponse } from "http"

// Lazy import to be safe across ESM/CJS bundling environments
async function getYahooFinance() {
  const mod = await import("yahoo-finance2")
  // default export is the class
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const YahooFinance = (mod as any).default
  return new YahooFinance()
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
      const endMs = isNaN(Number(endParam)) ? Date.parse(endParam) : Number(endParam)
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
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

    const yf = await getYahooFinance()
    // yahoo-finance2 historical supports Date objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await yf.historical(symbol, {
      period1,
      period2,
      interval,
    })

    const series = (results || [])
      .filter((r) => r && typeof r.close === "number" && r.date)
      .map((r) => ({ time: new Date(r.date).getTime(), close: r.close as number }))
      .sort((a, b) => a.time - b.time)

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.statusCode = 200
    res.end(JSON.stringify({ symbol, interval, points: series }))
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


