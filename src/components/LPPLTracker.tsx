import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'
import AssetSelector from './AssetSelector'
import PriceChart from './PriceChart'
import { fitLppl } from '../lib/lppl'
import type { KlineData, LPPLResult } from '../lib/lppl'

const LPPLTracker: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [priceData, setPriceData] = useState<KlineData[]>([])
  const [lpplResult, setLpplResult] = useState<LPPLResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [days, setDays] = useState(180)

  const fetchBinanceData = useCallback(async (days: number) => {
    setLoading(true)
    setError('')

    try {
      const endTime = Date.now()
      const startTime = endTime - days * 24 * 60 * 60 * 1000
      const interval = days > 90 ? "1d" : "4h"
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`
      )

      if (!response.ok) throw new Error("获取数据失败")

      const data = await response.json()
      // Binance returns an array of kline arrays. Define the tuple shape to avoid `any`.
      type BinanceKline = [
        number, // openTime
        string, // open
        string, // high
        string, // low
        string, // close
        string, // volume
        number, // closeTime
        string, // quoteAssetVolume
        number, // numberOfTrades
        string, // takerBaseAssetVolume
        string, // takerQuoteAssetVolume
        string // ignore
      ]

      if (!Array.isArray(data)) throw new Error("Unexpected kline response")
      const klines: KlineData[] = (data as BinanceKline[]).map((k) => ({
        time: k[0],
        close: parseFloat(k[4]),
      }))

      setPriceData(klines)
      // delegate heavy lifting to shared lib (keeps UI file small)
      const res = fitLppl(klines)
      setLpplResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchBinanceData(days)
  }, [days, symbol, fetchBinanceData])

  const chartData = priceData.map((d, i) => ({
    date: new Date(d.time).toLocaleDateString(),
    actual: d.close,
    fitted: lpplResult && lpplResult.fitted ? lpplResult.fitted[i] ?? null : null
  }))



  const priceFormatter = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    } catch {
      return `$${Math.round(value)}`
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-amber-600'
      default: return 'text-emerald-500'
    }
  }

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-900/10 border-red-800/30'
      case 'medium': return 'bg-amber-900/8 border-amber-800/30'
      default: return 'bg-emerald-900/6 border-emerald-800/25'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/6 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3 leading-tight">
                <TrendingUp className="text-yellow-400" size={36} />
                <span className="tracking-tight">{symbol.replace('USDT','')} LPPL 泡沫追踪器</span>
              </h1>
              <p className="text-gray-300 mt-1 text-sm sm:text-base">对数周期幂律模型 · 市场临界点分析</p>
            </div>
            <div className="flex items-center gap-3">
              <AssetSelector symbol={symbol} setSymbol={setSymbol} />
              <label className="sr-only" htmlFor="range-select">选择区间</label>
              <select
                id="range-select"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-white/8 text-black px-3 py-2 rounded-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value={90}>90 天</option>
                <option value={180}>180 天</option>
                <option value={365}>365 天</option>
              </select>
              <button
                onClick={() => fetchBinanceData(days)}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-4 py-2 rounded-md shadow-sm transition disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span className="text-sm">刷新</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {lpplResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`${getRiskBg(lpplResult.riskLevel)} rounded-xl p-6 border-2`}>
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className={getRiskColor(lpplResult.riskLevel)} size={24} />
                  <h3 className="text-lg font-semibold text-gray-800">风险等级</h3>
                </div>
                <p className={`text-3xl font-bold ${getRiskColor(lpplResult.riskLevel)}`}>
                  {lpplResult.riskLevel === 'high' ? '高风险' :
                   lpplResult.riskLevel === 'medium' ? '中等风险' : '低风险'}
                </p>
              </div>
              {/* fitting diagnostics moved to bottom */}

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">预测临界点</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {lpplResult.criticalDate?.toLocaleDateString('zh-CN')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {Math.round((lpplResult.criticalDate!.getTime() - Date.now()) / (1000 * 86400))} 天后
                </p>
                {lpplResult.predictedPrice && Number.isFinite(lpplResult.predictedPrice) && (
                  <p className="text-sm text-gray-700 mt-3">
                    预测临界价: <span className="text-blue-700 font-semibold">{priceFormatter(lpplResult.predictedPrice)}</span>
                  </p>
                )}
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">模型拟合度</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {lpplResult.residual.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">残差 (越小越好)</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">价格与 LPPL 拟合曲线</h2>
            <PriceChart data={chartData} priceFormatter={priceFormatter} />
          </div>

          {lpplResult?.params && (
            <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">LPPL 模型参数</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-300 text-sm">基线 A (log)</p>
                  <p className="text-white font-mono">{lpplResult.params.A.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">基线 A (price)</p>
                  <p className="text-white font-mono">{priceFormatter(Math.exp(lpplResult.params.A))}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">临界时间 (tc)</p>
                  <p className="text-white font-mono">{lpplResult.params.tc.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">幂律指数 (m)</p>
                  <p className="text-white font-mono">{lpplResult.params.m.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">角频率 (ω)</p>
                  <p className="text-white font-mono">{lpplResult.params.omega.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">相位 (φ)</p>
                  <p className="text-white font-mono">{lpplResult.params.phi.toFixed(3)}</p>
                </div>
              </div>
            </div>
          )}

          {/* bottom-area: fitting diagnostics (less prominent) */}
          {lpplResult && (
            <div className="mt-6 bg-white/4 rounded-lg p-3 text-sm text-gray-300 border border-white/8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex gap-4">
                  <div>
                    <p className="text-gray-300 text-xs">SSE (log-space)</p>
                    <p className="text-white font-mono">{(lpplResult.sse ?? 0).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">RMSE (log-space)</p>
                    <p className="text-white font-mono">{(lpplResult.rmse ?? 0).toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">迭代次数</p>
                    <p className="text-white font-mono">{lpplResult.iterations ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs">耗时</p>
                    <p className="text-white font-mono">{(lpplResult.runTimeMs ?? 0)} ms</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-300 text-xs">拟合状态</p>
                  <p className={`font-mono ${lpplResult.converged ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lpplResult.converged ? '已收敛' : '未收敛 / 达到最大迭代'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-gray-300 text-sm">
            <p>⚠️ 免责声明：LPPL 模型仅供参考，不构成投资建议。市场预测具有不确定性，请谨慎决策。</p>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40">
              <div className="bg-white/6 backdrop-blur-md rounded-lg p-4 flex items-center gap-3 border border-white/10">
                <RefreshCw size={20} className="animate-spin text-white" />
                <span className="text-white">正在加载数据…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LPPLTracker
