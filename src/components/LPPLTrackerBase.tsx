import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, RefreshCw, Settings, Calendar } from "lucide-react"
import PriceChart from "./PriceChart"
import { fitLppl } from "../lib/lppl"
import type { KlineData, LPPLResult } from "../lib/lppl"
import { useURLState } from "../lib/use-url-state"

type FetchArgs = {
  days?: number
  start?: number
  end?: number
  symbol: string
}

type Props = {
  initialSymbol: string
  placeholder: string
  ariaLabel: string
  validateSymbol: (s: string) => boolean
  fetchSeries: (args: FetchArgs) => Promise<KlineData[]>
  priceFormatter: (v: number) => string
  daysOptions: number[]
}

const LPPLTrackerBase: React.FC<Props> = ({
  initialSymbol,
  placeholder,
  ariaLabel,
  validateSymbol,
  fetchSeries,
  priceFormatter,
  daysOptions,
}) => {
  const msPerDay = 24 * 60 * 60 * 1000
  const defaultEndDate = useMemo(() => new Date(), [])
  const defaultStartDate = useMemo(
    () => new Date(Date.now() - (daysOptions[0] ?? 100) * msPerDay),
    [daysOptions, msPerDay]
  )

  // URL-synced state
  const urlState = useURLState({
    symbol: initialSymbol,
    days: daysOptions[0] ?? 100,
    useCustomRange: false,
    customStart: defaultStartDate.toISOString().slice(0, 10),
    customEnd: defaultEndDate.toISOString().slice(0, 10),
    maxIter: 1000,
    restarts: 6,
    tol: 1e-9,
    showAdvanced: false,
  })

  // Local state (not synced to URL)
  const [priceData, setPriceData] = useState<KlineData[]>([])
  const [lpplResult, setLpplResult] = useState<LPPLResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Temporary input values for form fields
  const [maxIterInput, setMaxIterInput] = useState(String(urlState.maxIter))
  const [restartsInput, setRestartsInput] = useState(String(urlState.restarts))
  const [tolInput, setTolInput] = useState(String(urlState.tol))
  const [customSymbolInput, setCustomSymbolInput] = useState(urlState.symbol)
  const [customStartInput, setCustomStartInput] = useState(urlState.customStart)
  const [customEndInput, setCustomEndInput] = useState(urlState.customEnd)

  // Sync input values when URL state changes
  useEffect(() => {
    setMaxIterInput(String(urlState.maxIter))
  }, [urlState.maxIter])

  useEffect(() => {
    setRestartsInput(String(urlState.restarts))
  }, [urlState.restarts])

  useEffect(() => {
    setTolInput(String(urlState.tol))
  }, [urlState.tol])

  useEffect(() => {
    setCustomStartInput(urlState.customStart)
  }, [urlState.customStart])

  useEffect(() => {
    setCustomEndInput(urlState.customEnd)
  }, [urlState.customEnd])

  useEffect(() => {
    setCustomSymbolInput(urlState.symbol)
  }, [urlState.symbol])

  // Apply advanced settings
  const applyMaxIter = () => {
    const val = Number(maxIterInput)
    if (!Number.isNaN(val) && val >= 10) {
      urlState.setMaxIter(val)
    } else {
      setMaxIterInput(String(urlState.maxIter))
    }
  }

  const applyRestarts = () => {
    const val = Number(restartsInput)
    if (!Number.isNaN(val) && val >= 1) {
      urlState.setRestarts(val)
    } else {
      setRestartsInput(String(urlState.restarts))
    }
  }

  const applyTol = () => {
    const val = Number(tolInput)
    if (!Number.isNaN(val) && val > 0) {
      urlState.setTol(val)
    } else {
      setTolInput(String(urlState.tol))
    }
  }

  // Apply custom date range
  const applyCustomStart = () => {
    const val = customStartInput.trim()
    if (val) {
      urlState.setCustomStart(val)
    } else {
      setCustomStartInput(urlState.customStart)
    }
  }

  const applyCustomEnd = () => {
    const val = customEndInput.trim()
    if (val) {
      urlState.setCustomEnd(val)
    } else {
      setCustomEndInput(urlState.customEnd)
    }
  }

  const fetchAndFit = useCallback(
    async (daysArg?: number, startArg?: number, endArg?: number) => {
      setLoading(true)
      setError("")
      try {
        const series = await fetchSeries({
          symbol: urlState.symbol,
          days: daysArg,
          start: startArg,
          end: endArg,
        })
        setPriceData(series)
        const res = fitLppl(series, {
          maxIter: urlState.maxIter,
          restarts: urlState.restarts,
          tol: urlState.tol,
        })
        setLpplResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误")
      } finally {
        setLoading(false)
      }
    },
    [
      fetchSeries,
      urlState.symbol,
      urlState.maxIter,
      urlState.restarts,
      urlState.tol,
    ]
  )

  const applyCustomSymbol = () => {
    const s = customSymbolInput.trim().toUpperCase()
    if (!validateSymbol(s)) {
      setError("请输入有效标的代码")
      return
    }
    setError("")
    urlState.setSymbol(s)
  }

  useEffect(() => {
    if (urlState.useCustomRange) {
      const s = new Date(urlState.customStart)
      s.setHours(0, 0, 0, 0)
      const e = new Date(urlState.customEnd)
      e.setHours(23, 59, 59, 999)
      if (
        Number.isNaN(s.getTime()) ||
        Number.isNaN(e.getTime()) ||
        e.getTime() < s.getTime()
      ) {
        setError("自定义日期无效：结束时间必须晚于或等于起始时间")
        return
      }
      fetchAndFit(undefined, s.getTime(), e.getTime())
    } else {
      fetchAndFit(urlState.days)
    }
  }, [
    urlState.days,
    urlState.symbol,
    fetchAndFit,
    urlState.useCustomRange,
    urlState.customStart,
    urlState.customEnd,
  ])

  const chartData = priceData.map((d, i) => ({
    date: new Date(d.time).toLocaleDateString(),
    actual: d.close as number,
    fitted:
      lpplResult && lpplResult.fitted ? lpplResult.fitted[i] ?? null : null,
    isCriticalPoint: false,
  }))

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-danger"
      case "medium":
        return "text-warning"
      default:
        return "text-success"
    }
  }

  const getRiskBorderColor = (level: string) => {
    switch (level) {
      case "high":
        return "border-l-danger"
      case "medium":
        return "border-l-warning"
      default:
        return "border-l-success"
    }
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Control Panel */}
        <div className="bg-card border border-border-var rounded-xl shadow-sm mb-4 sm:mb-6">
          {/* Control Panel */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Left: Symbol + Time Range */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  aria-label={ariaLabel}
                  placeholder={placeholder}
                  value={customSymbolInput}
                  onChange={(e) => setCustomSymbolInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCustomSymbol()
                  }}
                  onBlur={applyCustomSymbol}
                  className="w-32 h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all font-mono uppercase placeholder:text-muted"
                />

                <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={urlState.useCustomRange}
                    onChange={(e) =>
                      urlState.setUseCustomRange(e.target.checked)
                    }
                    className="w-4 h-4 rounded"
                  />
                  <Calendar size={14} className="text-muted" />
                  <span className="hidden sm:inline">自定义时间</span>
                </label>

                {!urlState.useCustomRange && (
                  <select
                    value={urlState.days}
                    onChange={(e) => urlState.setDays(Number(e.target.value))}
                    className="h-10 px-3 text-sm rounded-lg focus:ring-2 focus:ring-accent"
                  >
                    {daysOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        最近 {opt} 天
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    urlState.setShowAdvanced(!urlState.showAdvanced)
                  }
                  className={`btn-secondary h-10 px-3 flex items-center gap-2 rounded-lg text-sm ${
                    urlState.showAdvanced ? "ring-2 ring-accent/20" : ""
                  }`}
                  title="高级设置"
                >
                  <Settings
                    size={16}
                    className={`transition-transform ${
                      urlState.showAdvanced ? "rotate-90" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">高级</span>
                </button>
                <button
                  onClick={() => {
                    if (urlState.useCustomRange) {
                      const s = new Date(urlState.customStart)
                      s.setHours(0, 0, 0, 0)
                      const e = new Date(urlState.customEnd)
                      e.setHours(23, 59, 59, 999)
                      if (
                        Number.isNaN(s.getTime()) ||
                        Number.isNaN(e.getTime()) ||
                        e.getTime() < s.getTime()
                      ) {
                        setError("自定义日期无效")
                        return
                      }
                      fetchAndFit(undefined, s.getTime(), e.getTime())
                    } else {
                      fetchAndFit(urlState.days)
                    }
                  }}
                  disabled={loading}
                  className="btn-primary h-10 px-3 flex items-center gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium hover:shadow-lg"
                  title="刷新数据"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  <span className="hidden sm:inline">刷新</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            {urlState.useCustomRange && (
              <div className="flex flex-wrap items-center gap-2 mt-3 animate-in slide-in-from-top duration-200">
                <input
                  type="date"
                  value={customStartInput}
                  onChange={(e) => setCustomStartInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCustomStart()
                  }}
                  onBlur={applyCustomStart}
                  className="h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all"
                />
                <span className="text-muted text-sm">至</span>
                <input
                  type="date"
                  value={customEndInput}
                  onChange={(e) => setCustomEndInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCustomEnd()
                  }}
                  onBlur={applyCustomEnd}
                  className="h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all"
                />
              </div>
            )}

            {/* Advanced Settings */}
            {urlState.showAdvanced && (
              <div className="mt-4 pt-4 border-t border-border-var animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-text">
                    模型参数配置
                  </h4>
                  <span className="text-xs text-muted">按回车或失焦后生效</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted mb-2">
                      最大迭代次数
                    </label>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={maxIterInput}
                      onChange={(e) => setMaxIterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          applyMaxIter()
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={applyMaxIter}
                      className="w-full h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all"
                      placeholder="≥10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-2">
                      重启次数
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={restartsInput}
                      onChange={(e) => setRestartsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          applyRestarts()
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={applyRestarts}
                      className="w-full h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all"
                      placeholder="≥1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-2">
                      收敛容限
                    </label>
                    <input
                      type="text"
                      value={tolInput}
                      onChange={(e) => setTolInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          applyTol()
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={applyTol}
                      className="w-full h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all font-mono"
                      placeholder=">0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 sm:px-6 pb-4 animate-in slide-in-from-top duration-200">
              <div className="p-3 bg-danger/10 border-l-4 border-l-danger rounded-lg">
                <p className="text-sm text-danger">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {lpplResult && (
          <div className="animate-in fade-in duration-300">
            {/* Risk Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 sm:mb-6">
              {/* Risk Level Card */}
              <div
                className={`bg-card border border-border-var ${getRiskBorderColor(
                  lpplResult.riskLevel
                )} border-l-4 rounded-xl p-4 sm:p-6 shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle
                    className={getRiskColor(lpplResult.riskLevel)}
                    size={20}
                  />
                  <h3 className="text-sm font-medium text-text">风险等级</h3>
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-semibold ${getRiskColor(
                    lpplResult.riskLevel
                  )}`}
                >
                  {lpplResult.riskLevel === "high"
                    ? "高风险"
                    : lpplResult.riskLevel === "medium"
                    ? "中等风险"
                    : "低风险"}
                </p>
                {lpplResult.riskReasons &&
                  lpplResult.riskReasons.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {lpplResult.riskReasons.map((r, idx) => (
                        <li key={idx} className="text-xs text-muted">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              {/* Critical Date Card */}
              <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-sm font-medium text-text mb-3">
                  预测临界点
                </h3>
                <p className="text-xl sm:text-2xl font-semibold text-info">
                  {lpplResult.criticalDate?.toLocaleDateString("zh-CN")}
                </p>
                <p className="text-xs text-muted mt-2">
                  {(() => {
                    const daysFromNow = Math.round(
                      (lpplResult.criticalDate!.getTime() - Date.now()) /
                        (1000 * 86400)
                    )
                    const absDays = Math.abs(daysFromNow)

                    if (daysFromNow > 0) {
                      return `约 ${absDays} 天后`
                    } else if (daysFromNow < 0) {
                      return `约 ${absDays} 天前`
                    } else {
                      return "今天"
                    }
                  })()}
                </p>
                {lpplResult.predictedPrice &&
                  Number.isFinite(lpplResult.predictedPrice) && (
                    <div className="mt-3 pt-3 border-t border-border-var">
                      <p className="text-xs text-muted">预测临界价格</p>
                      <p className="text-base font-semibold text-info mt-1">
                        {priceFormatter(lpplResult.predictedPrice)}
                      </p>
                    </div>
                  )}
              </div>

              {/* Model Fit Card */}
              <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-sm font-medium text-text mb-3">
                  模型拟合度
                </h3>
                <p className="text-xl sm:text-2xl font-semibold text-accent">
                  {lpplResult.residual.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-2">残差（越小越好）</p>
                <div className="mt-3 pt-3 border-t border-border-var">
                  <p className="text-xs text-muted">拟合状态</p>
                  <p
                    className={`text-sm font-medium mt-1 ${
                      lpplResult.converged ? "text-success" : "text-warning"
                    }`}
                  >
                    {lpplResult.converged ? "✓ 已收敛" : "⚠ 未完全收敛"}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm relative">
              <h2 className="text-base sm:text-lg font-semibold text-text mb-4">
                价格与 LPPL 拟合曲线
              </h2>
              <PriceChart
                data={chartData}
                priceFormatter={priceFormatter}
                criticalDate={lpplResult.criticalDate}
                predictedPrice={lpplResult.predictedPrice}
              />
              {loading && (
                <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={18} className="animate-spin text-accent" />
                    <span className="text-sm text-text">更新中...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Model Parameters */}
            <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-text mb-4">
                LPPL 模型参数
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">基线 A (log)</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.A.toFixed(3) ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">基线 A (price)</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.A
                      ? priceFormatter(Math.exp(lpplResult.params.A))
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">临界时间 tc</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.tc.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">幂律指数 m</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.m.toFixed(3) ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">角频率 ω</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.omega.toFixed(3) ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">相位 φ</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.phi.toFixed(3) ?? "-"}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="mt-4 pt-4 border-t border-border-var grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">SSE</p>
                  <p className="text-sm font-mono text-text">
                    {(lpplResult.sse ?? 0).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">RMSE</p>
                  <p className="text-sm font-mono text-text">
                    {(lpplResult.rmse ?? 0).toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">迭代次数</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.iterations ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">计算耗时</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.runTimeMs ?? 0} ms
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 p-3 bg-panel border border-border-var rounded-lg">
          <p className="text-xs text-muted">
            ⚠️ 免责声明：LPPL 模型仅供参考，不构成投资建议。
          </p>
        </div>

        {/* Subtle Loading Bar */}
        {loading && !lpplResult && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-accent/20 overflow-hidden">
              <div
                className="h-full bg-accent animate-pulse"
                style={{ animation: "loading-slide 1.5s ease-in-out infinite" }}
              />
            </div>
            <style>{`
              @keyframes loading-slide {
                0% { width: 0%; margin-left: 0%; }
                50% { width: 50%; margin-left: 25%; }
                100% { width: 0%; margin-left: 100%; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  )
}

export default LPPLTrackerBase
