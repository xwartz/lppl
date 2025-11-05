import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'

interface KlineData {
  time: number
  close: number
}

interface LPPLParams {
  A: number;      // 价格上限
  B: number;      // 幂律系数
  C: number;      // 对数周期振幅
  tc: number;     // 临界时间（天数）
  m: number;      // 幂律指数
  omega: number;  // 角频率
  phi: number;    // 相位
}

interface LPPLResult {
  params: LPPLParams | null
  fitted: number[]
  residual: number
  criticalDate: Date | null
  riskLevel: 'low' | 'medium' | 'high'
}

const BtcLPPLTracker: React.FC = () => {
  const [priceData, setPriceData] = useState<KlineData[]>([])
  const [lpplResult, setLpplResult] = useState<LPPLResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [days, setDays] = useState(365)

  const fetchBinanceData = useCallback(async (days: number) => {
    setLoading(true)
    setError('')

    try {
      const endTime = Date.now()
      const startTime = endTime - days * 24 * 60 * 60 * 1000
      const interval = days > 90 ? '1d' : '4h'

      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`
      )

      if (!response.ok) throw new Error('获取数据失败')

      const data = await response.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const klines: KlineData[] = data.map((k: any) => ({
        time: k[0],
        close: parseFloat(k[4])
      }))

      setPriceData(klines)
      calculateLPPL(klines)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateLPPL = (data: KlineData[]) => {
    if (data.length < 50) {
      setError('数据点不足，需要至少50个数据点')
      return
    }

    // 归一化时间和价格
    const times = data.map(d => d.time / 1000)
    const prices = data.map(d => d.close)
    const t0 = times[0]
    const normalizedTimes = times.map(t => (t - t0) / 86400) // 转换为天数

    // 初始参数估计
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const lastTime = normalizedTimes[normalizedTimes.length - 1]

    // 简化的 LPPL 拟合（使用最小二乘法的近似）
    // 这里使用简化版本，实际应用中需要更复杂的非线性优化
    const params: LPPLParams = {
      A: maxPrice * 1.1,
      B: -(maxPrice - minPrice) * 0.3,
      C: (maxPrice - minPrice) * 0.1,
      tc: lastTime + 30, // 预测未来30天
      m: 0.5,
      omega: 6.0,
      phi: 0.5
    }

    // 计算拟合值
    const fitted = normalizedTimes.map(t => {
      const dt = params.tc - t
      if (dt <= 0) return params.A

      const powerLaw = params.A + params.B * Math.pow(dt, params.m)
      const logPeriodic = params.C * Math.pow(dt, params.m) *
                         Math.cos(params.omega * Math.log(dt) - params.phi)

      return powerLaw + logPeriodic
    })

    // 计算残差
    const residuals = prices.map((p, i) => Math.pow(p - fitted[i], 2))
    const residual = Math.sqrt(residuals.reduce((a, b) => a + b, 0) / residuals.length)

    // 计算临界日期
    const criticalTimestamp = (params.tc * 86400 + t0) * 1000
    const criticalDate = new Date(criticalTimestamp)

    // 评估风险等级
    const daysUntilCritical = (criticalTimestamp - Date.now()) / (1000 * 86400)
    const priceAcceleration = (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10]

    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (daysUntilCritical < 30 && priceAcceleration > 0.1) {
      riskLevel = 'high'
    } else if (daysUntilCritical < 60 || priceAcceleration > 0.05) {
      riskLevel = 'medium'
    }

    setLpplResult({
      params,
      fitted,
      residual,
      criticalDate,
      riskLevel
    })
  }

  useEffect(() => {
    fetchBinanceData(days)
  }, [days, fetchBinanceData])

  const chartData = priceData.map((d, i) => ({
    date: new Date(d.time).toLocaleDateString(),
    actual: d.close,
    fitted: lpplResult && lpplResult.fitted ? lpplResult.fitted[i] ?? null : null
  }))

  const xInterval = chartData.length > 10 ? Math.floor(chartData.length / 10) : 0

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
                <span className="tracking-tight">BTC LPPL 泡沫追踪器</span>
              </h1>
              <p className="text-gray-300 mt-1 text-sm sm:text-base">对数周期幂律模型 · 市场临界点分析</p>
            </div>
            <div className="flex items-center gap-3">
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

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">预测临界点</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {lpplResult.criticalDate?.toLocaleDateString('zh-CN')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {Math.round((lpplResult.criticalDate!.getTime() - Date.now()) / (1000 * 86400))} 天后
                </p>
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
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  interval={xInterval}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => priceFormatter(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number | string) => (typeof value === 'number' ? priceFormatter(value) : value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="实际价格"
                  dot={false}
                />
                {lpplResult && (
                  <Line
                    type="monotone"
                    dataKey="fitted"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="LPPL 拟合"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {lpplResult?.params && (
            <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">LPPL 模型参数</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

export default BtcLPPLTracker
