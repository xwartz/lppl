import LPPLTrackerBase from "./LPPLTrackerBase"
import type { KlineData } from "../lib/lppl"

const StockLPPLTracker: React.FC = () => {
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
    const query = new URLSearchParams()
    query.set("symbol", symbol)
    query.set("interval", "1d")
    if (typeof start === "number" && typeof end === "number") {
      query.set("start", String(start))
      query.set("end", String(end))
    } else {
      query.set("rangeDays", String(typeof days === "number" ? days : 200))
    }
    const response = await fetch(`/api/stock/historical?${query.toString()}`)
    if (!response.ok) throw new Error("获取股票数据失败")
    const payload = await response.json()
    if (!payload || !Array.isArray(payload.points))
      throw new Error("股票历史数据格式异常")
    return payload.points.map((p: { time: number; close: number }) => ({
      time: p.time,
      close: p.close,
    }))
  }

  const validateSymbol = (s: string) => /^[A-Z.-]{1,10}$/.test(s)
  const priceFmt = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `$${value.toFixed(2)}`
    }
  }

  return (
    <LPPLTrackerBase
      initialSymbol="AAPL"
      placeholder="例如 AAPL"
      ariaLabel="手动输入股票代码"
      validateSymbol={validateSymbol}
      fetchSeries={fetchSeries}
      priceFormatter={priceFmt}
      daysOptions={[50, 100, 200, 365, 730]}
    />
  )
}

export default StockLPPLTracker
