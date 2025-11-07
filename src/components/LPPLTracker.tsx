import React, { useState, useEffect, useCallback } from "react"
import { TrendingUp, AlertTriangle, RefreshCw } from "lucide-react"
import PriceChart from "./PriceChart"
import { fitLppl } from "../lib/lppl"
import type { KlineData, LPPLResult } from "../lib/lppl"

const LPPLTracker: React.FC = () => {
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [priceData, setPriceData] = useState<KlineData[]>([])
  const [lpplResult, setLpplResult] = useState<LPPLResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [days, setDays] = useState(20)
  const [useCustomRange, setUseCustomRange] = useState(false)
  // advanced solver settings for LPPL fitting
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [maxIterSetting, setMaxIterSetting] = useState(1000)
  const [restartsSetting, setRestartsSetting] = useState(6)
  const [tolSetting, setTolSetting] = useState(1e-9)
  // date input values in YYYY-MM-DD format
  const msPerDay = 24 * 60 * 60 * 1000
  const defaultEndDate = new Date()
  const defaultStartDate = new Date(Date.now() - days * msPerDay)
  const [customStart, setCustomStart] = useState(
    defaultStartDate.toISOString().slice(0, 10)
  )
  const [customEnd, setCustomEnd] = useState(
    defaultEndDate.toISOString().slice(0, 10)
  )
  const [customSymbolInput, setCustomSymbolInput] = useState(symbol)
  // theme handled elsewhere; no local usage here

  const fetchBinanceData = useCallback(
    async (daysArg?: number, startTimeArg?: number, endTimeArg?: number) => {
      setLoading(true)
      setError("")

      try {
        let endTime: number
        let startTime: number
        let interval: string

        if (
          typeof startTimeArg === "number" &&
          typeof endTimeArg === "number"
        ) {
          startTime = startTimeArg
          endTime = endTimeArg
          const rangeDays = Math.max(
            1,
            Math.round((endTime - startTime) / msPerDay)
          )
          interval = rangeDays > 90 ? "1d" : "4h"
        } else {
          endTime = Date.now()
          const useDays = typeof daysArg === "number" ? daysArg : days
          startTime = endTime - useDays * msPerDay
          interval = useDays > 90 ? "1d" : "4h"
        }
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
        const res = fitLppl(klines, {
          maxIter: maxIterSetting,
          restarts: restartsSetting,
          tol: tolSetting,
        })
        setLpplResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误")
      } finally {
        setLoading(false)
      }
    },
    [symbol, days, msPerDay, maxIterSetting, restartsSetting, tolSetting]
  )

  // Theme is handled globally by ThemeProvider (useTheme)

  useEffect(() => {
    // keep manual symbol input in sync when symbol changes externally
    setCustomSymbolInput(symbol)
  }, [symbol])

  const applyCustomSymbol = () => {
    const s = customSymbolInput.trim().toUpperCase()
    if (!s) {
      setError("交易对不能为空")
      return
    }
    setError("")
    setSymbol(s)
  }
  useEffect(() => {
    if (useCustomRange) {
      // parse custom dates and fetch range
      const s = new Date(customStart)
      s.setHours(0, 0, 0, 0)
      const e = new Date(customEnd)
      e.setHours(23, 59, 59, 999)
      if (
        Number.isNaN(s.getTime()) ||
        Number.isNaN(e.getTime()) ||
        e.getTime() < s.getTime()
      ) {
        setError("自定义日期无效：结束时间必须晚于或等于起始时间")
        return
      }
      fetchBinanceData(undefined, s.getTime(), e.getTime())
    } else {
      fetchBinanceData(days)
    }
  }, [days, symbol, fetchBinanceData, useCustomRange, customStart, customEnd])

  const chartData = priceData.map((d, i) => ({
    date: new Date(d.time).toLocaleDateString(),
    actual: d.close,
    fitted:
      lpplResult && lpplResult.fitted ? lpplResult.fitted[i] ?? null : null,
  }))

  const priceFormatter = (value: number) => {
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

  // Return color classes that work for both light and dark modes (dark follows system)
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

  const getRiskBg = (level: string) => {
    // Use panel background and add a colored left accent border that looks good in dark mode
    switch (level) {
      case "high":
        return "bg-panel border border-border-var border-l-4 border-l-danger"
      case "medium":
        return "bg-panel border border-border-var border-l-4 border-l-warning"
      default:
        return "bg-panel border border-border-var border-l-4 border-l-success"
    }
  }

  return (
    <div className="min-h-screen app-root p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card text-text border border-border-var rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold heading flex items-center gap-3 leading-tight">
                <TrendingUp className="text-warning" size={36} />
                <span className="tracking-tight">LPPL 泡沫追踪器</span>
              </h1>
              <p className="text-muted mt-1 text-sm sm:text-base">
                对数周期幂律模型 · 市场临界点分析
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full items-center">
              {/* Left: asset selector + manual input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* <div className="w-full sm:w-auto">
                  <AssetSelector symbol={symbol} setSymbol={setSymbol} />
                </div> */}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    aria-label="手动输入交易对"
                    placeholder="例如 BTCUSDT"
                    value={customSymbolInput}
                    onChange={(e) => setCustomSymbolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyCustomSymbol()
                    }}
                    className="bg-card text-text border border-border-var px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                  <button
                    onClick={applyCustomSymbol}
                    className="px-3 py-2 bg-panel border border-border-var rounded-md text-sm hover:bg-gray-100"
                    type="button"
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* Right: range controls + refresh */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useCustomRange}
                        onChange={(e) => setUseCustomRange(e.target.checked)}
                        className="form-checkbox"
                      />
                      <span className="text-sm">自定义时间</span>
                    </label>
                    {useCustomRange && (
                      <div className="flex items-center gap-2">
                        <input
                          id="custom-start"
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="bg-card text-text border border-border-var px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                        />
                        <span className="text-sm">—</span>
                        <input
                          id="custom-end"
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="bg-card text-text border border-border-var px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="sr-only" htmlFor="range-select">
                    选择区间
                  </label>
                  <select
                    id="range-select"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    disabled={useCustomRange}
                    className="bg-card text-text border border-border-var px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm disabled:opacity-50"
                  >
                    <option value={20}>20 天</option>
                    <option value={50}>50 天</option>
                    <option value={100}>100 天</option>
                    <option value={200}>200 天</option>
                    <option value={365}>365 天</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // refresh using the active mode
                      if (useCustomRange) {
                        const s = new Date(customStart)
                        s.setHours(0, 0, 0, 0)
                        const e = new Date(customEnd)
                        e.setHours(23, 59, 59, 999)
                        if (
                          Number.isNaN(s.getTime()) ||
                          Number.isNaN(e.getTime()) ||
                          e.getTime() < s.getTime()
                        ) {
                          setError(
                            "自定义日期无效：结束时间必须晚于或等于起始时间"
                          )
                          return
                        }
                        fetchBinanceData(undefined, s.getTime(), e.getTime())
                      } else {
                        fetchBinanceData(days)
                      }
                    }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-accent to-accent-2 hover:from-accent-2 hover:to-accent text-white px-4 py-2 rounded-md shadow-sm transition disabled:opacity-50 justify-center"
                  >
                    <RefreshCw
                      size={18}
                      className={loading ? "animate-spin" : ""}
                    />
                    <span className="text-sm">刷新</span>
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((s) => !s)}
                    className="px-3 py-2 bg-panel border border-border-var rounded-md text-sm hover:bg-gray-100"
                  >
                    高级设置
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showAdvanced && (
            <div className="mt-3 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted">最大迭代 (maxIter)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={maxIterSetting}
                  onChange={(e) => setMaxIterSetting(Number(e.target.value))}
                  className="w-full bg-card text-text border border-border-var px-2 py-2 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted">
                  重启次数 (restarts)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={restartsSetting}
                  onChange={(e) => setRestartsSetting(Number(e.target.value))}
                  className="w-full bg-card text-text border border-border-var px-2 py-2 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted">收敛容限 (tol)</label>
                <input
                  type="text"
                  value={String(tolSetting)}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isNaN(v) && v > 0) setTolSetting(v)
                  }}
                  className="w-full bg-card text-text border border-border-var px-2 py-2 rounded-md text-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-panel text-text border border-border-var px-4 py-3 rounded-lg mb-6 text-danger">
              {error}
            </div>
          )}

          {lpplResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div
                className={`${getRiskBg(lpplResult.riskLevel)} rounded-xl p-6`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle
                    className={`${getRiskColor(lpplResult.riskLevel)}`}
                    size={24}
                  />
                  <h3 className="text-lg font-semibold heading">风险等级</h3>
                </div>
                <p
                  className={`text-3xl font-bold ${getRiskColor(
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
                    <ul className="mt-3 text-sm text-muted list-disc list-inside">
                      {lpplResult.riskReasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
              </div>
              {/* fitting diagnostics moved to bottom */}

              <div className="bg-panel border border-border-var rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text mb-2">
                  预测临界点
                </h3>
                <p className="text-2xl font-bold text-info">
                  {lpplResult.criticalDate?.toLocaleDateString("zh-CN")}
                </p>
                <p className="text-sm text-muted mt-1">
                  {Math.round(
                    (lpplResult.criticalDate!.getTime() -
                      new Date(customEnd).getTime()) /
                      (1000 * 86400)
                  )}{" "}
                  天后
                </p>
                {lpplResult.predictedPrice &&
                  Number.isFinite(lpplResult.predictedPrice) && (
                    <p className="text-sm text-muted mt-3">
                      预测临界价:{" "}
                      <span className="text-info font-semibold">
                        {priceFormatter(lpplResult.predictedPrice)}
                      </span>
                    </p>
                  )}
              </div>

              <div className="bg-panel border border-border-var rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text mb-2">
                  模型拟合度
                </h3>
                <p className="text-2xl font-bold text-accent">
                  {lpplResult.residual.toFixed(2)}
                </p>
                <p className="text-sm text-muted mt-1">残差 (越小越好)</p>
              </div>
            </div>
          )}

          <div className="bg-card text-text p-6 shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-4 text-text">
              价格与 LPPL 拟合曲线
            </h2>
            <PriceChart data={chartData} priceFormatter={priceFormatter} />
          </div>

          {lpplResult?.params && (
            <div className="mt-8 bg-panel p-6 rounded-xl">
              <h2 className="text-2xl font-bold mb-4 text-text">
                LPPL 模型参数
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted text-sm">基线 A (log)</p>
                  <p className="text-text font-mono">
                    {lpplResult.params.A.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">基线 A (price)</p>
                  <p className="text-text font-mono">
                    {priceFormatter(Math.exp(lpplResult.params.A))}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">临界时间 (tc)</p>
                  <p className="text-text font-mono">
                    {lpplResult.params.tc.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">幂律指数 (m)</p>
                  <p className="text-text font-mono">
                    {lpplResult.params.m.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">角频率 (ω)</p>
                  <p className="text-text font-mono">
                    {lpplResult.params.omega.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-sm">相位 (φ)</p>
                  <p className="text-text font-mono">
                    {lpplResult.params.phi.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* bottom-area: fitting diagnostics (less prominent) */}
          {lpplResult && (
            <div className="mt-6 bg-panel p-3 rounded-lg text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex gap-4">
                  <div>
                    <p className="text-muted text-xs">SSE (log-space)</p>
                    <p className="text-text font-mono">
                      {(lpplResult.sse ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">RMSE (log-space)</p>
                    <p className="text-text font-mono">
                      {(lpplResult.rmse ?? 0).toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">迭代次数</p>
                    <p className="text-text font-mono">
                      {lpplResult.iterations ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">耗时</p>
                    <p className="text-text font-mono">
                      {lpplResult.runTimeMs ?? 0} ms
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted text-xs">拟合状态</p>
                  <p
                    className={`font-mono ${
                      lpplResult.converged ? "text-success" : "text-warning"
                    }`}
                  >
                    {lpplResult.converged ? "已收敛" : "未收敛 / 达到最大迭代"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-muted">
            <p>
              ⚠️ 免责声明：LPPL
              模型仅供参考，不构成投资建议。市场预测具有不确定性，请谨慎决策。
            </p>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40">
              <div className="bg-card text-text backdrop-blur-md rounded-lg p-4 flex items-center gap-3 border border-border-var">
                <RefreshCw size={20} className="animate-spin text-text" />
                <span className="text-text">正在加载数据…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LPPLTracker
