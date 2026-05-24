import { AlertTriangle, Calendar, RefreshCw, Settings } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../lib/i18n'
import type { KlineData, LPPLResult } from '../lib/lppl'
import { fitLppl } from '../lib/lppl'
import { useURLState } from '../lib/use-url-state'
import PriceChart from './PriceChart'

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
  suggestedSymbols?: Array<{ label: string; value: string }>
}

const LPPLTrackerBase: React.FC<Props> = ({
  initialSymbol,
  placeholder,
  ariaLabel,
  validateSymbol,
  fetchSeries,
  priceFormatter,
  daysOptions,
  suggestedSymbols,
}) => {
  const { t, language } = useI18n()
  const msPerDay = 24 * 60 * 60 * 1000
  const defaultEndDate = useMemo(() => new Date(), [])
  const defaultStartDate = useMemo(
    () => new Date(Date.now() - (daysOptions[0] ?? 100) * msPerDay),
    [daysOptions],
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
  const [error, setError] = useState('')

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
      setError('')
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
        setError(err instanceof Error ? err.message : t('error.unknown'))
      } finally {
        setLoading(false)
      }
    },
    [fetchSeries, urlState.symbol, urlState.maxIter, urlState.restarts, urlState.tol, t],
  )

  const applyCustomSymbol = () => {
    const s = customSymbolInput.trim().toUpperCase()
    if (!validateSymbol(s)) {
      setError(t('error.invalid.input'))
      return
    }
    setError('')
    urlState.setSymbol(s)
  }

  useEffect(() => {
    if (urlState.useCustomRange) {
      const s = new Date(urlState.customStart)
      s.setHours(0, 0, 0, 0)
      const e = new Date(urlState.customEnd)
      e.setHours(23, 59, 59, 999)
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e.getTime() < s.getTime()) {
        setError(t('error.invalid.date.range'))
        return
      }
      fetchAndFit(undefined, s.getTime(), e.getTime())
    } else {
      fetchAndFit(urlState.days)
    }
  }, [
    urlState.days,
    fetchAndFit,
    urlState.useCustomRange,
    urlState.customStart,
    urlState.customEnd,
    t,
  ])

  const chartData = priceData.map((d, i) => ({
    date: new Date(d.time).toLocaleDateString(),
    actual: d.close as number,
    fitted: lpplResult && lpplResult.fitted ? (lpplResult.fitted[i] ?? null) : null,
    isCriticalPoint: false,
  }))

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-danger'
      case 'medium':
        return 'text-warning'
      default:
        return 'text-success'
    }
  }

  const getRiskBorderColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'border-l-danger'
      case 'medium':
        return 'border-l-warning'
      default:
        return 'border-l-success'
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
                <div className="relative group">
                  <input
                    aria-label={ariaLabel}
                    placeholder={placeholder}
                    value={customSymbolInput}
                    onChange={(e) => setCustomSymbolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCustomSymbol()
                    }}
                    onBlur={applyCustomSymbol}
                    className="w-32 h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all font-mono uppercase placeholder:text-muted"
                  />
                  {suggestedSymbols && suggestedSymbols.length > 0 && (
                    <div className="absolute top-12 left-0 z-50 w-[300px] bg-card border border-border-var rounded-lg shadow-xl p-3 hidden group-focus-within:block hover:block">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-medium text-muted">
                          {t('asset.suggestions')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {suggestedSymbols.map((item) => (
                          <button
                            key={item.value}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              urlState.setSymbol(item.value)
                            }}
                            className="px-2 py-1.5 text-xs rounded-md bg-panel hover:bg-accent/10 border border-border-var hover:border-accent transition-colors text-text text-left flex flex-col items-start overflow-hidden"
                            title={`${item.label} (${item.value})`}
                          >
                            <span className="font-semibold truncate w-full">{item.label}</span>
                            <span className="text-[10px] text-muted opacity-80 truncate w-full">
                              {item.value}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={urlState.useCustomRange}
                    onChange={(e) => urlState.setUseCustomRange(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <Calendar size={14} className="text-muted" />
                  <span className="hidden sm:inline">{t('time.custom')}</span>
                </label>

                {!urlState.useCustomRange && (
                  <select
                    value={urlState.days}
                    onChange={(e) => urlState.setDays(Number(e.target.value))}
                    className="h-10 px-3 text-sm rounded-lg focus:ring-2 focus:ring-accent"
                  >
                    {daysOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {t('time.last')} {opt} {t('time.days')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Right: Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => urlState.setShowAdvanced(!urlState.showAdvanced)}
                  className={`btn-secondary h-10 px-3 flex items-center gap-2 rounded-lg text-sm ${
                    urlState.showAdvanced ? 'ring-2 ring-accent/20' : ''
                  }`}
                  title={t('advanced.settings')}
                >
                  <Settings
                    size={16}
                    className={`transition-transform ${urlState.showAdvanced ? 'rotate-90' : ''}`}
                  />
                  <span className="hidden sm:inline">{t('advanced.settings')}</span>
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
                        setError(t('time.invalid.date'))
                        return
                      }
                      fetchAndFit(undefined, s.getTime(), e.getTime())
                    } else {
                      fetchAndFit(urlState.days)
                    }
                  }}
                  disabled={loading}
                  className="btn-primary h-10 px-3 flex items-center gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium hover:shadow-lg"
                  title={t('time.refresh')}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{t('time.refresh')}</span>
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
                    if (e.key === 'Enter') applyCustomStart()
                  }}
                  onBlur={applyCustomStart}
                  className="h-10 px-3 text-sm rounded-lg border-2 border-border-var bg-panel focus:border-accent focus:bg-card transition-all"
                />
                <span className="text-muted text-sm">{t('time.to')}</span>
                <input
                  type="date"
                  value={customEndInput}
                  onChange={(e) => setCustomEndInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyCustomEnd()
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
                  <h4 className="text-sm font-medium text-text">{t('advanced.model.config')}</h4>
                  <span className="text-xs text-muted">{t('advanced.apply.hint')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted mb-2">
                      {t('advanced.max.iterations')}
                    </label>
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={maxIterInput}
                      onChange={(e) => setMaxIterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
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
                      {t('advanced.restarts')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={restartsInput}
                      onChange={(e) => setRestartsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
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
                      {t('advanced.tolerance')}
                    </label>
                    <input
                      type="text"
                      value={tolInput}
                      onChange={(e) => setTolInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
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
                  lpplResult.riskLevel,
                )} border-l-4 rounded-xl p-4 sm:p-6 shadow-sm`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className={getRiskColor(lpplResult.riskLevel)} size={20} />
                  <h3 className="text-sm font-medium text-text">{t('risk.level')}</h3>
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-semibold ${getRiskColor(
                    lpplResult.riskLevel,
                  )}`}
                >
                  {lpplResult.riskLevel === 'high'
                    ? t('risk.high')
                    : lpplResult.riskLevel === 'medium'
                      ? t('risk.medium')
                      : t('risk.low')}
                </p>
                {lpplResult.riskReasons && lpplResult.riskReasons.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {lpplResult.riskReasons.map((r, idx) => (
                      <li key={idx} className="text-xs text-muted">
                        • {t(r)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Critical Date Card */}
              <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-sm font-medium text-text mb-3">{t('critical.point')}</h3>
                <p className="text-xl sm:text-2xl font-semibold text-info">
                  {lpplResult.criticalDate?.toLocaleDateString(
                    language === 'zh' ? 'zh-CN' : 'en-US',
                  )}
                </p>
                <p className="text-xs text-muted mt-2">
                  {(() => {
                    const daysFromNow = Math.round(
                      (lpplResult.criticalDate!.getTime() - Date.now()) / (1000 * 86400),
                    )
                    const absDays = Math.abs(daysFromNow)

                    if (daysFromNow > 0) {
                      return `${t('critical.about')} ${absDays} ${t('critical.days.after')}`
                    } else if (daysFromNow < 0) {
                      return `${t('critical.about')} ${absDays} ${t('critical.days.before')}`
                    } else {
                      return t('critical.today')
                    }
                  })()}
                </p>
                {lpplResult.predictedPrice && Number.isFinite(lpplResult.predictedPrice) && (
                  <div className="mt-3 pt-3 border-t border-border-var">
                    <p className="text-xs text-muted">{t('critical.price')}</p>
                    <p className="text-base font-semibold text-info mt-1">
                      {priceFormatter(lpplResult.predictedPrice)}
                    </p>
                  </div>
                )}
              </div>

              {/* Model Fit Card */}
              <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-sm font-medium text-text mb-3">{t('model.fit')}</h3>
                <p className="text-xl sm:text-2xl font-semibold text-accent">
                  {lpplResult.residual.toFixed(2)}
                </p>
                <p className="text-xs text-muted mt-2">{t('model.residual')}</p>
                <div className="mt-3 pt-3 border-t border-border-var">
                  <p className="text-xs text-muted">{t('model.status')}</p>
                  <p
                    className={`text-sm font-medium mt-1 ${
                      lpplResult.converged ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {lpplResult.converged ? t('model.converged') : t('model.not.converged')}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm relative">
              <h2 className="text-base sm:text-lg font-semibold text-text mb-4">
                {t('chart.price.fit')}
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
                    <span className="text-sm text-text">{t('time.refreshing')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Model Parameters */}
            <div className="bg-card border border-border-var rounded-xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-text mb-4">
                {t('params.model')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.baseline.log')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.A.toFixed(3) ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.baseline.price')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.A ? priceFormatter(Math.exp(lpplResult.params.A)) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.tc.label')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.tc.toFixed(2) ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.m.label')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.m.toFixed(3) ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.omega.label')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.omega.toFixed(3) ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.phi.label')}</p>
                  <p className="text-sm font-mono text-text">
                    {lpplResult.params?.phi.toFixed(3) ?? '-'}
                  </p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="mt-4 pt-4 border-t border-border-var grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.sse')}</p>
                  <p className="text-sm font-mono text-text">{(lpplResult.sse ?? 0).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.rmse')}</p>
                  <p className="text-sm font-mono text-text">{(lpplResult.rmse ?? 0).toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.iterations.label')}</p>
                  <p className="text-sm font-mono text-text">{lpplResult.iterations ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">{t('params.runtime')}</p>
                  <p className="text-sm font-mono text-text">{lpplResult.runTimeMs ?? 0} ms</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Disclaimer */}
        <div className="mt-6 p-3 bg-panel border border-border-var rounded-lg">
          <p className="text-xs text-muted">{t('footer.disclaimer')}</p>
        </div>
        {/* Subtle Loading Bar */}
        {loading && !lpplResult && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 bg-accent/20 overflow-hidden">
              <div
                className="h-full bg-accent animate-pulse"
                style={{ animation: 'loading-slide 1.5s ease-in-out infinite' }}
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
