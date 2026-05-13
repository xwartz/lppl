import type React from 'react'
import { useI18n } from '../lib/i18n'
import type { KlineData } from '../lib/lppl'
import LPPLTrackerBase from './LPPLTrackerBase'

const CommodityLPPLTracker: React.FC = () => {
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
    query.set('symbol', symbol)
    query.set('interval', '1d')
    if (typeof start === 'number' && typeof end === 'number') {
      query.set('start', String(start))
      query.set('end', String(end))
    } else {
      query.set('rangeDays', String(typeof days === 'number' ? days : 200))
    }
    const response = await fetch(`/api/stock/historical?${query.toString()}`)
    if (!response.ok) throw new Error(t('error.stock.fetch'))
    const payload = await response.json()
    if (!payload || !Array.isArray(payload.points)) throw new Error(t('error.stock.format'))
    return payload.points.map((p: { time: number; close: number }) => ({
      time: p.time,
      close: p.close,
    }))
  }

  // Allow '=' for futures like GC=F
  const validateSymbol = (s: string) => /^[A-Z0-9=][A-Z0-9=.-]{0,19}$/i.test(s)

  const priceFmt = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `$${value.toFixed(2)}`
    }
  }

  const defaultCommodities = [
    { label: 'Gold', value: 'GC=F' },
    { label: 'Silver', value: 'SI=F' },
    { label: 'Crude Oil', value: 'CL=F' },
  ]

  return (
    <LPPLTrackerBase
      initialSymbol="GC=F"
      placeholder="Commodity (e.g. GC=F)"
      ariaLabel="Commodities"
      validateSymbol={validateSymbol}
      fetchSeries={fetchSeries}
      priceFormatter={priceFmt}
      daysOptions={[50, 100, 200, 365, 730]}
      suggestedSymbols={defaultCommodities}
    />
  )
}

export default CommodityLPPLTracker
