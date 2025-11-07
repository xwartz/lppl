import type { KlineData } from "../lib/lppl"
import LPPLTrackerBase from "./LPPLTrackerBase"

const LPPLTracker: React.FC = () => {
  const msPerDay = 24 * 60 * 60 * 1000

  const fetchSeries = async ({
    days,
    start,
    end,
    symbol,
  }: {
    days?: number
    start?: number
    end?: number
    symbol: string
  }): Promise<KlineData[]> => {
    let endTime: number
    let startTime: number
    let interval: string

    if (typeof start === "number" && typeof end === "number") {
      startTime = start
      endTime = end
      const rangeDays = Math.max(
        1,
        Math.round((endTime - startTime) / msPerDay)
      )
      interval = rangeDays > 90 ? "1d" : "4h"
    } else {
      endTime = Date.now()
      const useDays = typeof days === "number" ? days : 20
      startTime = endTime - useDays * msPerDay
      interval = useDays > 90 ? "1d" : "4h"
    }
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`
    )
    if (!response.ok) throw new Error("获取数据失败")
    type BinanceKline = [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      number,
      string,
      string,
      string
    ]
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error("Unexpected kline response")
    return (data as BinanceKline[]).map((k) => ({
      time: k[0],
      close: parseFloat(k[4]),
    }))
  }

  const validateSymbol = (s: string) => s.length > 0
  const priceFmt = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `$${Math.round(value)}`
    }
  }

  return (
    <LPPLTrackerBase
      initialSymbol="BTCUSDT"
      placeholder="例如 BTCUSDT"
      ariaLabel="手动输入交易对"
      validateSymbol={validateSymbol}
      fetchSeries={fetchSeries}
      priceFormatter={priceFmt}
      daysOptions={[20, 50, 100, 200, 365]}
    />
  )
}

export default LPPLTracker
