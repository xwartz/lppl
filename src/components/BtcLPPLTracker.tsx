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
  // diagnostics
  sse?: number
  rmse?: number
  iterations?: number
  converged?: boolean
  runTimeMs?: number
  // predicted price at critical time (price-space)
  predictedPrice?: number
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
    try {
      if (data.length < 50) {
        setError('数据点不足，需要至少50个数据点')
        return
      }

      // 归一化时间和价格（times 单位：秒）
      const times = data.map(d => d.time / 1000)
      const prices = data.map(d => d.close)
      const t0 = times[0]
      const normalizedTimes = times.map(t => (t - t0) / 86400) // 转换为天数

      // 初始参数估计（更稳健的初值并做范围保护）
  const maxPrice = Math.max(...prices)
      const lastPrice = prices[prices.length - 1]
      const lastTime = normalizedTimes[normalizedTimes.length - 1]

  // We'll fit LPPL to log-prices using a simple Nelder-Mead optimizer (gradient-free).
      const logPrices = prices.map(p => Math.log(p))

  // keep heuristic initial params - used to build initial guess
  const initHeuristicA = Number.isFinite(maxPrice * 1.1) ? Math.log(maxPrice * 1.1) : Math.log(Math.max(1, lastPrice * 1.05))
  const initHeuristicB = -0.01
  const initHeuristicC = 0.005

    const model = (theta: number[], t: number) => {
        // theta: [A, B, C, tc, m, omega, phi]
        const [A, B, C, tc, m, omega, phi] = theta
        const dt = tc - t
        if (!Number.isFinite(dt) || dt <= 0) return A
        const dtSafe = Math.max(dt, 1e-8)
        const pow = Math.pow(dtSafe, m)
        const val = A + B * pow + C * pow * Math.cos(omega * Math.log(dtSafe) + phi)
        return Number.isFinite(val) ? val : A
      }

      const sse = (theta: number[]) => {
        // bounds/penalty: enforce reasonable ranges
        const [A, B, C, tc, m, omega, phi] = theta
        if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C) || !Number.isFinite(tc) || !Number.isFinite(m) || !Number.isFinite(omega) || !Number.isFinite(phi)) return 1e30
        if (m <= 0 || m >= 2) return 1e25
        if (tc <= lastTime + 0.5) return 1e25
        if (omega <= 0 || omega > 50) return 1e25

        let sum = 0
        for (let i = 0; i < normalizedTimes.length; i++) {
          const t = normalizedTimes[i]
          const y = logPrices[i]
          if (!Number.isFinite(y)) continue
          const yhat = model(theta, t)
          if (!Number.isFinite(yhat)) return 1e26
          const diff = y - yhat
          sum += diff * diff
        }
        return sum
      }

  // Initial guess from heuristic (use log-space for A)
  const initTc = lastTime + 30
  const initM = 0.5
  const initOmega = 6.0
  const initPhi = 0.0

  const x0 = [initHeuristicA, initHeuristicB, initHeuristicC, initTc, initM, initOmega, initPhi]

      // Simple Nelder-Mead implementation
      const nelderMead = (f: (x: number[]) => number, xStart: number[], opts?: { maxIter?: number, tol?: number }) => {
        const n = xStart.length
        const maxIter = opts?.maxIter ?? 300
        const tol = opts?.tol ?? 1e-6
        const alpha = 1
        const gamma = 2
        const rho = 0.5
        const sigma = 0.5

        // build initial simplex
        const simplex: number[][] = [xStart.slice()]
        for (let i = 0; i < n; i++) {
          const xi = xStart.slice()
          xi[i] = xi[i] !== 0 ? xi[i] * (1 + 0.05) : 0.00025
          simplex.push(xi)
        }

        const values = simplex.map(p => f(p))

  let iter = 0
  let converged = false
  for (; iter < maxIter; iter++) {
          // sort simplex by f
          const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v).map(o => o.i)
          const s = idx.map(i => simplex[i])
          const fv = idx.map(i => values[i])

          const best = s[0]
          const worst = s[n]
          const fBest = fv[0]
          const fWorst = fv[n]

          // centroid of all but worst
          const centroid = new Array(n).fill(0)
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) centroid[j] += s[i][j]
          }
          for (let j = 0; j < n; j++) centroid[j] /= n

          // reflection
          const xr = centroid.map((c, j) => c + alpha * (c - worst[j]))
          const fr = f(xr)

          if (fr < fBest) {
            // expansion
            const xe = centroid.map((c, j) => c + gamma * (xr[j] - c))
            const fe = f(xe)
            if (fe < fr) {
              s[n] = xe
              fv[n] = fe
            } else {
              s[n] = xr
              fv[n] = fr
            }
          } else if (fr < fv[n - 1]) {
            s[n] = xr
            fv[n] = fr
          } else {
            // contraction
            const xc = centroid.map((c, j) => c + rho * (worst[j] - c))
            const fc = f(xc)
            if (fc < fWorst) {
              s[n] = xc
              fv[n] = fc
            } else {
              // reduction
              for (let i = 1; i < s.length; i++) {
                for (let j = 0; j < n; j++) {
                  s[i][j] = best[j] + sigma * (s[i][j] - best[j])
                }
                fv[i] = f(s[i])
              }
            }
          }

          // rebuild simplex and values from s, fv
          for (let k = 0; k < s.length; k++) {
            simplex[k] = s[k]
            values[k] = fv[k]
          }

          // check convergence (std dev of fv)
          const mean = values.reduce((a, b) => a + b, 0) / values.length
          const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length)
          if (sd < tol) { converged = true; break }
        }

        // return best
        let bestIndex = 0
        let bestVal = values[0]
        for (let i = 1; i < values.length; i++) {
          if (values[i] < bestVal) {
            bestVal = values[i]
            bestIndex = i
          }
        }
        return { solution: simplex[bestIndex], value: bestVal, iterations: iter + 1, converged }
      }

  // run optimizer and record diagnostics
  const tStart = Date.now()
  const result = nelderMead(sse, x0, { maxIter: 400, tol: 1e-8 })
  const tEnd = Date.now()
  const opt = result.solution
  const iterations = result.iterations ?? 0
  const converged = result.converged ?? false
  const runTimeMs = tEnd - tStart

      const optParams: LPPLParams = {
        A: opt[0],
        B: opt[1],
        C: opt[2],
        tc: opt[3],
        m: opt[4],
        omega: opt[5],
        phi: opt[6]
      }

  // fitted values in log-space, convert to price-space for plotting
  const fittedLog = normalizedTimes.map(t => model(opt, t))
  const fitted = fittedLog.map(v => Number.isFinite(v) ? Math.exp(v) : NaN)

  // compute residual on log-prices (use fittedLog)
  const paired = logPrices.map((p, i) => ({ p, f: fittedLog[i] })).filter(x => Number.isFinite(x.p) && Number.isFinite(x.f))
  const residuals = paired.map(pair => Math.pow(pair.p - pair.f, 2))
  const sseVal = result.value ?? residuals.reduce((a, b) => a + b, 0)
  const rmse = Math.sqrt(sseVal / Math.max(1, residuals.length))
  const residual = rmse

      const criticalTimestamp = (optParams.tc * 86400 + t0) * 1000
      const criticalDate = new Date(Number.isFinite(criticalTimestamp) ? criticalTimestamp : Date.now())

      // price acceleration use original prices
      const lookback = Math.min(10, prices.length - 1)
      const prevIndex = Math.max(0, prices.length - 1 - lookback)
      const prevPrice = prices[prevIndex]
      const denom = prevPrice && prevPrice > 0 ? prevPrice : null
      const priceAcceleration = denom ? (lastPrice - prevPrice) / prevPrice : 0

      const daysUntilCritical = Number.isFinite(criticalTimestamp) ? (criticalTimestamp - Date.now()) / (1000 * 86400) : Infinity

      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (!Number.isFinite(residual) || residual > Math.max(1e-3, Math.abs(lastPrice) * 0.5)) {
        setError('模型拟合不可靠（残差过大）')
        riskLevel = 'low'
      } else {
        if (daysUntilCritical < 30 && priceAcceleration > 0.1) {
          riskLevel = 'high'
        } else if (daysUntilCritical < 60 || priceAcceleration > 0.05) {
          riskLevel = 'medium'
        }
      }

  const predictedPrice = Number.isFinite(optParams.A) ? Math.exp(optParams.A) : NaN
  setLpplResult({ params: optParams, fitted, residual, criticalDate, riskLevel, sse: sseVal, rmse, iterations, converged, runTimeMs, predictedPrice })
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算 LPPL 时发生错误')
    }
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

export default BtcLPPLTracker
