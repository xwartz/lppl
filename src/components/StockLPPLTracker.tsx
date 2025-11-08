import LPPLTrackerBase from "./LPPLTrackerBase"
import type { KlineData } from "../lib/lppl"
import { useI18n } from "../lib/i18n"

const StockLPPLTracker: React.FC = () => {
  const { t } = useI18n()

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
    if (!response.ok) throw new Error(t("error.stock.fetch"))
    const payload = await response.json()
    if (!payload || !Array.isArray(payload.points))
      throw new Error(t("error.stock.format"))
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
      placeholder={t("placeholder.stock.symbol")}
      ariaLabel={t("aria.stock")}
      validateSymbol={validateSymbol}
      fetchSeries={fetchSeries}
      priceFormatter={priceFmt}
      daysOptions={[50, 100, 200, 365, 730]}
    />
  )
}

export default StockLPPLTracker
